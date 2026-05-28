const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  try {
    const logsQ = await db.query(
      `SELECT dl.*, 
         COALESCE(json_agg(lt.*) FILTER (WHERE lt.id IS NOT NULL), '[]') AS tags
       FROM daily_logs dl
       LEFT JOIN log_tags lt ON lt.user_id=dl.user_id AND lt.log_date=dl.log_date
       WHERE dl.user_id=$1
         AND ($2::date IS NULL OR dl.log_date >= $2::date)
         AND ($3::date IS NULL OR dl.log_date <= $3::date)
       GROUP BY dl.id
       ORDER BY dl.log_date DESC`,
      [req.user.id, from || null, to || null]
    );
    res.json(logsQ.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/logs/tags/definitions  — return tag master list
router.get('/tags/definitions', async (_req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM tag_definitions ORDER BY category, tag'
    );
    // Group by category
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.category]) acc[row.category] = [];
      acc[row.category].push(row);
      return acc;
    }, {});
    res.json(grouped);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/logs  — upsert a daily log + tags
router.post('/', async (req, res) => {
  const { log_date, flow_level, tags = [] } = req.body;
  if (!log_date) return res.status(400).json({ error: 'log_date required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert daily log
    const logResult = await client.query(
      `INSERT INTO daily_logs (user_id, log_date, flow_level)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, log_date) DO UPDATE
         SET flow_level = EXCLUDED.flow_level, updated_at = NOW()
       RETURNING *`,
      [req.user.id, log_date, flow_level || null]
    );

    // Replace tags for this day
    await client.query(
      'DELETE FROM log_tags WHERE user_id=$1 AND log_date=$2',
      [req.user.id, log_date]
    );

    const insertedTags = [];
    for (const tag of tags) {
      const { rows } = await client.query(
        `INSERT INTO log_tags (user_id, log_date, category, tag, intensity)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.user.id, log_date, tag.category, tag.tag, tag.intensity || 1]
      );
      insertedTags.push(rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...logResult.rows[0], tags: insertedTags });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/logs/insights  — aggregated mood/symptom frequency
router.get('/insights', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT category, tag, COUNT(*) AS count
       FROM log_tags
       WHERE user_id=$1
         AND log_date >= CURRENT_DATE - INTERVAL '90 days'
       GROUP BY category, tag
       ORDER BY count DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

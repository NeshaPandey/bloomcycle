const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

// All routes require auth
router.use(authenticate);

// ── GET /api/cycles  — list user's past cycles ──────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM cycles WHERE user_id=$1 ORDER BY start_date DESC LIMIT 24`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/cycles/start  — log period start ──────────────
router.post('/start', async (req, res) => {
  const { start_date, notes } = req.body;
  if (!start_date) return res.status(400).json({ error: 'start_date required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO cycles (user_id, start_date, notes) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, start_date, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/cycles/:id/end  — log period end ─────────────
router.patch('/:id/end', async (req, res) => {
  const { end_date } = req.body;
  if (!end_date) return res.status(400).json({ error: 'end_date required' });
  try {
    const { rows } = await db.query(
      `UPDATE cycles
       SET end_date=$1,
           period_length = DATE_PART('day', $1::date - start_date) + 1
       WHERE id=$2 AND user_id=$3 RETURNING *`,
      [end_date, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cycle not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/cycles/predict  — next-period prediction ───────
router.get('/predict', async (req, res) => {
  try {
    // Fetch last 6 complete cycles
    const { rows } = await db.query(
      `SELECT start_date, period_length FROM cycles
       WHERE user_id=$1 AND end_date IS NOT NULL
       ORDER BY start_date DESC LIMIT 6`,
      [req.user.id]
    );

    if (rows.length < 2) {
      return res.json({ message: 'Not enough data yet — log at least 2 cycles' });
    }

    // Compute average cycle length
    const starts = rows.map(r => new Date(r.start_date)).reverse();
    const gaps = [];
    for (let i = 1; i < starts.length; i++) {
      gaps.push((starts[i] - starts[i-1]) / 86400000);
    }
    const avgCycle  = Math.round(gaps.reduce((a,b) => a+b, 0) / gaps.length);
    const avgPeriod = Math.round(rows.reduce((a,r) => a + (r.period_length || 5), 0) / rows.length);

    const lastStart  = new Date(rows[0].start_date);
    const nextStart  = new Date(lastStart); nextStart.setDate(nextStart.getDate() + avgCycle);
    const nextEnd    = new Date(nextStart); nextEnd.setDate(nextEnd.getDate() + avgPeriod - 1);
    const ovulation  = new Date(nextStart); ovulation.setDate(ovulation.getDate() - 14);
    const fertileStart = new Date(ovulation); fertileStart.setDate(fertileStart.getDate() - 5);
    const fertileEnd   = new Date(ovulation); fertileEnd.setDate(fertileEnd.getDate() + 1);

    const toISO = d => d.toISOString().slice(0, 10);

    // Persist prediction
    await db.query(
      `INSERT INTO cycle_predictions
         (user_id, predicted_start, predicted_end, ovulation_date, fertile_window_start, fertile_window_end, confidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [req.user.id, toISO(nextStart), toISO(nextEnd), toISO(ovulation),
       toISO(fertileStart), toISO(fertileEnd), Math.min(0.95, 0.5 + rows.length * 0.08)]
    );

    res.json({
      avg_cycle_length: avgCycle,
      avg_period_length: avgPeriod,
      next_period_start: toISO(nextStart),
      next_period_end:   toISO(nextEnd),
      ovulation_date:    toISO(ovulation),
      fertile_window: { start: toISO(fertileStart), end: toISO(fertileEnd) },
      confidence: Math.min(0.95, 0.5 + rows.length * 0.08),
      based_on_cycles: rows.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/users/search?q=...
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  try {
    const { rows } = await db.query(
      `SELECT id, username, display_name, avatar_url
       FROM users
       WHERE (username ILIKE $1 OR display_name ILIKE $1)
         AND id != $2
         AND is_active = TRUE
       LIMIT 10`,
      [`%${q}%`, req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/:username
router.get('/:username', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, username, display_name, avatar_url, bio, created_at FROM users
       WHERE username=$1 AND is_active=TRUE`,
      [req.params.username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/users/me  — update own profile
router.patch('/me', async (req, res) => {
  const { display_name, bio, avatar_url } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE users SET
         display_name = COALESCE($1, display_name),
         bio          = COALESCE($2, bio),
         avatar_url   = COALESCE($3, avatar_url),
         updated_at   = NOW()
       WHERE id=$4
       RETURNING id, email, username, display_name, bio, avatar_url`,
      [display_name || null, bio || null, avatar_url || null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

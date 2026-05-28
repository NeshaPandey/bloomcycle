const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/community/posts
router.get('/posts', async (req, res) => {
  const { page = 1, limit = 20, tag } = req.query;
  const offset = (page - 1) * limit;
  try {
    const { rows } = await db.query(
      `SELECT p.*,
         CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE u.display_name END AS author_name,
         CASE WHEN p.is_anonymous THEN NULL ELSE u.avatar_url END AS author_avatar,
         CASE WHEN p.is_anonymous THEN NULL ELSE u.username END AS author_username,
         EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id=p.id AND pl.user_id=$3) AS liked_by_me,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) AS comment_count
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE ($4::text IS NULL OR $4 = ANY(p.tags))
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, req.user.id, tag || null]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/community/posts
router.post('/posts', async (req, res) => {
  const { title, body, is_anonymous = false, tags = [] } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'body required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO posts (author_id, title, body, is_anonymous, tags)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, title || null, body, is_anonymous, tags]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/community/posts/:id/like
router.post('/posts/:id/like', async (req, res) => {
  try {
    await db.query(
      `INSERT INTO post_likes (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]
    );
    await db.query(
      `UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id=$1) WHERE id=$1`,
      [req.params.id]
    );
    res.json({ liked: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/community/posts/:id/like
router.delete('/posts/:id/like', async (req, res) => {
  try {
    await db.query(
      `DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2`,
      [req.user.id, req.params.id]
    );
    await db.query(
      `UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id=$1) WHERE id=$1`,
      [req.params.id]
    );
    res.json({ liked: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/community/posts/:id/comments
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*,
         CASE WHEN c.is_anonymous THEN 'Anonymous' ELSE u.display_name END AS author_name,
         CASE WHEN c.is_anonymous THEN NULL ELSE u.avatar_url END AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id=$1 ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/community/posts/:id/comments
router.post('/posts/:id/comments', async (req, res) => {
  const { body, is_anonymous = false } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'body required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO comments (post_id, author_id, body, is_anonymous)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, req.user.id, body, is_anonymous]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

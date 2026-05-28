const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/messages/conversations  — list user's DM threads
router.get('/conversations', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id,
         (SELECT u.display_name FROM conversation_members cm2
          JOIN users u ON u.id=cm2.user_id
          WHERE cm2.conversation_id=c.id AND cm2.user_id!=$1 LIMIT 1) AS other_user_name,
         (SELECT u.avatar_url FROM conversation_members cm2
          JOIN users u ON u.id=cm2.user_id
          WHERE cm2.conversation_id=c.id AND cm2.user_id!=$1 LIMIT 1) AS other_user_avatar,
         (SELECT u.username FROM conversation_members cm2
          JOIN users u ON u.id=cm2.user_id
          WHERE cm2.conversation_id=c.id AND cm2.user_id!=$1 LIMIT 1) AS other_username,
         (SELECT body FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
         (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
         (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id AND sender_id!=$1 AND is_read=FALSE) AS unread_count
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.user_id=$1
       ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/messages/conversations  — start or get a conversation
router.post('/conversations', async (req, res) => {
  const { target_user_id } = req.body;
  if (!target_user_id) return res.status(400).json({ error: 'target_user_id required' });
  if (target_user_id === req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // Check if conversation already exists between these two users
    const existing = await client.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm1 ON cm1.conversation_id=c.id AND cm1.user_id=$1
       JOIN conversation_members cm2 ON cm2.conversation_id=c.id AND cm2.user_id=$2
       LIMIT 1`,
      [req.user.id, target_user_id]
    );

    if (existing.rowCount > 0) {
      await client.query('COMMIT');
      return res.json({ conversation_id: existing.rows[0].id, already_exists: true });
    }

    const convResult = await client.query('INSERT INTO conversations DEFAULT VALUES RETURNING id');
    const convId = convResult.rows[0].id;

    await client.query(
      'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2),($1,$3)',
      [convId, req.user.id, target_user_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ conversation_id: convId, already_exists: false });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/messages/conversations/:id  — fetch messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const member = await db.query(
      'SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!member.rowCount) return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await db.query(
      `SELECT m.*, u.display_name AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON u.id=m.sender_id
       WHERE m.conversation_id=$1 ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

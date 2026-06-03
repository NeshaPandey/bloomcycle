const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const SYSTEM_PROMPT = `You are Bloom, a warm, empathetic women's health assistant built into the BloomCycle app. Help users understand their menstrual cycles, symptoms, moods, cravings, and overall reproductive health. Be warm, supportive, and non-judgmental. Always recommend consulting a healthcare professional for medical advice. Keep responses concise (150-300 words). Never diagnose conditions.`;

router.post('/chat', async (req, res) => {
  const { message, conversation_id } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  try {
    let convId = conversation_id;
    if (!convId) {
      const { rows } = await db.query(
        'INSERT INTO ai_conversations (user_id) VALUES ($1) RETURNING id',
        [req.user.id]
      );
      convId = rows[0].id;
    } else {
      const check = await db.query(
        'SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2',
        [convId, req.user.id]
      );
      if (!check.rowCount) return res.status(403).json({ error: 'Forbidden' });
    }

    const history = await db.query(
      `SELECT role, content FROM ai_messages
       WHERE ai_conversation_id=$1 ORDER BY created_at ASC LIMIT 20`,
      [convId]
    );

    const messages = [
      ...history.rows,
      { role: 'user', content: message }
    ];

    await db.query(
      'INSERT INTO ai_messages (ai_conversation_id, role, content) VALUES ($1,$2,$3)',
      [convId, 'user', message]
    );

    // Call Groq (free!)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        max_tokens: 1024,
      })
    });

    const data = await response.json();
    const assistantReply = data.choices?.[0]?.message?.content;

    if (!assistantReply) {
      console.error('Groq error:', data);
      return res.status(500).json({ error: 'AI service error' });
    }

    await db.query(
      'INSERT INTO ai_messages (ai_conversation_id, role, content) VALUES ($1,$2,$3)',
      [convId, 'assistant', assistantReply]
    );

    res.json({ conversation_id: convId, reply: assistantReply });
  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ac.id, ac.created_at,
         (SELECT content FROM ai_messages
          WHERE ai_conversation_id=ac.id ORDER BY created_at ASC LIMIT 1) AS first_message
       FROM ai_conversations ac
       WHERE user_id=$1
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const check = await db.query(
      'SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!check.rowCount) return res.status(404).json({ error: 'Not found' });
    const { rows } = await db.query(
      'SELECT role, content, created_at FROM ai_messages WHERE ai_conversation_id=$1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

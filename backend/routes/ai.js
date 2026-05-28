const router    = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const db        = require('../db');
const { authenticate } = require('../middleware/auth');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.use(authenticate);

const SYSTEM_PROMPT = `You are Bloom, a warm, empathetic, and knowledgeable women's health assistant built into the BloomCycle app.

You help users understand their menstrual cycles, symptoms, moods, cravings, and overall reproductive health.

Guidelines:
- Be warm, supportive, and non-judgmental
- Provide accurate, evidence-based health information
- Always recommend consulting a healthcare professional for medical advice
- You can discuss: period tracking, PMS, PMDD, PCOS, endometriosis, fertility awareness, menopause, nutrition during cycle phases, exercise tips, mental health, and general wellness
- Never diagnose conditions — always say "this could be related to…" and suggest seeing a doctor
- Keep responses concise but thorough (150-300 words unless more detail is clearly needed)
- Use simple, friendly language — not overly clinical
- Acknowledge feelings before giving information

Remember: You are a supportive companion, not a replacement for medical care.`;

// POST /api/ai/chat  — send a message to Bloom AI
router.post('/chat', async (req, res) => {
  const { message, conversation_id } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  try {
    let convId = conversation_id;

    // Create or fetch conversation
    if (!convId) {
      const { rows } = await db.query(
        'INSERT INTO ai_conversations (user_id) VALUES ($1) RETURNING id',
        [req.user.id]
      );
      convId = rows[0].id;
    } else {
      // Validate ownership
      const check = await db.query(
        'SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2',
        [convId, req.user.id]
      );
      if (!check.rowCount) return res.status(403).json({ error: 'Forbidden' });
    }

    // Load history (last 20 messages for context)
    const history = await db.query(
      `SELECT role, content FROM ai_messages
       WHERE ai_conversation_id=$1 ORDER BY created_at ASC LIMIT 20`,
      [convId]
    );

    const messages = [
      ...history.rows,
      { role: 'user', content: message }
    ];

    // Store user message
    await db.query(
      'INSERT INTO ai_messages (ai_conversation_id, role, content) VALUES ($1,$2,$3)',
      [convId, 'user', message]
    );

    // Call Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const assistantReply = response.content[0].text;

    // Store assistant message
    await db.query(
      'INSERT INTO ai_messages (ai_conversation_id, role, content) VALUES ($1,$2,$3)',
      [convId, 'assistant', assistantReply]
    );

    res.json({
      conversation_id: convId,
      reply: assistantReply,
      usage: response.usage,
    });
  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// GET /api/ai/conversations  — list user's AI conversations
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

// GET /api/ai/conversations/:id  — fetch full chat history
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

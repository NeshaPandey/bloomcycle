const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/cycles
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM cycles WHERE user_id=$1 ORDER BY start_date DESC LIMIT 24`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cycles/start
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

// PATCH /api/cycles/:id/end
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

// GET /api/cycles/predict
router.get('/predict', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT start_date, end_date, period_length 
       FROM cycles WHERE user_id=$1 AND start_date IS NOT NULL
       ORDER BY start_date DESC LIMIT 6`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.json({ message: 'No cycles logged yet' });
    }

    // Use actual data if 2+ cycles, otherwise use 28-day default
    let avgCycle = 28;
    let avgPeriod = 5;

    if (rows.length >= 2) {
      const starts = rows.map(r => new Date(r.start_date)).reverse();
      const gaps = [];
      for (let i = 1; i < starts.length; i++) {
        gaps.push((starts[i] - starts[i-1]) / 86400000);
      }
      avgCycle = Math.round(gaps.reduce((a,b) => a+b, 0) / gaps.length);
    }

    const completeCycles = rows.filter(r => r.period_length);
    if (completeCycles.length > 0) {
      avgPeriod = Math.round(
        completeCycles.reduce((a,r) => a + r.period_length, 0) / completeCycles.length
      );
    }

    const lastStart  = new Date(rows[0].start_date);
    const today      = new Date();

    // Current cycle day
    const currentDay = Math.floor((today - lastStart) / 86400000) + 1;

    // Determine current phase
    let currentPhase = '';
    let phaseDay = currentDay;
    if (currentDay <= avgPeriod) {
      currentPhase = 'Menstrual Phase 🩸';
    } else if (currentDay <= 13) {
      currentPhase = 'Follicular Phase 🌱';
      phaseDay = currentDay - avgPeriod;
    } else if (currentDay <= 15) {
      currentPhase = 'Ovulation 🌟';
      phaseDay = currentDay - 13;
    } else if (currentDay <= avgCycle) {
      currentPhase = 'Luteal Phase 🌙';
      phaseDay = currentDay - 15;
    } else {
      currentPhase = 'Period Expected 🩸';
    }

    // Next period prediction
    const nextStart  = new Date(lastStart);
    nextStart.setDate(nextStart.getDate() + avgCycle);
    const nextEnd    = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + avgPeriod - 1);
    const ovulation  = new Date(nextStart);
    ovulation.setDate(ovulation.getDate() - 14);
    const fertileStart = new Date(ovulation);
    fertileStart.setDate(fertileStart.getDate() - 5);
    const fertileEnd   = new Date(ovulation);
    fertileEnd.setDate(fertileEnd.getDate() + 1);

    const toISO = d => d.toISOString().slice(0, 10);
    const daysUntilNext = Math.ceil((nextStart - today) / 86400000);

    res.json({
      avg_cycle_length: avgCycle,
      avg_period_length: avgPeriod,
      current_cycle_day: currentDay,
      current_phase: currentPhase,
      days_until_next_period: daysUntilNext,
      next_period_start: toISO(nextStart),
      next_period_end:   toISO(nextEnd),
      ovulation_date:    toISO(ovulation),
      fertile_window: { 
        start: toISO(fertileStart), 
        end: toISO(fertileEnd) 
      },
      confidence: rows.length >= 2 ? 0.85 : 0.6,
      based_on_cycles: rows.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

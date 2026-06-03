import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './utils/api';
import './index.css';

// ─── Icons (inline SVG for zero deps) ─────────────────────────────────────────
const Icon = ({ d, size = 20, stroke = 'currentColor', fill = 'none', strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  home:      'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  calendar:  'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  heart:     'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  message:   'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  user:      'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  bot:       'M12 8V4H8 M12 4h4v4M8 8h8v8H8z M8 16l-2 4M16 16l2 4M10 12h.01M14 12h.01',
  send:      'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  plus:      'M12 5v14M5 12h14',
  search:    'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
  logout:    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  drop:      'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
  sparkle:   'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
  chevron:   'M9 18l6-6-6-6',
  x:         'M18 6 6 18M6 6l12 12',
  edit:      'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
};

// ─── Small shared components ────────────────────────────────────────────────────
function Avatar({ src, name = '?', size = 36 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return src
    ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    : <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg,#f0657d,#e8a0b0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 600, color: '#fff', flexShrink: 0
      }}>{initials}</div>;
}

function Tag({ label, emoji, active, onClick, small }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? '4px 10px' : '7px 14px',
      borderRadius: 99,
      border: `1.5px solid ${active ? '#f0657d' : '#ecd8df'}`,
      background: active ? '#fde8ec' : '#fff',
      color: active ? '#c94a62' : '#8a6070',
      fontSize: small ? 12 : 13,
      fontWeight: 500,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      cursor: 'pointer', transition: 'all .15s ease',
    }}>
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(45,26,33,.4)',
      backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16
    }} onClick={onClose}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>{title}</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <Icon d={icons.x} size={18} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── AUTH PAGES ─────────────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode]     = useState('login');
  const [form, setForm]     = useState({ email:'', password:'', username:'', display_name:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.email, form.username, form.password, form.display_name);
      nav('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: 'var(--cream)',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Left decorative panel */}
      <div style={{
        flex: 1, background: 'linear-gradient(160deg, #f0657d 0%, #c94a62 50%, #9a3050 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 48, color: '#fff',
        display: window.innerWidth < 768 ? 'none' : 'flex'
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🌸</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 42, marginBottom: 12, textAlign: 'center' }}>
          BloomCycle
        </h1>
        <p style={{ fontSize: 16, opacity: .85, textAlign: 'center', lineHeight: 1.6, maxWidth: 280 }}>
          Track your cycle, understand your body, and connect with a community that truly gets it.
        </p>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['🩸 Period & cycle tracking','😊 Mood, cravings & symptoms','🤖 AI health companion','💬 Private community'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, opacity: .9 }}>
              <span style={{ fontSize: 20 }}>{f.slice(0, 2)}</span>
              <span>{f.slice(3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌸</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--text)' }}>
              {mode === 'login' ? 'Welcome back' : 'Join BloomCycle'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
              {mode === 'login' ? 'Sign in to your account' : 'Create your free account'}
            </p>
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <>
                <input className="input" placeholder="Display name" value={form.display_name}
                  onChange={e => setForm(f => ({...f, display_name: e.target.value}))} />
                <input className="input" placeholder="Username (no spaces)" value={form.username}
                  onChange={e => setForm(f => ({...f, username: e.target.value}))} required />
              </>
            )}
            <input className="input" type="email" placeholder="Email" value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
            <input className="input" type="password" placeholder="Password" value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))} required />

            {error && (
              <div style={{ color: '#c94a62', fontSize: 13, background: '#fde8ec', padding: '8px 12px', borderRadius: 8 }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ marginTop: 6, justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}>
              {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
              style={{ background: 'none', border: 'none', color: 'var(--rose)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── APP SHELL ───────────────────────────────────────────────────────────────────
function Shell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const navItems = [
    { to: '/',          icon: icons.home,     label: 'Home' },
    { to: '/calendar',  icon: icons.calendar, label: 'Calendar' },
    { to: '/log',       icon: icons.drop,     label: 'Log' },
    { to: '/community', icon: icons.heart,    label: 'Community' },
    { to: '/messages',  icon: icons.message,  label: 'Messages' },
    { to: '/bloom-ai',  icon: icons.sparkle,  label: 'Bloom AI' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav style={{
        width: 220, flexShrink: 0, background: '#fff',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', padding: '24px 0',
      }}>
        <div style={{ padding: '0 20px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🌸</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--rose)' }}>BloomCycle</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                fontWeight: 500, fontSize: 14, transition: 'all .15s',
                color: isActive ? 'var(--rose)' : 'var(--text-muted)',
                background: isActive ? 'var(--rose-light)' : 'transparent',
              })}>
              <Icon d={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* User section */}
        <div style={{ padding: '16px 16px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar name={user?.display_name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.display_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{user?.username}</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 8, padding: '8px 10px', fontSize: 13 }}>
            <Icon d={icons.logout} size={16} /> Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--cream)' }}>
        {children}
      </main>
    </div>
  );
}

// ─── HOME / DASHBOARD ────────────────────────────────────────────────────────────
function HomePage() {
  const { user }        = useAuth();
  const [cycles, setCycles]   = useState([]);
  const [predict, setPredict] = useState(null);
  const [today, setToday]     = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    api.get('/cycles').then(r => setCycles(r.data));
    api.get('/cycles/predict').then(r => setPredict(r.data)).catch(() => {});
  }, []);

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff;
  };

  const nextPeriodDays = daysUntil(predict?.next_period_start);

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, color: 'var(--text)' }}>
          Hello, {user?.display_name?.split(' ')[0]} 🌷
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Key stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
       <StatCard
        label="Next Period"
        value={predict?.days_until_next_period !== undefined
          ? (predict.days_until_next_period <= 0 ? 'Today!' : `${predict.days_until_next_period}d away`)
          : '—'}
        sub={predict?.next_period_start || 'Log a cycle to predict'}
        emoji="🩸"
        color="#f0657d"
      />
      <StatCard
        label="Current Phase"
        value={predict?.current_phase || '—'}
        sub={predict?.current_cycle_day ? `Day ${predict.current_cycle_day} of cycle` : 'No active cycle'}
        emoji="🌙"
        color="#9a7ab0"
      />
      <StatCard
        label="Ovulation"
        value={predict?.ovulation_date
          ? `${Math.ceil((new Date(predict.ovulation_date) - new Date()) / 86400000)}d`
          : '—'}
        sub={predict?.ovulation_date || 'Predicted date'}
        emoji="✨"
        color="#70a8b0"
      />
      </div>

      {/* Fertile window banner */}
      {predict?.fertile_window && (
        <div style={{
          background: 'linear-gradient(135deg, #e8dff0, #fde8ec)',
          border: '1px solid #ddd4e8', borderRadius: 'var(--radius)',
          padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16
        }}>
          <span style={{ fontSize: 32 }}>🌿</span>
          <div>
            <div style={{ fontWeight: 600, color: '#6a4a8a', marginBottom: 2 }}>Fertile Window</div>
            <div style={{ fontSize: 14, color: '#8a6070' }}>
              {new Date(predict.fertile_window.start).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
              {' — '}
              {new Date(predict.fertile_window.end).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
              &nbsp;·&nbsp;{predict.confidence ? `${Math.round(predict.confidence * 100)}% confidence` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Recent cycles */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Recent Cycles</h3>
          <NavLink to="/calendar" style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 500 }}>View calendar →</NavLink>
        </div>
        {cycles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
            <p style={{ marginBottom: 12 }}>No cycles logged yet</p>
            <NavLink to="/log" className="btn btn-primary" style={{ fontSize: 13 }}>Log your first cycle</NavLink>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cycles.slice(0, 4).map(c => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'var(--blush)', borderRadius: 10
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {new Date(c.start_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                  </span>
                  {c.end_date && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {' → '}{new Date(c.end_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                  </span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {c.period_length ? `${c.period_length} days` : 'Ongoing 🩸'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, emoji, color }) {
  return (
    <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: .08,
        lineHeight: 1, userSelect: 'none'
      }}>{emoji}</div>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', opacity: .7 }}>{sub}</div>
    </div>
  );
}

// ─── CALENDAR PAGE ───────────────────────────────────────────────────────────────
function CalendarPage() {
  const [year, setYear]   = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [logs, setLogs]   = useState([]);
  const [cycles, setCycles] = useState([]);
  const [predict, setPredict] = useState(null);

  useEffect(() => {
    const from = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month+1, 0).getDate();
    const to = `${year}-${String(month+1).padStart(2,'0')}-${lastDay}`;
    api.get(`/logs?from=${from}&to=${to}`).then(r => setLogs(r.data));
    api.get('/cycles').then(r => setCycles(r.data));
    api.get('/cycles/predict').then(r => setPredict(r.data)).catch(()=>{});
  }, [year, month]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const logMap = {};
  logs.forEach(l => { logMap[l.log_date?.slice(0,10)] = l; });

  const periodDates = new Set();
  cycles.forEach(c => {
    if (!c.start_date) return;
    const start = new Date(c.start_date);
    const end = c.end_date ? new Date(c.end_date) : new Date(start.getTime() + 5*86400000);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      periodDates.add(d.toISOString().slice(0,10));
    }
  });

  const isFertile = (dateStr) => {
    if (!predict?.fertile_window) return false;
    return dateStr >= predict.fertile_window.start && dateStr <= predict.fertile_window.end;
  };
  const isOvulation = (dateStr) => predict?.ovulation_date === dateStr;
  const isPredicted = (dateStr) => predict?.next_period_start && dateStr >= predict.next_period_start
    && predict?.next_period_end && dateStr <= predict.next_period_end;

  const todayStr = new Date().toISOString().slice(0,10);

  return (
    <div style={{ padding: 32, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32 }}>Calendar</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }}>‹</button>
          <span style={{ fontWeight: 600, minWidth: 140, textAlign: 'center' }}>{monthName}</span>
          <button className="btn btn-ghost" onClick={() => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }}>›</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['#f0657d','Period 🩸'],['#fdd0d8','Predicted'],['#c8e6c9','Fertile window'],['#fff3cd','Ovulation ✨']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{l}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day  = i + 1;
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const inPeriod = periodDates.has(dateStr);
            const predicted = isPredicted(dateStr);
            const fertile = isFertile(dateStr);
            const ovulation = isOvulation(dateStr);
            const isToday = dateStr === todayStr;
            const log = logMap[dateStr];

            let bg = 'transparent';
            if (ovulation) bg = '#fff3cd';
            else if (inPeriod) bg = '#f0657d';
            else if (predicted) bg = '#fdd0d8';
            else if (fertile) bg = '#c8e6c9';

            return (
              <div key={day} style={{
                aspectRatio: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: 10, background: bg, position: 'relative',
                border: isToday ? '2px solid var(--rose)' : '2px solid transparent',
                cursor: 'pointer', transition: 'all .1s',
              }}>
                <span style={{
                  fontSize: 13, fontWeight: isToday ? 700 : 400,
                  color: inPeriod ? '#fff' : 'var(--text)',
                }}>{day}</span>
                {log?.tags?.length > 0 && (
                  <div style={{ fontSize: 8, marginTop: 1 }}>
                    {log.tags.slice(0,2).map(t => <span key={t.id}>{t.tag?.slice(0,1)}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── LOG PAGE ────────────────────────────────────────────────────────────────────
const FLOWS = [
  { value: 'none', label: 'None', emoji: '⚪' },
  { value: 'spotting', label: 'Spotting', emoji: '🔴' },
  { value: 'light', label: 'Light', emoji: '🩸' },
  { value: 'medium', label: 'Medium', emoji: '🩸🩸' },
  { value: 'heavy', label: 'Heavy', emoji: '🩸🩸🩸' },
];

function LogPage() {
  const [date, setDate]       = useState(new Date().toISOString().slice(0,10));
  const [flow, setFlow]       = useState('');
  const [selected, setSelected] = useState({});  // tag → true
  const [defs, setDefs]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    api.get('/logs/tags/definitions').then(r => setDefs(r.data));
  }, []);

  // Load existing log when date changes
  useEffect(() => {
    api.get(`/logs?from=${date}&to=${date}`).then(r => {
      const log = r.data[0];
      if (log) {
        setFlow(log.flow_level || '');
        const sel = {};
        (log.tags || []).forEach(t => sel[`${t.category}::${t.tag}`] = true);
        setSelected(sel);
      } else {
        setFlow(''); setSelected({});
      }
    });
  }, [date]);

  const toggleTag = (cat, tag) => {
    const key = `${cat}::${tag}`;
    setSelected(s => ({ ...s, [key]: !s[key] }));
  };

  const save = async () => {
    setSaving(true);
    const tags = Object.entries(selected)
      .filter(([,v]) => v)
      .map(([k]) => ({ category: k.split('::')[0], tag: k.split('::')[1] }));
    try {
      await api.post('/logs', { log_date: date, flow_level: flow || null, tags });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 32, maxWidth: 620, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, marginBottom: 8 }}>Daily Log</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>How are you feeling today?</p>

      {/* Date picker */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>DATE</label>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)}
          style={{ maxWidth: 200 }} />
      </div>

      {/* Flow */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>🩸 Flow Level</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FLOWS.map(f => (
            <Tag key={f.value} label={f.label} emoji={f.emoji}
              active={flow === f.value} onClick={() => setFlow(f.value === flow ? '' : f.value)} />
          ))}
        </div>
      </div>

      {/* Tags by category */}
      {Object.entries(defs).map(([cat, tags]) => (
        <div key={cat} className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, textTransform: 'capitalize', color: 'var(--text)' }}>
            {cat === 'mood' ? '😊' : cat === 'symptom' ? '💊' : cat === 'craving' ? '🍫' : cat === 'activity' ? '🏃' : '💤'} {cat}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tags.map(t => (
              <Tag key={t.id} label={t.tag} emoji={t.emoji}
                active={!!selected[`${cat}::${t.tag}`]}
                onClick={() => toggleTag(cat, t.tag)} />
            ))}
          </div>
        </div>
      ))}

      {/* Cycle logging buttons */}
      <div className="card" style={{ padding: 20, marginBottom: 16, background: 'var(--rose-light)' }}>
        <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--rose)' }}>🩸 Period Tracking</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={async () => {
            try {
              await api.post('/cycles/start', { start_date: date });
              alert('✅ Period start logged!');
            } catch(e) { alert('Error: ' + (e.response?.data?.error || e.message)); }
          }}>🩸 Start Period Today</button>
          <button className="btn btn-outline" onClick={async () => {
            try {
              const cycles = await api.get('/cycles');
              const latest = cycles.data[0];
              if (!latest) return alert('No cycle found to end');
              await api.patch(`/cycles/${latest.id}/end`, { end_date: date });
              alert('✅ Period end logged!');
            } catch(e) { alert('Error: ' + (e.response?.data?.error || e.message)); }
          }}>⬜ End Period Today</button>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}
        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}>
        {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Today\'s Log'}
      </button>
    </div>
  );
}

// ─── COMMUNITY PAGE ──────────────────────────────────────────────────────────────
function CommunityPage() {
  const { user }           = useAuth();
  const [posts, setPosts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newPost, setNewPost] = useState({ title:'', body:'', is_anonymous: false });
  const [activePost, setActivePost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const fetchPosts = () => api.get('/community/posts').then(r => { setPosts(r.data); setLoading(false); });

  useEffect(() => { fetchPosts(); }, []);

  const openPost = async (post) => {
    setActivePost(post);
    const r = await api.get(`/community/posts/${post.id}/comments`);
    setComments(r.data);
  };

  const submitPost = async () => {
    if (!newPost.body.trim()) return;
    await api.post('/community/posts', newPost);
    setShowNew(false);
    setNewPost({ title:'', body:'', is_anonymous:false });
    fetchPosts();
  };

  const toggleLike = async (post) => {
    if (post.liked_by_me) await api.delete(`/community/posts/${post.id}/like`);
    else await api.post(`/community/posts/${post.id}/like`);
    fetchPosts();
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    await api.post(`/community/posts/${activePost.id}/comments`, { body: newComment });
    setNewComment('');
    const r = await api.get(`/community/posts/${activePost.id}/comments`);
    setComments(r.data);
  };

  return (
    <div style={{ padding: 32, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32 }}>Community</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Share stories, ask questions, support each other 💕</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Icon d={icons.plus} size={16} /> Share Story
        </button>
      </div>

      {/* New post modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Share Your Story">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input" placeholder="Title (optional)" value={newPost.title}
            onChange={e => setNewPost(p => ({...p, title: e.target.value}))} />
          <textarea className="input" placeholder="What's on your mind…" rows={5}
            value={newPost.body} onChange={e => setNewPost(p => ({...p, body: e.target.value}))}
            style={{ resize: 'vertical' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={newPost.is_anonymous}
              onChange={e => setNewPost(p => ({...p, is_anonymous: e.target.checked}))} />
            Post anonymously
          </label>
          <button className="btn btn-primary" onClick={submitPost} style={{ justifyContent: 'center' }}>
            Post Story
          </button>
        </div>
      </Modal>

      {/* Post detail modal */}
      <Modal open={!!activePost} onClose={() => setActivePost(null)} title={activePost?.title || 'Story'}>
        {activePost && (
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <Avatar name={activePost.author_name} size={36} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{activePost.author_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(activePost.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <p style={{ lineHeight: 1.6, marginBottom: 24 }}>{activePost.body}</p>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 16 }} />
            <h4 style={{ marginBottom: 12, fontWeight: 600 }}>Comments ({comments.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 240, overflow: 'auto' }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <Avatar name={c.author_name} size={28} />
                  <div style={{ background: 'var(--blush)', borderRadius: 10, padding: '8px 12px', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--rose)', marginBottom: 4 }}>{c.author_name}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Add a comment…" value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()} />
              <button className="btn btn-primary" onClick={addComment}>Send</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Posts feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading stories…</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48 }}>💕</div>
          <p>Be the first to share a story!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map(post => (
            <div key={post.id} className="card" style={{ padding: 24, cursor: 'pointer', transition: 'box-shadow .2s' }}
              onClick={() => openPost(post)}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <Avatar name={post.author_name} size={40} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{post.author_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(post.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                  </div>
                </div>
              </div>
              {post.title && <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 8 }}>{post.title}</h3>}
              <p style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: 14,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {post.body}
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <button style={{ background:'none', border:'none', color: post.liked_by_me ? 'var(--rose)' : 'var(--text-muted)',
                  fontSize: 13, cursor: 'pointer', display:'flex', alignItems:'center', gap:5 }}
                  onClick={e => { e.stopPropagation(); toggleLike(post); }}>
                  {post.liked_by_me ? '❤️' : '🤍'} {post.likes_count}
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  💬 {post.comment_count} comments
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MESSAGES PAGE ───────────────────────────────────────────────────────────────
function MessagesPage() {
  const { user }               = useAuth();
  const [convos, setConvos]    = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [msgs, setMsgs]        = useState([]);
  const [input, setInput]      = useState('');
  const [searchQ, setSearchQ]  = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const msgsEndRef = useRef(null);

  useEffect(() => {
    api.get('/messages/conversations').then(r => setConvos(r.data));
  }, []);

  useEffect(() => {
    if (activeConvo) {
      api.get(`/messages/conversations/${activeConvo.conversation_id || activeConvo.id}`)
        .then(r => setMsgs(r.data));
    }
  }, [activeConvo]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const searchUsers = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchRes([]); return; }
    const { data } = await api.get(`/users/search?q=${q}`);
    setSearchRes(data);
  };

  const startConvo = async (targetUser) => {
    const { data } = await api.post('/messages/conversations', { target_user_id: targetUser.id });
    setSearchQ(''); setSearchRes([]);
    const convo = { conversation_id: data.conversation_id, other_user_name: targetUser.display_name,
      other_username: targetUser.username };
    setActiveConvo(convo);
    api.get('/messages/conversations').then(r => setConvos(r.data));
  };

  const send = async () => {
    if (!input.trim() || !activeConvo) return;
    const convoId = activeConvo.conversation_id || activeConvo.id;
    await api.post('/messages', { conversation_id: convoId, body: input });
    setInput('');
    const r = await api.get(`/messages/conversations/${convoId}`);
    setMsgs(r.data);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <div style={{ width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 12 }}>Messages</h2>
          <div style={{ position: 'relative' }}>
            <input className="input" placeholder="Find someone…" value={searchQ}
              onChange={e => searchUsers(e.target.value)}
              style={{ paddingLeft: 36, fontSize: 13 }} />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Icon d={icons.search} size={15} />
            </span>
          </div>
          {searchRes.length > 0 && (
            <div className="card" style={{ marginTop: 4, padding: 8, position: 'absolute', zIndex: 10, width: 248 }}>
              {searchRes.map(u => (
                <div key={u.id} onClick={() => startConvo(u)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--blush)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <Avatar name={u.display_name} size={28} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.display_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {convos.map(c => (
            <div key={c.id} onClick={() => setActiveConvo(c)}
              style={{
                padding: '14px 16px', cursor: 'pointer', transition: 'background .1s',
                background: activeConvo?.id === c.id ? 'var(--rose-light)' : 'transparent',
                borderBottom: '1px solid var(--border)',
                display: 'flex', gap: 10, alignItems: 'center',
              }}
              onMouseEnter={e => { if (activeConvo?.id !== c.id) e.currentTarget.style.background='var(--blush)'; }}
              onMouseLeave={e => { if (activeConvo?.id !== c.id) e.currentTarget.style.background='transparent'; }}>
              <Avatar name={c.other_user_name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.other_user_name || c.other_username}</span>
                  {c.unread_count > 0 && (
                    <span style={{ background:'var(--rose)', color:'#fff', borderRadius:99, fontSize:10,
                      padding:'1px 6px', fontWeight:700 }}>{c.unread_count}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {c.last_message || 'No messages yet'}
                </div>
              </div>
            </div>
          ))}
          {convos.length === 0 && (
            <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)', fontSize:14 }}>
              Search for someone to start chatting
            </div>
          )}
        </div>
      </div>

      {/* Chat window */}
      {activeConvo ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
            <Avatar name={activeConvo.other_user_name} size={36} />
            <div>
              <div style={{ fontWeight:600 }}>{activeConvo.other_user_name || activeConvo.other_username}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>@{activeConvo.other_username}</div>
            </div>
          </div>
          <div style={{ flex:1, overflow:'auto', padding:24, display:'flex', flexDirection:'column', gap:12 }}>
            {msgs.map(m => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap:8 }}>
                  {!mine && <Avatar name={m.sender_name} size={28} />}
                  <div style={{
                    maxWidth:'68%', padding:'10px 14px', borderRadius: mine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: mine ? 'var(--rose)' : '#fff',
                    color: mine ? '#fff' : 'var(--text)',
                    fontSize: 14, lineHeight: 1.5,
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {m.body}
                    <div style={{ fontSize:10, opacity:.7, marginTop:4, textAlign:'right' }}>
                      {new Date(m.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={msgsEndRef} />
          </div>
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
            <input className="input" placeholder="Type a message…" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()} />
            <button className="btn btn-primary" onClick={send} style={{ padding:'10px 16px', flexShrink:0 }}>
              <Icon d={icons.send} size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'var(--text-muted)' }}>
          <div style={{ fontSize:56 }}>💌</div>
          <p style={{ fontSize:16, fontFamily:'var(--font-serif)' }}>Select a conversation</p>
          <p style={{ fontSize:13 }}>Or search for someone to message</p>
        </div>
      )}
    </div>
  );
}

// ─── BLOOM AI PAGE ───────────────────────────────────────────────────────────────
function BloomAIPage() {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [convoId, setConvoId]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const msgsEndRef = useRef(null);

  const GREETING = {
    role: 'assistant',
    content: "Hi! I'm Bloom 🌸 — your personal women's health companion. I'm here to help you understand your cycle, symptoms, moods, and overall wellbeing.\n\nYou can ask me anything — about cramps, PMS, nutrition, PCOS, fertility, mental health during your cycle, and more. What's on your mind?"
  };

  useEffect(() => {
    setMessages([GREETING]);
  }, []);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', { message: input, conversation_id: convoId });
      setConvoId(data.conversation_id);
      setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'I\'m having trouble connecting right now. Please try again in a moment.' }]);
    } finally { setLoading(false); }
  };

  const SUGGESTIONS = [
    'Why am I so tired before my period?',
    'What foods help with cramps?',
    'How do I track ovulation naturally?',
    'What is PMDD?',
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{
        padding:'20px 28px', background:'linear-gradient(135deg,#f0657d 0%,#9a3050 100%)',
        color:'#fff', display:'flex', alignItems:'center', gap:14
      }}>
        <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,.2)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🌸</div>
        <div>
          <h2 style={{ fontFamily:'var(--font-serif)', fontSize:22, marginBottom:2 }}>Bloom AI</h2>
          <p style={{ fontSize:13, opacity:.85 }}>Your personal women's health companion</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflow:'auto', padding:'24px 28px', display:'flex', flexDirection:'column', gap:16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#f0657d,#c94a62)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🌸</div>
            )}
            <div style={{
              maxWidth:'72%', padding:'12px 16px', lineHeight:1.6, fontSize:14,
              borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: m.role === 'user' ? 'var(--rose)' : '#fff',
              color: m.role === 'user' ? '#fff' : 'var(--text)',
              boxShadow: 'var(--shadow-sm)', whiteSpace:'pre-wrap'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#f0657d,#c94a62)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🌸</div>
            <div style={{ padding:'12px 16px', background:'#fff', borderRadius:'4px 16px 16px 16px',
              boxShadow:'var(--shadow-sm)', color:'var(--text-muted)', fontSize:14, animation:'pulse 1.5s ease infinite' }}>
              Thinking…
            </div>
          </div>
        )}
        <div ref={msgsEndRef} />
      </div>

      {/* Suggestions (shown when only greeting visible) */}
      {messages.length === 1 && (
        <div style={{ padding:'0 28px 16px', display:'flex', gap:8, flexWrap:'wrap' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setInput(s); }}
              style={{
                padding:'7px 14px', borderRadius:99, border:'1.5px solid var(--border)',
                background:'#fff', color:'var(--text)', fontSize:12, cursor:'pointer',
                transition:'all .15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--rose)'; e.currentTarget.style.color='var(--rose)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text)'; }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10,
        background:'#fff' }}>
        <input className="input" placeholder="Ask Bloom anything about your health…"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && send()} />
        <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}
          style={{ padding:'10px 18px', flexShrink:0 }}>
          <Icon d={icons.send} size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:32 }}>🌸</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/log" element={<ProtectedRoute><LogPage /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/bloom-ai" element={<ProtectedRoute><BloomAIPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

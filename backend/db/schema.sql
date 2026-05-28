-- ============================================================
-- BloomCycle Database Schema (PostgreSQL)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  bio           TEXT,
  date_of_birth DATE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CYCLE TRACKING
-- ============================================================
CREATE TABLE cycles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE,               -- NULL if cycle still ongoing
  period_length   INT,                -- computed in days
  cycle_length    INT,                -- days from this start to next start
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cycles_user_id ON cycles(user_id);
CREATE INDEX idx_cycles_start_date ON cycles(start_date);

-- Daily log (one row per day per user)
CREATE TABLE daily_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL,
  flow_level    VARCHAR(10) CHECK (flow_level IN ('none','spotting','light','medium','heavy')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date);

-- ============================================================
-- SYMPTOMS / MOODS / CRAVINGS  (EAV-style tag table)
-- ============================================================
CREATE TABLE log_tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date    DATE NOT NULL,
  category    VARCHAR(30) NOT NULL  -- 'mood','symptom','craving','activity','sleep'
    CHECK (category IN ('mood','symptom','craving','activity','sleep','note')),
  tag         VARCHAR(80) NOT NULL,
  intensity   SMALLINT DEFAULT 1 CHECK (intensity BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_log_tags_user_date ON log_tags(user_id, log_date);
CREATE INDEX idx_log_tags_category  ON log_tags(category);

-- Pre-defined tag master list (moods, symptoms, cravings …)
CREATE TABLE tag_definitions (
  id        SERIAL PRIMARY KEY,
  category  VARCHAR(30) NOT NULL,
  tag       VARCHAR(80) NOT NULL,
  emoji     VARCHAR(8),
  UNIQUE(category, tag)
);

-- Seed some common tags
INSERT INTO tag_definitions (category, tag, emoji) VALUES
  ('mood','Happy','😊'), ('mood','Sad','😢'), ('mood','Anxious','😟'),
  ('mood','Irritable','😠'), ('mood','Calm','😌'), ('mood','Energetic','⚡'),
  ('mood','Tired','😴'), ('mood','Emotional','🥺'), ('mood','Focused','🎯'),
  ('symptom','Cramps','💥'), ('symptom','Headache','🤕'), ('symptom','Bloating','🫧'),
  ('symptom','Backache','🔩'), ('symptom','Breast tenderness','💛'), ('symptom','Nausea','🤢'),
  ('symptom','Acne','🔴'), ('symptom','Spotting','🩸'), ('symptom','Insomnia','🌙'),
  ('craving','Chocolate','🍫'), ('craving','Sweets','🍬'), ('craving','Salty snacks','🧂'),
  ('craving','Carbs','🍞'), ('craving','Spicy food','🌶️'), ('craving','Comfort food','🍲'),
  ('craving','Fruits','🍓'), ('craving','Nothing / Low appetite','🙅'),
  ('activity','Exercise','🏃'), ('activity','Yoga','🧘'), ('activity','Rest','🛋️'),
  ('activity','Sex','💕'), ('activity','Meditation','🌿'),
  ('sleep','Great sleep','⭐'), ('sleep','Poor sleep','😵'), ('sleep','Nightmares','👾');

-- ============================================================
-- PREDICTIONS / INSIGHTS  (stored computed predictions)
-- ============================================================
CREATE TABLE cycle_predictions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_start     DATE NOT NULL,
  predicted_end       DATE,
  ovulation_date      DATE,
  fertile_window_start DATE,
  fertile_window_end  DATE,
  confidence          NUMERIC(4,2),        -- 0-1
  generated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMUNITY POSTS & MESSAGES
-- ============================================================
CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200),
  body        TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  tags        TEXT[],                 -- e.g. ARRAY['pcos','tips']
  likes_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

CREATE TABLE post_likes (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id  UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE comments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id      UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Direct messages
CREATE TABLE conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  body            TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_convo ON messages(conversation_id, created_at);

-- ============================================================
-- AI AGENT CHAT HISTORY
-- ============================================================
CREATE TABLE ai_conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role               VARCHAR(10) NOT NULL CHECK (role IN ('user','assistant')),
  content            TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(40) NOT NULL,  -- 'period_reminder','ovulation','message','like','comment'
  payload    JSONB,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- updated_at trigger (shared helper)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_daily_logs_upd   BEFORE UPDATE ON daily_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_posts_upd        BEFORE UPDATE ON posts       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Memory Palace schema. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('TEACHER','PARENT')),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classrooms (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kids (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  pin_hash     TEXT NOT NULL,
  age_band     TEXT NOT NULL CHECK (age_band IN ('JUNIOR','MIDDLE','SENIOR')),
  parent_code  TEXT NOT NULL UNIQUE,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  palace_spots TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, name)
);

CREATE TABLE IF NOT EXISTS parent_kids (
  parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kid_id    TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, kid_id)
);

-- Status per module: LOCKED / ACTIVE / MASTERED. level drives difficulty.
CREATE TABLE IF NOT EXISTS module_progress (
  kid_id      TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  module      INT  NOT NULL,
  status      TEXT NOT NULL DEFAULT 'LOCKED',
  level       INT  NOT NULL DEFAULT 1,
  mastered_at TIMESTAMPTZ,
  PRIMARY KEY (kid_id, module)
);

-- A generated exercise. Answers stay here and are graded on the server.
CREATE TABLE IF NOT EXISTS exercises (
  id           TEXT PRIMARY KEY,
  kid_id       TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  module       INT  NOT NULL,
  kind         TEXT NOT NULL,
  content      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS attempts (
  id         TEXT PRIMARY KEY,
  kid_id     TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  module     INT  NOT NULL,
  kind       TEXT NOT NULL,
  score      INT  NOT NULL,
  correct    INT  NOT NULL,
  total      INT  NOT NULL,
  missed     JSONB NOT NULL DEFAULT '[]',
  day_key    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attempts_kid_idx ON attempts (kid_id, created_at);

-- Spaced-repetition cards (Leitner boxes 1-3). Missed items from any module land here.
CREATE TABLE IF NOT EXISTS review_items (
  id          TEXT PRIMARY KEY,
  kid_id      TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  module      INT  NOT NULL,
  prompt      TEXT NOT NULL,
  answer      TEXT NOT NULL,
  box         INT  NOT NULL DEFAULT 1,
  due_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  times_wrong INT  NOT NULL DEFAULT 0,
  times_right INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kid_id, prompt)
);
CREATE INDEX IF NOT EXISTS review_due_idx ON review_items (kid_id, due_at);

-- PIN lockout after repeated wrong guesses.
ALTER TABLE kids ADD COLUMN IF NOT EXISTS pin_failures INT NOT NULL DEFAULT 0;
ALTER TABLE kids ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

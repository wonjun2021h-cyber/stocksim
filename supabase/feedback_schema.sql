-- StockSim — 의견 / 종목 추가 요청
-- Supabase SQL Editor에서 user_portfolios 스키마 실행 후 이 파일을 실행하세요.

-- ── 통합 피드백 (웹훅 연동 권장) ─────────────────────────────
CREATE TABLE IF NOT EXISTS feedbacks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  content    TEXT        NOT NULL CHECK (char_length(trim(content)) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at
  ON feedbacks (created_at DESC);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 누구나 제출 (비로그인: user_id NULL, 로그인: 본인 id만)
DROP POLICY IF EXISTS "feedbacks_insert_public" ON feedbacks;
CREATE POLICY "feedbacks_insert_public" ON feedbacks
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

GRANT INSERT ON TABLE public.feedbacks TO anon, authenticated;

-- ── (레거시) 개별 테이블 ────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_feedback (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL CHECK (char_length(trim(message)) >= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id
  ON user_feedback (user_id);

CREATE TABLE IF NOT EXISTS stock_requests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ticker     TEXT        NOT NULL CHECK (char_length(trim(ticker)) >= 1),
  message    TEXT,
  contact    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_requests_created_at
  ON stock_requests (created_at DESC);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;

-- 의견: 본인만 작성·조회
CREATE POLICY "user_feedback_insert_own" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_feedback_select_own" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- 종목 요청: 누구나 제출 (비로그인 포함), 조회는 서비스 역할만
CREATE POLICY "stock_requests_insert_public" ON stock_requests
  FOR INSERT WITH CHECK (true);

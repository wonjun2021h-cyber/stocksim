-- StockSim — 의견 / 종목 추가 요청
-- Supabase SQL Editor에서 user_portfolios 스키마 실행 후 이 파일을 실행하세요.

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

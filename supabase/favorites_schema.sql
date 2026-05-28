-- ═══════════════════════════════════════════════════════════
-- StockSim — 관심 종목 (찜) 테이블
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS user_favorites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
  ON user_favorites (user_id);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_owner_select" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_owner_insert" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_owner_delete" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON user_favorites TO authenticated;

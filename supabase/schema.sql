-- ═══════════════════════════════════════════════════════════
-- StockSim — Supabase 데이터베이스 스키마
-- Supabase 대시보드 > SQL Editor 에서 한 번에 실행하세요.
-- ═══════════════════════════════════════════════════════════

-- ── 확장 ─────────────────────────────────────────────────
-- pgcrypto: gen_random_uuid() 사용
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ── 1. user_portfolios ───────────────────────────────────
-- 로그인한 유저가 저장한 포트폴리오 (1 유저 : N 포트폴리오)

CREATE TABLE IF NOT EXISTS user_portfolios (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL DEFAULT '내 포트폴리오',
  initial_investment NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- 초기 원금 (KRW)
  monthly_dca        NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- 월 적립금 (KRW)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 같은 유저가 동일 이름으로 중복 저장 방지 (upsert용)
  UNIQUE (user_id, name)
);

-- 유저별 포트폴리오 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id
  ON user_portfolios (user_id);


-- ── 2. portfolio_items ───────────────────────────────────
-- 포트폴리오에 담긴 종목 (1 포트폴리오 : N 종목, 최대 10개)

CREATE TABLE IF NOT EXISTS portfolio_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id   UUID        NOT NULL REFERENCES user_portfolios(id) ON DELETE CASCADE,
  ticker         TEXT        NOT NULL,        -- 예: "TSLA"
  name           TEXT        NOT NULL,        -- 예: "Tesla"
  weight         NUMERIC(6, 2) NOT NULL,      -- 소수점 비중(%), 예: 34.50
  sort_order     INT         NOT NULL DEFAULT 0,

  CONSTRAINT chk_weight_range CHECK (weight > 0 AND weight <= 100)
);

-- 포트폴리오별 종목 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_portfolio_items_portfolio_id
  ON portfolio_items (portfolio_id);


-- ── 3. RLS (Row Level Security) ──────────────────────────
-- 본인 데이터만 읽기/쓰기 가능하도록 강제

ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items  ENABLE ROW LEVEL SECURITY;

-- user_portfolios: 본인 행만 접근
CREATE POLICY "portfolios_owner_only" ON user_portfolios
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- portfolio_items: 부모 portfolio가 본인 것인 행만 접근
CREATE POLICY "items_owner_only" ON portfolio_items
  USING (
    portfolio_id IN (
      SELECT id FROM user_portfolios WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM user_portfolios WHERE user_id = auth.uid()
    )
  );


-- ── 4. updated_at 자동 갱신 트리거 ────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_portfolios_updated_at
  BEFORE UPDATE ON user_portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 5. Supabase Auth 소셜 로그인 설정 안내 (주석) ──────────
/*
  [Google OAuth]
  Supabase 대시보드 > Authentication > Providers > Google
  - Google Cloud Console에서 OAuth 2.0 클라이언트 생성
  - Authorized redirect URI:
      https://<your-project>.supabase.co/auth/v1/callback
  - Client ID / Client Secret을 Supabase에 입력

  [Kakao OAuth]
  Supabase 대시보드 > Authentication > Providers > Kakao
  - Kakao Developers에서 앱 생성 후 REST API 키 / Secret 입력
  - Kakao 로그인 > Redirect URI:
      https://<your-project>.supabase.co/auth/v1/callback
  - 동의 항목: 닉네임, 프로필 사진, 이메일(선택) 활성화

  [환경변수 (.env.local)]
  NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
*/

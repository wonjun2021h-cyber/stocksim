-- feedbacks 테이블 수정 (id, created_at만 있는 경우 포함)
-- Supabase 대시보드 > SQL Editor 에서 실행

-- 1) 필수 컬럼 추가
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) 테이블이 아예 없을 때
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  content    TEXT        NOT NULL CHECK (char_length(trim(content)) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) RLS + insert 권한
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedbacks_insert_public" ON public.feedbacks;
CREATE POLICY "feedbacks_insert_public" ON public.feedbacks
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

GRANT INSERT ON TABLE public.feedbacks TO anon, authenticated;

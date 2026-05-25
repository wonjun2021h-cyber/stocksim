# Supabase 로그인 설정

로그인이 동작하려면 **Supabase 프로젝트**와 **`.env.local`** 이 둘 다 필요합니다.

## 1. `.env.local` 만들기

프로젝트 루트에서:

```bash
cp .env.example .env.local
```

Supabase 대시보드 → **Settings → API** 에서 아래 값을 복사해 넣습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...   # 포트폴리오 API용 (선택)
```

저장 후 **개발 서버를 다시 시작**하세요 (`npm run dev`).

## 2. Supabase URL 허용 목록

**Authentication → URL Configuration**

| 항목 | 예시 |
|------|------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/callback` |

휴대폰에서 테스트할 때는 PC IP도 추가합니다.

- `http://192.168.0.10:3000/auth/callback`

## 3. Google / 카카오 OAuth

**Authentication → Providers** 에서 Google·Kakao를 켜고 Client ID/Secret을 입력합니다.

각 제공자 콘솔의 Redirect URI는 Supabase가 안내하는 주소를 사용합니다.

```
https://<project-ref>.supabase.co/auth/v1/callback
```

## 4. DB 테이블 (포트폴리오·의견)

SQL Editor에서 순서대로 실행:

1. `supabase/schema.sql`
2. `supabase/feedback_schema.sql`

## 확인

`.env.local` 적용 후 Google/카카오 로그인 → `/auth/callback` → 원래 페이지로 돌아오면 성공입니다.

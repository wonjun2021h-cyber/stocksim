# Google 로그인 — 이 순서만

## 가장 많이 틀리는 것 (Unable to exchange external code)

**Google Cloud** 의 리디렉션 URI는 **localhost가 아닙니다.**

반드시 이 주소만 넣으세요:

```
https://echwdojqomzzlrpzujil.supabase.co/auth/v1/callback
```

Supabase **Redirect URLs** 에는 이것만:

```
http://localhost:3000/auth/callback
```

---

## 0단계. Google Cloud — 프로젝트 만들기

1. https://console.cloud.google.com  
2. **프로젝트 만들기** → 이름 `StockSim` → **만들기**

---

## 1단계. Google — OAuth 클라이언트

1. https://console.cloud.google.com/apis/credentials  
2. **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**  
3. **웹 애플리케이션**  
4. **승인된 리디렉션 URI** (위 박스 주소 **그대로**):

   `https://echwdojqomzzlrpzujil.supabase.co/auth/v1/callback`

5. **만들기** → **클라이언트 ID** + **클라이언트 보안 비밀번호** 복사

---

## 2단계. Supabase

1. https://supabase.com/dashboard → 프로젝트  
2. **Authentication** → **Providers** → **Google** → Enable  
3. Client ID / Secret 붙여넣기 → **Save**  
4. **URL Configuration** → Redirect URLs:

   `http://localhost:3000/auth/callback`

   → **Save**

---

## 3단계. Google 테스트 사용자 (테스트 모드일 때)

OAuth 동의 화면이 **테스트**면, 로그인할 **Gmail**을 **테스트 사용자**에 추가해야 합니다.

## 4단계. 앱

1. `npm run dev` (껐다가 다시)
2. 반드시 **`http://localhost:3000`** (127.0.0.1 / 휴대폰 IP 말고 PC에서)
3. Google 로그인

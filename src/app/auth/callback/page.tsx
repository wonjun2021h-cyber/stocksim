"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { readAuthNextPath } from "@/lib/auth-redirect";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("로그인 처리 중...");

  useEffect(() => {
    const fromQuery = searchParams.get("next");
    const safeNext = readAuthNextPath(
      fromQuery?.startsWith("/") ? fromQuery : "/"
    );

    const errorDescription = searchParams.get("error_description");
    const errorCode = searchParams.get("error");
    if (errorDescription || errorCode) {
      router.replace("/auth/error");
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      router.replace("/auth/error");
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setMessage("로그인에 실패했습니다.");
        router.replace("/auth/error");
        return;
      }
      router.replace(safeNext);
    });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-6">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page flex items-center justify-center px-6">
          <p className="text-sm text-muted">로그인 처리 중...</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}

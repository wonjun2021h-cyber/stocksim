"use client";

import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto gap-5">
      <h1 className="text-lg font-bold text-ink">로그인 실패</h1>
      <p className="text-sm text-muted leading-relaxed">
        Google 로그인에 실패했습니다.
        <br />
        잠시 후 다시 시도해 주세요.
      </p>
      <Link
        href="/"
        className="text-sm text-orange-500 font-medium hover:underline"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}

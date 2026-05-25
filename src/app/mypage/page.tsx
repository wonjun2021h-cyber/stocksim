"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import { MyPortfolioList } from "@/components/mypage/MyPortfolioList";
import { FeedbackForm } from "@/components/mypage/FeedbackForm";
import { useState } from "react";

export default function MyPage() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <header className="flex items-center pr-4 md:pr-6">
        <Navbar />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 md:px-6 py-8 pb-24">
        <h1 className="text-xl font-bold text-ink mb-1">마이페이지</h1>
        <p className="text-xs text-subtle mb-8">
          저장한 포트폴리오와 서비스 의견을 관리합니다.
        </p>

        {loading ? (
          <p className="text-sm text-muted text-center py-12">확인 중...</p>
        ) : !user ? (
          <div className="rounded-2xl bg-panel border border-line p-8 text-center">
            <p className="text-sm text-muted mb-4">
              포트폴리오 저장과 의견 보내기는 로그인 후 이용할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="px-5 py-2.5 rounded-full bg-ink text-panel text-sm font-bold hover:opacity-80"
            >
              로그인하기
            </button>
            <p className="text-xs text-faint mt-6">
              <Link href="/request-stock" className="text-orange-500 hover:underline">
                종목 추가 요청
              </Link>
              은 로그인 없이도 가능합니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <section>
              <h2 className="text-sm font-bold text-ink mb-3">저장한 포트폴리오</h2>
              <MyPortfolioList />
            </section>

            <section>
              <h2 className="text-sm font-bold text-ink mb-1">의견 보내기</h2>
              <p className="text-xs text-faint mb-3">로그인한 계정으로만 접수됩니다.</p>
              <FeedbackForm />
            </section>

            <p className="text-xs text-faint text-center">
              찾는 종목이 없나요?{" "}
              <Link href="/request-stock" className="text-orange-500 font-medium hover:underline">
                종목 추가 요청하기
              </Link>
            </p>
          </div>
        )}
      </main>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason="마이페이지를 이용하려면 로그인이 필요합니다."
        redirectAfterLogin="/mypage"
      />
    </div>
  );
}

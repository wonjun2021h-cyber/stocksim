import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { StockRequestForm } from "@/components/request/StockRequestForm";

export const metadata = {
  title: "종목 추가 요청 — StockSim",
  description: "검색되지 않는 주식·ETF 티커를 요청하세요. 로그인 없이 제출할 수 있습니다.",
};

export default function RequestStockPage() {
  return (
    <div className="min-h-screen bg-page flex flex-col">
      <header className="flex items-center pr-4 md:pr-6">
        <Navbar />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 md:px-6 py-8 pb-24">
        <h1 className="text-xl font-bold text-ink mb-1">종목 추가 요청</h1>
        <p className="text-xs text-subtle mb-8">
          검색에 없는 티커를 알려 주시면 데이터에 반영 검토합니다. 로그인 없이도 제출할 수
          있습니다.
        </p>

        <div className="rounded-2xl bg-panel border border-line dark:border-transparent p-5">
          <StockRequestForm />
        </div>

        <p className="text-xs text-faint text-center mt-8">
          <Link href="/mypage" className="text-muted hover:text-ink">
            ← 마이페이지
          </Link>
          {" · "}
          <Link href="/" className="text-muted hover:text-ink">
            홈으로
          </Link>
        </p>
      </main>
    </div>
  );
}

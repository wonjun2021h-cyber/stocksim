import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = { title: "면책 공고 — StockSim" };

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center pr-6">
        <Navbar />
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-ink mb-1">면책 공고</h1>
        <p className="text-xs text-faint mb-8">최종 업데이트: 2025년 1월 1일</p>

        <Section title="투자 정보 면책">
          StockSim에서 제공하는 모든 정보(주가 데이터, 시뮬레이션 결과, 뉴스 등)는 오직 <strong>정보 제공 및 교육 목적</strong>으로만 제공됩니다. 본 서비스의 어떠한 내용도 투자 권유, 매매 추천, 투자 자문으로 해석되어서는 안 됩니다.
        </Section>

        <Section title="과거 성과 면책">
          본 서비스에서 제공하는 시뮬레이션 결과는 <strong>과거 데이터에 기반한 가상의 수치</strong>입니다. 과거의 수익률이 미래의 수익을 보장하지 않습니다. 실제 투자 결과는 시뮬레이션 결과와 크게 다를 수 있습니다.
        </Section>

        <Section title="데이터 정확성 면책">
          본 서비스에서 제공하는 주가 데이터, 환율, 지수 정보는 최대한 정확하게 제공하려 노력하나, 데이터의 정확성, 완전성, 최신성을 보장하지 않습니다. 데이터 오류, 지연, 누락으로 인한 손해에 대해 운영자는 책임을 지지 않습니다.
        </Section>

        <Section title="투자 손실 면책">
          본 서비스를 참고하여 내린 투자 결정 및 그로 인해 발생하는 모든 손실, 손해, 비용에 대한 책임은 전적으로 이용자 본인에게 있습니다. 운영자는 어떠한 형태의 투자 손실에 대해서도 법적 책임을 지지 않습니다.
        </Section>

        <Section title="외부 링크 면책">
          본 서비스는 외부 뉴스 사이트 등 제3자 콘텐츠로의 링크를 포함할 수 있습니다. 해당 외부 콘텐츠의 정확성, 신뢰성, 적법성에 대해 운영자는 책임을 지지 않습니다.
        </Section>

        <div className="mt-10 pt-6 border-t border-line">
          <Link href="/" className="text-xs text-faint hover:text-muted transition-colors">← 홈으로</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-semibold text-ink mb-2">{title}</h2>
      <p className="text-sm text-muted leading-relaxed">{children}</p>
    </section>
  );
}

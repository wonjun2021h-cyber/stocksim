import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = { title: "이용약관 — StockSim" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center pr-6">
        <Navbar />
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12 prose-custom">
        <h1 className="text-2xl font-bold text-ink mb-1">이용약관</h1>
        <p className="text-xs text-faint mb-8">최종 업데이트: 2025년 1월 1일</p>

        <Section title="제1조 (목적)">
          본 약관은 StockSim(이하 &quot;서비스&quot;)이 제공하는 주식 투자 시뮬레이션 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (서비스 이용)">
          본 서비스는 회원 가입 없이 누구나 무료로 이용할 수 있습니다. 서비스는 과거 주가 데이터를 기반으로 한 시뮬레이션 결과를 제공하며, 실제 투자 결과와 다를 수 있습니다.
        </Section>

        <Section title="제3조 (서비스 변경 및 중단)">
          운영자는 서비스의 내용, 기능, 제공 방식을 사전 고지 없이 변경하거나 중단할 수 있습니다. 이로 인해 발생하는 손해에 대해 운영자는 책임을 지지 않습니다.
        </Section>

        <Section title="제4조 (저작권)">
          서비스 내 제공되는 콘텐츠, 디자인, UI 등의 저작권은 운영자에게 있습니다. 이용자는 서비스를 통해 얻은 정보를 운영자의 사전 동의 없이 상업적으로 이용할 수 없습니다.
        </Section>

        <Section title="제5조 (면책)">
          본 서비스에서 제공하는 정보는 투자 참고용이며, 투자 권유 또는 자문에 해당하지 않습니다. 시뮬레이션 결과를 바탕으로 한 투자 손실에 대해 운영자는 일체의 책임을 지지 않습니다.
        </Section>

        <Section title="제6조 (준거법)">
          본 약관은 대한민국 법률에 따라 해석되며, 서비스 이용과 관련한 분쟁은 대한민국 법원을 전속 관할 법원으로 합니다.
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

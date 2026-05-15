import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = { title: "개인정보 처리방침 — StockSim" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center pr-6">
        <Navbar />
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-ink mb-1">개인정보 처리방침</h1>
        <p className="text-xs text-faint mb-8">최종 업데이트: 2025년 1월 1일</p>

        <Section title="1. 개요">
          StockSim(이하 &quot;서비스&quot;)은 이용자의 개인정보를 중요하게 여깁니다. 본 서비스는 회원 가입이 없으며, 별도의 개인 식별 정보를 수집하지 않습니다. 본 방침은 서비스 이용 과정에서 자동으로 수집될 수 있는 데이터에 대해 설명합니다.
        </Section>

        <Section title="2. 수집하는 정보">
          본 서비스는 다음과 같은 정보를 수집할 수 있습니다.
          <ul>
            <li><strong>자동 수집 데이터:</strong> 방문 페이지, 브라우저 유형, 운영체제, IP 주소, 접속 시간 등 서버 로그 정보</li>
            <li><strong>로컬 스토리지:</strong> 시뮬레이션 설정값(투자 금액, 주기, 기간)을 사용자의 브라우저에 로컬로 저장합니다. 이 데이터는 서버로 전송되지 않습니다.</li>
            <li><strong>쿠키 및 광고 데이터:</strong> 본 서비스는 Google AdSense를 통한 광고를 게재할 수 있으며, 이 과정에서 Google이 쿠키를 사용할 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="3. Google AdSense 및 제3자 광고">
          본 서비스는 Google AdSense를 사용하여 광고를 게재합니다. Google은 쿠키를 사용하여 이용자의 이전 방문 기록에 기반한 맞춤형 광고를 제공할 수 있습니다.
          <ul>
            <li>Google의 광고 쿠키 사용을 통해 관심 기반 광고가 게재될 수 있습니다.</li>
            <li>이용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-accent-down hover:underline">Google 광고 설정</a>에서 맞춤 광고를 비활성화할 수 있습니다.</li>
            <li>Google의 개인정보 처리방침은 <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-down hover:underline">policies.google.com/privacy</a>에서 확인할 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="4. 정보의 이용 목적">
          수집된 정보는 다음 목적으로 사용됩니다.
          <ul>
            <li>서비스 제공 및 운영</li>
            <li>서비스 이용 분석 및 개선</li>
            <li>광고 게재 및 관련 서비스 운영</li>
          </ul>
        </Section>

        <Section title="5. 정보 보유 및 파기">
          로컬 스토리지에 저장된 데이터는 이용자가 브라우저 데이터를 삭제할 때까지 해당 기기에만 보관됩니다. 서비스 운영자는 해당 데이터에 접근할 수 없습니다.
        </Section>

        <Section title="6. 제3자 링크">
          본 서비스는 외부 뉴스 기사 등 제3자 웹사이트로의 링크를 포함할 수 있습니다. 해당 웹사이트의 개인정보 처리방침에 대해 본 서비스는 책임을 지지 않습니다.
        </Section>

        <Section title="7. 아동 개인정보">
          본 서비스는 만 14세 미만 아동으로부터 의도적으로 개인정보를 수집하지 않습니다.
        </Section>

        <Section title="8. 방침 변경">
          본 개인정보 처리방침은 법령 또는 서비스 변경에 따라 업데이트될 수 있습니다. 변경 시 해당 페이지 상단의 날짜를 통해 고지합니다.
        </Section>

        <Section title="9. 문의">
          개인정보 처리방침에 관한 문의는 서비스 내 문의 채널을 통해 연락해 주시기 바랍니다.
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
      <div className="text-sm text-muted leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}

import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line py-6 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-faint">
          © {year} StockSim. 본 서비스는 투자 참고용이며 투자 권유가 아닙니다.
        </p>
        <nav className="flex items-center gap-4">
          {[
            { label: "종목 추가 요청", href: "/request-stock" },
            { label: "이용약관", href: "/terms" },
            { label: "개인정보 처리방침", href: "/privacy" },
            { label: "면책 공고", href: "/disclaimer" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-[11px] text-faint hover:text-muted transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

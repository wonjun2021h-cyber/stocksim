/** 만 미만 구간 — 천·백·십 단위 (예: 5500 → 5천5백원) */
function formatCheonBaek(v: number): string {
  if (v <= 0) return "";
  if (v < 1000) return `${v.toLocaleString("ko-KR")}`;

  const parts: string[] = [];
  let rest = v;

  const cheon = Math.floor(rest / 1000);
  rest %= 1000;
  if (cheon > 0) parts.push(`${cheon}천`);

  const baek = Math.floor(rest / 100);
  rest %= 100;
  if (baek > 0) parts.push(`${baek}백`);

  const sip = Math.floor(rest / 10);
  rest %= 10;
  if (sip > 0) parts.push(`${sip}십`);

  if (rest > 0) parts.push(`${rest}`);

  return parts.join("");
}

/** 억 미만 구간 — 만·천·백 (접미사 '원' 없음) */
function formatBelowEok(v: number): string {
  if (v >= 10_000) {
    const man = Math.floor(v / 10_000);
    const rest = v % 10_000;
    if (rest === 0) return `${man}만`;
    return `${man}만${formatCheonBaek(rest)}`;
  }
  return formatCheonBaek(v);
}

/** 한국어 금액 표시 (억·만·천·백) */
export function fmtKRW(n: number): string {
  if (!n || isNaN(n)) return "";

  const sign = n < 0 ? "-" : "";
  const v = Math.round(Math.abs(n));

  if (v >= 100_000_000) {
    const eok = Math.floor(v / 100_000_000);
    const rest = v % 100_000_000;
    if (rest === 0) return `${sign}${eok}억원`;
    return `${sign}${eok}억${formatBelowEok(rest)}원`;
  }

  if (v >= 10_000) {
    const man = Math.floor(v / 10_000);
    const rest = v % 10_000;
    if (rest === 0) return `${sign}${man}만원`;
    return `${sign}${man}만${formatCheonBaek(rest)}원`;
  }

  const body = formatCheonBaek(v);
  return body ? `${sign}${body}원` : "";
}

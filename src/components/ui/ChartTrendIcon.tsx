/** 상승 차트 아이콘 (색상은 부모의 text-* 클래스로 지정) */
export function ChartTrendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 17 9 11 13 15 21 7" />
      <path d="M16 7h5v5" />
    </svg>
  );
}

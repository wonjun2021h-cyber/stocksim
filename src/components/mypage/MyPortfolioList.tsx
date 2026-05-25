"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserPortfolios, deletePortfolio, renamePortfolio } from "@/lib/supabase";
import type { DBPortfolio, DBPortfolioItem, BacktestResponse, PortfolioItem } from "@/lib/portfolio-types";
import { PortfolioResultDashboard } from "@/components/backtest/PortfolioResultDashboard";

type PortfolioRow = DBPortfolio & { portfolio_items: DBPortfolioItem[] };

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

/* ── 인라인 이름 편집 컴포넌트 ──────────────────────── */
function EditableName({
  portfolioId,
  userId,
  initialName,
  onRenamed,
}: {
  portfolioId: string;
  userId: string;
  initialName: string;
  onRenamed: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setValue(initialName);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialName) {
      setEditing(false);
      return;
    }
    try {
      setSaving(true);
      await renamePortfolio(portfolioId, userId, trimmed);
      onRenamed(trimmed);
      setEditing(false);
    } catch {
      /* 실패 시 그냥 닫기 */
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="text-sm font-bold text-ink bg-elevated rounded-lg px-2 py-0.5 outline-none border border-ring w-full min-w-0"
        />
        {saving && (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-ink/30 border-t-ink animate-spin shrink-0" />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group flex items-center gap-1.5 min-w-0 text-left"
    >
      <h3 className="text-sm font-bold text-ink truncate">{initialName}</h3>
      {/* 토스 스타일 연필 아이콘 */}
      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-faint group-hover:text-muted group-hover:bg-elevated transition-colors">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
        </svg>
      </span>
    </button>
  );
}

/* ── 메인 목록 컴포넌트 ─────────────────────────────── */
export function MyPortfolioList() {
  const { user } = useAuth();
  const [list, setList] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [resultMap, setResultMap] = useState<Record<string, BacktestResponse | "loading" | "error">>({});

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    fetchUserPortfolios(user.id)
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleViewResult(pf: PortfolioRow) {
    if (viewingId === pf.id) { setViewingId(null); return; }
    setViewingId(pf.id);
    if (resultMap[pf.id]) return;

    setResultMap((prev) => ({ ...prev, [pf.id]: "loading" }));

    const items: PortfolioItem[] = pf.portfolio_items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((it) => ({ ticker: it.ticker, name: it.name, weight: Number(it.weight) }));

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialInvestment: Number(pf.initial_investment),
          monthlyDCA: Number(pf.monthly_dca),
          durationYears: 10,
          items,
        }),
      });
      if (!res.ok) throw new Error();
      const data: BacktestResponse = await res.json();
      setResultMap((prev) => ({ ...prev, [pf.id]: data }));
    } catch {
      setResultMap((prev) => ({ ...prev, [pf.id]: "error" }));
    }
  }

  async function handleDelete(id: string) {
    if (!user || !confirm("이 포트폴리오를 삭제할까요?")) return;
    setDeletingId(id);
    try {
      await deletePortfolio(id, user.id);
      setList((prev) => prev.filter((p) => p.id !== id));
      setResultMap((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch {
      alert("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="text-sm text-muted py-8 text-center">불러오는 중...</p>;

  if (error) {
    return (
      <div className="rounded-2xl bg-danger-bg border border-danger-border px-4 py-3 text-sm text-danger-text">
        {error}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl bg-panel border border-line p-6 text-center">
        <p className="text-sm text-muted mb-4">저장된 포트폴리오가 없습니다.</p>
        <Link
          href="/backtest"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-panel text-sm font-bold hover:opacity-80"
        >
          포트폴리오 만들기
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {list.map((pf) => {
        const isOpen = viewingId === pf.id;
        const res = resultMap[pf.id];

        return (
          <li key={pf.id} className="rounded-2xl bg-panel border border-line dark:border-transparent overflow-hidden">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  {user && (
                    <EditableName
                      portfolioId={pf.id}
                      userId={user.id}
                      initialName={pf.name}
                      onRenamed={(newName) =>
                        setList((prev) =>
                          prev.map((p) => p.id === pf.id ? { ...p, name: newName } : p)
                        )
                      }
                    />
                  )}
                  <p className="text-xs text-subtle">
                    원금 {formatKRW(Number(pf.initial_investment))}원 · 월 적립{" "}
                    {formatKRW(Number(pf.monthly_dca))}원
                  </p>
                  <p className="text-[11px] text-faint">
                    {new Date(pf.updated_at).toLocaleDateString("ko-KR")} 저장
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewResult(pf)}
                    className="text-xs text-orange-500 font-semibold hover:underline"
                  >
                    {isOpen ? "접기" : "결과 보기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pf.id)}
                    disabled={deletingId === pf.id}
                    className="text-xs text-danger-text hover:underline disabled:opacity-50"
                  >
                    {deletingId === pf.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {pf.portfolio_items
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <span
                      key={item.id}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-elevated text-ink border border-line"
                    >
                      {item.ticker} {Number(item.weight).toFixed(0)}%
                    </span>
                  ))}
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-line px-2 py-4">
                {res === "loading" && (
                  <div className="flex flex-col gap-3 animate-pulse px-2">
                    <div className="h-48 rounded-xl bg-elevated" />
                    <div className="h-32 rounded-xl bg-elevated" />
                  </div>
                )}
                {res === "error" && (
                  <p className="text-sm text-danger-text text-center py-6">
                    결과를 불러오지 못했습니다. 다시 시도해 주세요.
                  </p>
                )}
                {res && res !== "loading" && res !== "error" && (
                  <PortfolioResultDashboard
                    result={res}
                    onSave={() => {}}
                    isSaving={false}
                    hideSaveButton
                    compact
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

"""
포트폴리오 백테스팅 엔진 (Python)
──────────────────────────────────────────────────────────────────────
이 스크립트는 백테스팅 연산 로직을 Python으로 구현합니다.
Next.js API 라우트의 TypeScript 버전과 동일한 로직을 공유하며,
데이터 전처리·검증·배치 연산에 활용할 수 있습니다.

사용 예:
    python backtest_engine.py \
        --tickers TSLA NVDA AAPL \
        --weights 50.0 34.5 15.5 \
        --initial 10000000 \
        --monthly 300000 \
        --years 10

요구사항:
    pip install pandas numpy

──────────────────────────────────────────────────────────────────────
"""

import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

try:
    import pandas as pd
    import numpy as np
except ImportError:
    raise SystemExit("pandas와 numpy가 필요합니다: pip install pandas numpy")

# ── 설정 ─────────────────────────────────────────────────

TARGET_HISTORY_YEARS = 12
DATA_DIR = Path(__file__).parent.parent / "public" / "data" / "stocks"


# ── 데이터 로더 ───────────────────────────────────────────

def load_stock_history(ticker: str) -> Optional[pd.DataFrame]:
    """
    public/data/stocks/{TICKER}.json 파일에서 주가 히스토리를 로드합니다.
    
    Returns:
        DataFrame with columns [date (DatetimeIndex), close], or None if not found.
    """
    path = DATA_DIR / f"{ticker.upper()}.json"
    if not path.exists():
        return None

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    history = data.get("history", [])
    if not history:
        return None

    df = pd.DataFrame(history)
    df["date"] = pd.to_datetime(df["date"])
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df = df.dropna(subset=["close"])
    df = df[df["close"] > 0]
    df = df.sort_values("date").set_index("date")

    return df


def forward_fill_daily(df: pd.DataFrame) -> pd.DataFrame:
    """
    미국 증시 휴장일(주말·공휴일)로 인해 빠진 날짜를 Forward Fill로 채웁니다.
    
    실제 데이터가 있는 날짜만 포함된 df를 받아
    달력 기준 일별 완전한 시계열로 확장합니다.
    """
    if df.empty:
        return df

    full_index = pd.date_range(df.index.min(), df.index.max(), freq="D")
    df = df.reindex(full_index)
    df["close"] = df["close"].ffill()
    return df


def resample_to_monthly(df: pd.DataFrame) -> pd.DataFrame:
    """일별 주가를 월말 종가 기준으로 월별 집계합니다."""
    return df["close"].resample("ME").last().dropna().to_frame()


# ── 포트폴리오 블렌드 ─────────────────────────────────────

def build_blended_returns(
    monthly_dfs: list[pd.DataFrame],
    weights: list[float],
) -> pd.DataFrame:
    """
    종목별 월별 종가 DataFrame 리스트와 비중을 받아
    포트폴리오 월별 수익률 시계열을 계산합니다.
    
    - 상장 이전 기간: 해당 종목 제외 후 나머지 비중 재조정
    - 반환: DataFrame with column 'portfolio_return' (월별 수익률, 예: 0.03 = +3%)
    """
    if not monthly_dfs:
        return pd.DataFrame()

    # 모든 종목의 공통 날짜 범위 (가장 이른 시작일 ~ 가장 늦은 종료일)
    all_dates = sorted(
        set().union(*[set(df.index) for df in monthly_dfs])
    )

    if not all_dates:
        return pd.DataFrame()

    result = []

    for i in range(1, len(all_dates)):
        prev_date = all_dates[i - 1]
        curr_date = all_dates[i]

        weighted_return = 0.0
        active_weight = 0.0

        for df, w in zip(monthly_dfs, weights):
            if prev_date not in df.index or curr_date not in df.index:
                continue
            prev_close = df.loc[prev_date, "close"]
            curr_close = df.loc[curr_date, "close"]

            if prev_close <= 0:
                continue

            monthly_return = curr_close / prev_close - 1
            weighted_return += (w / 100) * monthly_return
            active_weight += w / 100

        # 활성 종목 비중으로 정규화
        normalized = weighted_return / active_weight if active_weight > 0 else 0.0
        result.append({"date": curr_date, "portfolio_return": normalized})

    if not result:
        return pd.DataFrame()

    df_result = pd.DataFrame(result).set_index("date")
    return df_result


# ── DCA 시뮬레이션 ────────────────────────────────────────

def simulate_dca_curve(
    portfolio_returns: pd.DataFrame,
    start_idx: int,
    window_months: int,
    initial_investment: float,
    monthly_dca: float,
) -> tuple[list[dict], float]:
    """
    DCA(달러 비용 평균법) 누적 자산 곡선을 계산합니다.
    
    Args:
        portfolio_returns: 월별 포트폴리오 수익률 DataFrame
        start_idx: 슬라이싱 시작 인덱스
        window_months: 시뮬레이션 기간(월)
        initial_investment: 초기 원금 (KRW)
        monthly_dca: 월 적립금 (KRW)
    
    Returns:
        (curve: list of {date, value}, final_value: float)
    """
    slice_df = portfolio_returns.iloc[start_idx: start_idx + window_months]

    if slice_df.empty:
        return [], initial_investment

    curve = []
    value = initial_investment

    for i, (date, row) in enumerate(slice_df.iterrows()):
        r = row["portfolio_return"]

        if not np.isfinite(r):
            r = 0.0

        if i == 0:
            value = initial_investment * (1 + r)
        else:
            value = (value + monthly_dca) * (1 + r)

        value = max(0.0, value)
        curve.append({
            "date": date.strftime("%Y-%m"),
            "value": round(value),
        })

    final_value = curve[-1]["value"] if curve else initial_investment
    return curve, final_value


# ── 시나리오 탐색 ─────────────────────────────────────────

def find_scenarios(
    portfolio_returns: pd.DataFrame,
    window_months: int,
    initial_investment: float,
    monthly_dca: float,
) -> dict:
    """
    슬라이딩 윈도우로 최고/중앙/최악 시나리오 인덱스를 찾습니다.
    
    Returns:
        {"best_idx": int, "median_idx": int, "worst_idx": int}
    """
    n = len(portfolio_returns)
    max_start = n - window_months

    if max_start < 0:
        return {"best_idx": 0, "median_idx": 0, "worst_idx": 0}

    final_values = []
    for i in range(max_start + 1):
        _, fv = simulate_dca_curve(
            portfolio_returns, i, window_months, initial_investment, monthly_dca
        )
        final_values.append((i, fv))

    sorted_fv = sorted(final_values, key=lambda x: x[1])

    worst_idx = sorted_fv[0][0]
    best_idx = sorted_fv[-1][0]
    median_idx = sorted_fv[len(sorted_fv) // 2][0]

    return {"best_idx": best_idx, "median_idx": median_idx, "worst_idx": worst_idx}


# ── MDD 계산 ─────────────────────────────────────────────

def calc_mdd(curve: list[dict]) -> tuple[float, int]:
    """
    최대 낙폭(MDD)과 최대 회복 기간을 계산합니다.
    
    Returns:
        (mdd_pct: float, recovery_months: int)
    """
    if not curve:
        return 0.0, 0

    values = [p["value"] for p in curve]
    peak = values[0]
    mdd = 0.0
    peak_idx = 0
    max_recovery = 0
    drawdown_start = -1

    for i, v in enumerate(values[1:], 1):
        if v > peak:
            if drawdown_start >= 0:
                max_recovery = max(max_recovery, i - drawdown_start)
                drawdown_start = -1
            peak = v
            peak_idx = i
        else:
            dd = (peak - v) / peak if peak > 0 else 0
            if dd > mdd:
                mdd = dd
                if drawdown_start < 0:
                    drawdown_start = peak_idx

    return round(mdd * 1000) / 10, max_recovery


# ── 메인 함수 ─────────────────────────────────────────────

def calculate_portfolio_backtest(
    tickers: list[str],
    weights: list[float],
    initial_investment: float,
    monthly_dca: float,
    duration_years: int,
) -> dict:
    """
    포트폴리오 백테스팅 메인 함수.
    
    Args:
        tickers: 최대 10개 티커 리스트 (예: ["TSLA", "NVDA", "AAPL"])
        weights: 비중 리스트, 합계 100 (예: [50.0, 34.5, 15.5])
        initial_investment: 초기 원금 (KRW)
        monthly_dca: 월 적립금 (KRW), 0이면 일시납
        duration_years: 시뮬레이션 기간(년), 1~30
    
    Returns:
        BacktestResponse 구조와 동일한 딕셔너리
        {
            "meta": {...},
            "allocation": [...],
            "scenarios": {"best": {...}, "median": {...}, "worst": {...}},
            "portfolioMetrics": {...},
            "warnings": [...]
        }
    
    예외 처리:
        - 상장 12년 미만 종목: 상장일부터 자동 계산, SHORT_HISTORY 경고
        - 미국 증시 휴장일: Forward Fill 적용
        - NaN/Null: 0으로 처리 후 warnings에 기록
    """
    assert len(tickers) == len(weights), "tickers와 weights의 길이가 같아야 합니다."
    assert 1 <= len(tickers) <= 10, "종목은 1~10개 사이여야 합니다."

    window_months = max(12, duration_years * 12)
    target_history_months = TARGET_HISTORY_YEARS * 12

    warnings = []
    monthly_dfs = []
    valid_tickers = []
    valid_weights = []

    # ── 1단계: 종목별 데이터 로드 + Forward Fill ─────────
    for ticker, weight in zip(tickers, weights):
        df = load_stock_history(ticker)

        if df is None or df.empty:
            warnings.append({
                "ticker": ticker,
                "type": "NO_DATA",
                "message": f"{ticker} 데이터를 찾을 수 없어 포트폴리오에서 제외됩니다.",
            })
            continue

        # Forward Fill 적용 (휴장일 처리)
        df = forward_fill_daily(df)

        # 월별 집계
        monthly = resample_to_monthly(df)

        if monthly.empty:
            warnings.append({
                "ticker": ticker,
                "type": "NO_DATA",
                "message": f"{ticker} 유효한 가격 데이터가 없어 제외됩니다.",
            })
            continue

        # 상장 기간 체크
        history_months = len(monthly)
        listing_date = monthly.index.min().strftime("%Y-%m-%d")

        if history_months < target_history_months:
            warnings.append({
                "ticker": ticker,
                "type": "SHORT_HISTORY",
                "message": (
                    f"{ticker} 데이터가 "
                    f"{round(history_months / 12, 1)}년치만 존재합니다. "
                    f"상장일({listing_date})부터 계산합니다."
                ),
                "listingDate": listing_date,
            })

        monthly_dfs.append(monthly)
        valid_tickers.append(ticker)
        valid_weights.append(weight)

    if not monthly_dfs:
        return _build_empty_response(
            initial_investment, monthly_dca, duration_years, warnings
        )

    # 비중 재조정 (데이터 없는 종목 제외 후)
    weight_sum = sum(valid_weights)
    normalized_weights = [w / weight_sum * 100 for w in valid_weights]

    if len(valid_tickers) < len(tickers):
        removed = [t for t in tickers if t not in valid_tickers]
        warnings.append({
            "ticker": ", ".join(removed),
            "type": "WEIGHT_ADJUSTED",
            "message": f"제외된 종목({', '.join(removed)})의 비중이 재조정됩니다.",
        })

    # ── 2단계: 포트폴리오 월별 수익률 계산 ──────────────
    blended = build_blended_returns(monthly_dfs, normalized_weights)

    if blended.empty or len(blended) < window_months:
        # 데이터 부족 → 전체 기간 단일 시나리오
        curve, final_value = simulate_dca_curve(
            blended, 0, len(blended), initial_investment, monthly_dca
        )
        total_invested = initial_investment + monthly_dca * max(0, len(curve) - 1)
        cagr = _calc_cagr(initial_investment, monthly_dca, len(curve) / 12, final_value)
        mdd, recovery = calc_mdd(curve)

        single = {
            "label": "전체 기간 시나리오",
            "startDate": blended.index[0].strftime("%Y-%m") if not blended.empty else "",
            "finalValue": final_value,
            "gainKRW": round(final_value - total_invested),
            "gainPct": round((final_value - total_invested) / total_invested * 100, 1) if total_invested > 0 else 0,
            "cagr": round(cagr, 1),
            "curve": curve,
        }
        return _build_response(
            initial_investment, monthly_dca, duration_years,
            valid_tickers, normalized_weights,
            single, single, single,
            {"mdd": mdd, "recoveryMonths": recovery, "annualizedReturn": {"best": cagr, "median": cagr, "worst": cagr}},
            warnings,
        )

    # ── 3단계: 최고/중앙/최악 윈도우 탐색 ───────────────
    scenarios_idx = find_scenarios(
        blended, window_months, initial_investment, monthly_dca
    )

    # ── 4단계: 각 시나리오 곡선 생성 ─────────────────────
    def build_scenario(idx: int, label: str) -> dict:
        curve, final_value = simulate_dca_curve(
            blended, idx, window_months, initial_investment, monthly_dca
        )
        total_invested = initial_investment + monthly_dca * max(0, len(curve) - 1)
        cagr = _calc_cagr(initial_investment, monthly_dca, duration_years, final_value)
        return {
            "label": label,
            "startDate": blended.index[idx].strftime("%Y-%m") if idx < len(blended) else "",
            "finalValue": final_value,
            "gainKRW": round(final_value - total_invested),
            "gainPct": round((final_value - total_invested) / total_invested * 100, 1) if total_invested > 0 else 0,
            "cagr": round(cagr, 1),
            "curve": curve,
        }

    best = build_scenario(scenarios_idx["best_idx"], "최고 수익 시나리오 (Best Case)")
    median = build_scenario(scenarios_idx["median_idx"], "평균 수익 시나리오 (Median)")
    worst = build_scenario(scenarios_idx["worst_idx"], "최저 수익 시나리오 (Worst Case)")

    mdd, recovery = calc_mdd(median["curve"])

    return _build_response(
        initial_investment, monthly_dca, duration_years,
        valid_tickers, normalized_weights,
        best, median, worst,
        {
            "mdd": mdd,
            "recoveryMonths": recovery,
            "annualizedReturn": {
                "best": best["cagr"],
                "median": median["cagr"],
                "worst": worst["cagr"],
            },
        },
        warnings,
    )


# ── 내부 헬퍼 ─────────────────────────────────────────────

def _calc_cagr(
    initial: float, monthly_dca: float, years: float, final: float
) -> float:
    total = initial + monthly_dca * years * 12
    if total <= 0 or final <= 0 or years <= 0:
        return 0.0
    return (pow(final / total, 1 / years) - 1) * 100


def _build_response(
    initial_investment, monthly_dca, duration_years,
    tickers, weights,
    best, median, worst, metrics, warnings,
) -> dict:
    total_invested = initial_investment + monthly_dca * duration_years * 12
    allocation = [
        {
            "ticker": t,
            "name": t,  # 이름 정보가 있으면 여기서 채울 것
            "weight": round(w, 2),
            "value": round(w, 2),
        }
        for t, w in zip(tickers, weights)
    ]
    return {
        "meta": {
            "calculatedAt": datetime.utcnow().isoformat() + "Z",
            "initialInvestment": initial_investment,
            "monthlyDCA": monthly_dca,
            "durationYears": duration_years,
            "totalInvested": round(total_invested),
        },
        "allocation": allocation,
        "scenarios": {"best": best, "median": median, "worst": worst},
        "portfolioMetrics": metrics,
        "warnings": warnings,
    }


def _build_empty_response(initial, monthly_dca, years, warnings) -> dict:
    empty = {
        "label": "데이터 없음",
        "startDate": "",
        "finalValue": initial,
        "gainKRW": 0,
        "gainPct": 0.0,
        "cagr": 0.0,
        "curve": [],
    }
    return {
        "meta": {
            "calculatedAt": datetime.utcnow().isoformat() + "Z",
            "initialInvestment": initial,
            "monthlyDCA": monthly_dca,
            "durationYears": years,
            "totalInvested": initial,
        },
        "allocation": [],
        "scenarios": {"best": empty, "median": empty, "worst": empty},
        "portfolioMetrics": {
            "mdd": 0.0,
            "recoveryMonths": 0,
            "annualizedReturn": {"best": 0.0, "median": 0.0, "worst": 0.0},
        },
        "warnings": warnings,
    }


# ── CLI 진입점 ────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="포트폴리오 백테스팅 엔진")
    parser.add_argument(
        "--tickers", nargs="+", required=True,
        help="티커 리스트 (예: --tickers TSLA NVDA AAPL)"
    )
    parser.add_argument(
        "--weights", nargs="+", type=float, required=True,
        help="비중 리스트, 합계 100 (예: --weights 50.0 34.5 15.5)"
    )
    parser.add_argument(
        "--initial", type=float, default=10_000_000,
        help="초기 원금 (KRW, 기본: 10,000,000)"
    )
    parser.add_argument(
        "--monthly", type=float, default=300_000,
        help="월 적립금 (KRW, 기본: 300,000, 0=일시납)"
    )
    parser.add_argument(
        "--years", type=int, default=10,
        help="투자 기간 (년, 기본: 10)"
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="결과를 저장할 JSON 파일 경로 (없으면 stdout)"
    )
    args = parser.parse_args()

    result = calculate_portfolio_backtest(
        tickers=args.tickers,
        weights=args.weights,
        initial_investment=args.initial,
        monthly_dca=args.monthly,
        duration_years=args.years,
    )

    output_json = json.dumps(result, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(output_json, encoding="utf-8")
        print(f"결과 저장 완료: {args.output}")
    else:
        print(output_json)

#!/usr/bin/env python3
"""Fetch fiscal-period fundamentals for one ticker via yfinance. Prints JSON array to stdout."""
import json
import sys


def cell(df, row, col):
    try:
        v = df.loc[row, col]
        if v != v:
            return None
        return float(v)
    except Exception:
        return None


def pick(df, col, *rows):
    for row in rows:
        v = cell(df, row, col)
        if v is not None:
            return v
    return None


def periods_for_ticker(symbol: str):
    import yfinance as yf

    yahoo = symbol.replace("-", ".")
    t = yf.Ticker(yahoo)
    frames = [
        (t.quarterly_financials, t.quarterly_balance_sheet, t.quarterly_cashflow),
        (t.financials, t.balance_sheet, t.cashflow),
    ]
    by_t = {}

    for inc, bal, cf in frames:
        if inc is None or inc.empty:
            continue
        for col in inc.columns:
            tsec = int(col.timestamp())
            if tsec in by_t:
                p = by_t[tsec]
            else:
                p = {"t": tsec}
                by_t[tsec] = p
            p["rev"] = pick(inc, col, "Total Revenue", "Operating Revenue") or p.get("rev")
            p["ni"] = pick(inc, col, "Net Income", "Net Income Common Stockholders") or p.get("ni")
            p["gp"] = pick(inc, col, "Gross Profit") or p.get("gp")
            p["oi"] = pick(inc, col, "Operating Income", "EBIT", "Operating Income") or p.get("oi")
            if bal is not None and not bal.empty and col in bal.columns:
                p["eq"] = pick(bal, col, "Stockholders Equity", "Common Stock Equity") or p.get("eq")
                p["debt"] = pick(bal, col, "Total Debt") or p.get("debt")
                p["ca"] = pick(bal, col, "Current Assets") or p.get("ca")
                p["cl"] = pick(bal, col, "Current Liabilities") or p.get("cl")
                p["sh"] = pick(
                    bal, col, "Ordinary Shares Number", "Share Issued", "Common Stock Shares Outstanding"
                ) or p.get("sh")
                p["ta"] = pick(bal, col, "Total Assets") or p.get("ta")
            if cf is not None and not cf.empty and col in cf.columns:
                p["fcf"] = pick(cf, col, "Free Cash Flow") or p.get("fcf")

    out = [by_t[k] for k in sorted(by_t.keys(), reverse=True)]
    cleaned = []
    for p in out:
        row = {"t": p["t"]}
        for key in ("rev", "ni", "gp", "oi", "eq", "debt", "ca", "cl", "fcf", "sh", "ta"):
            if p.get(key) is not None:
                row[key] = p[key]
        if len(row) > 1:
            cleaned.append(row)
    return cleaned


if __name__ == "__main__":
    sym = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
    print(json.dumps(periods_for_ticker(sym)))

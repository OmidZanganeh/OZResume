#!/usr/bin/env python3
"""
Download fiscal-period fundamentals for an index universe into Redis + local JSON.
Run: python scripts/bulk-fundamental-history.py sp500
     python scripts/bulk-fundamental-history.py nasdaq100
Requires: pip install yfinance redis
"""
import gzip
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_fundamental_one import periods_for_ticker  # noqa: E402


def load_env_local():
    p = ROOT / ".env.local"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        t = line.strip()
        if not t or t.startswith("#") or "=" not in t:
            continue
        k, _, v = t.partition("=")
        v = v.strip().strip('"').strip("'")
        os.environ.setdefault(k.strip(), v)


def fetch_symbols(universe: str):
    if universe == "nasdaq100":
        url = "https://yfiua.github.io/index-constituents/constituents-nasdaq100.csv"
    else:
        url = "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv"
    raw = urllib.request.urlopen(url, timeout=30).read().decode("utf-8")
    lines = raw.strip().splitlines()[1:]
    syms = []
    for line in lines:
        sym = line.split(",")[0].strip().replace(".", "-")
        if sym:
            syms.append(sym)
    return sorted(set(syms))


def redis_key(universe: str) -> str:
    return (
        "stock-screener:fundamental-bulk:nasdaq100:v1"
        if universe == "nasdaq100"
        else "stock-screener:fundamental-bulk:v1"
    )


def local_file(universe: str) -> Path:
    name = "nasdaq100-fundamental-bulk.json" if universe == "nasdaq100" else "sp500-fundamental-bulk.json"
    out = ROOT / "data"
    out.mkdir(exist_ok=True)
    return out / name


def main():
    load_env_local()
    universe = sys.argv[1] if len(sys.argv) > 1 else "sp500"
    symbols = fetch_symbols(universe)
    print(f"Universe: {universe} ({len(symbols)} symbols)")

    data = {}
    failed = []
    for i, sym in enumerate(symbols, 1):
        try:
            periods = periods_for_ticker(sym)
            if periods:
                data[sym] = periods
            else:
                failed.append(sym)
        except Exception as e:
            failed.append(sym)
            print(f"  fail {sym}: {e}")
        if i % 25 == 0 or i == len(symbols):
            print(f"  {i}/{len(symbols)} — {len(data)} with data")
        time.sleep(0.35)

    store = {
        "cachedAt": datetime.now(timezone.utc).isoformat(),
        "complete": len(data) >= len(symbols) - len(failed),
        "data": data,
    }

    path = local_file(universe)
    path.write_text(json.dumps(store), encoding="utf-8")
    print(f"\nLocal: {path} ({len(data)} tickers)")

    redis_url = os.environ.get("REDIS_URL", "").strip()
    if redis_url:
        import redis

        r = redis.from_url(redis_url)
        payload = gzip.compress(json.dumps(store).encode("utf-8"))
        r.setex(redis_key(universe), 21 * 24 * 3600, payload)
        print(f"Redis: {redis_key(universe)} ({len(payload) / 1024:.1f} KB gzip)")
    else:
        print("REDIS_URL missing — local file only")

    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed[:20])}{'…' if len(failed) > 20 else ''}")


if __name__ == "__main__":
    main()

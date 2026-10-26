#!/usr/bin/env python3
"""Supabase limits tracker: daily usage from the logs → platform_usage_daily.

Run every hour by .github/workflows/usage-monitor.yml (token in the
SUPABASE_ACCESS_TOKEN secret). Supabase has no API for the bill's usage numbers,
so the ones that come from traffic are added up from the project's logs, per
UTC day:
  cached_egress_gb  photo / file bytes served from storage's public URLs
  photo_visitors    distinct visitors who loaded them
  edge_invocations  Edge Function calls
Database size, storage size and MAU are measured live by the database itself
(platform_usage_summary). Writing calls record_platform_usage, which also sends
the admin an email when a limit gets close (check_usage_alerts).

    python3 scripts/usage-monitor.py            # yesterday + today (the hourly run)
    python3 scripts/usage-monitor.py --days 7   # backfill (the logs keep 7 days)
    python3 scripts/usage-monitor.py --dry-run  # print only, write nothing

Locally the token comes from the macOS keychain ('Supabase CLI (bach)').
"""

import datetime as dt
import json
import os
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

PROJECT = "hrosyuaehkhzhnvefhts"
API = "https://api.supabase.com/v1/projects/" + PROJECT


def token() -> str:
    t = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if t:
        return t
    return subprocess.check_output(["security", "find-generic-password", "-s", "Supabase CLI (bach)", "-w"], text=True).strip()


TOKEN = token()
CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem") if os.path.exists("/etc/ssl/cert.pem") else ssl.create_default_context()


def call(url: str, body: dict | None = None):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": "bach-usage-monitor"},
        method="POST" if body is not None else "GET",
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, context=CTX, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            # the logs API rate-limits: wait and try again
            if e.code not in (429, 500, 502, 503, 504) or attempt == 4:
                raise
            time.sleep(15 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            if attempt == 4:
                raise
            time.sleep(10)
    return None


def logs(sql: str, start: dt.datetime, end: dt.datetime) -> list[dict]:
    q = urllib.parse.urlencode({
        "sql": sql,
        "iso_timestamp_start": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "iso_timestamp_end": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
    d = call(f"{API}/analytics/endpoints/logs?{q}") or {}
    if d.get("error"):
        raise RuntimeError(f"logs query failed: {str(d['error'])[:300]}")
    return d.get("result") or []


# one query per day (the logs API is rate-limited)
DAY = """
select round(sumIf(toFloat64OrZero(log_attributes['response.headers.content_length']), photo) / 1e9, 3) as gb,
       uniqIf(log_attributes['request.headers.cf_connecting_ip'], photo) as visitors,
       countIf(source = 'function_edge_logs') as n
from (
  select source, log_attributes,
         source = 'edge_logs' and log_attributes['request.path'] like '/storage/v1/object/public/%' as photo
  from logs
  where source in ('edge_logs', 'function_edge_logs')
)
"""


def day_rows(day: dt.date) -> list[dict]:
    start = dt.datetime.combine(day, dt.time(), dt.UTC)
    end = min(start + dt.timedelta(days=1), dt.datetime.now(dt.UTC).replace(microsecond=0))
    s = (logs(DAY, start, end) or [{}])[0]
    f = s
    d = day.isoformat()
    return [
        {"day": d, "metric": "cached_egress_gb", "value": float(s.get("gb") or 0)},
        {"day": d, "metric": "photo_visitors", "value": int(s.get("visitors") or 0)},
        {"day": d, "metric": "edge_invocations", "value": int(f.get("n") or 0)},
    ]


def main():
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 2
    today = dt.datetime.now(dt.UTC).date()
    rows: list[dict] = []
    for back in range(days - 1, -1, -1):
        day = today - dt.timedelta(days=back)
        r = day_rows(day)
        rows += r
        if back:
            time.sleep(3)
        print(f"{day}  photos {r[0]['value']:.2f} GB · {r[1]['value']} visitors · {r[2]['value']} edge calls", flush=True)
    if "--dry-run" in sys.argv:
        print("dry run: nothing written")
        return
    payload = json.dumps(rows)
    call(f"{API}/database/query", {"query": f"select public.record_platform_usage($j${payload}$j$::jsonb);"})
    print(f"recorded {len(rows)} rows")


if __name__ == "__main__":
    main()

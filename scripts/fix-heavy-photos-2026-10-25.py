#!/usr/bin/env python3
"""Re-encode the product photos MGMT saved as PNG under a .webp name (2026-10-25).

Safari can't encode WebP from a canvas, so every photo uploaded from MGMT since
2026-10-05 was stored as a PNG named *.webp — ~1.2 MB per 800px file instead of
~60 KB. Phones pull hundreds of them per visit, which is what pushed Supabase
cached egress to 5x the Pro quota.

This downloads each file listed in heavy-photos-2026-10-25.json (public URL, no
key), and only if it is NOT already a WebP, re-encodes it as a real WebP (q80,
same pixel size) and uploads it back to THE SAME PATH — every link on the site
stays the same. Real WebP files are skipped untouched.

Run it on the founder's Mac (it uses the 'BACH service role' key from the
keychain; the key never appears on screen or in argv). Resumable: progress is
kept in heavy-photos-progress.json next to this script.

    python3 scripts/fix-heavy-photos-2026-10-25.py            # do it
    python3 scripts/fix-heavy-photos-2026-10-25.py --dry-run  # only count (add --limit 20 to try a few)
"""

import io
import json
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

PROJECT = "hrosyuaehkhzhnvefhts"
BASE = f"https://{PROJECT}.supabase.co/storage/v1/object"
BUCKET = "product-media"
HERE = Path(__file__).parent
LIST = HERE / "heavy-photos-2026-10-25.json"
PROGRESS = HERE / "heavy-photos-progress.json"
DRY = "--dry-run" in sys.argv
LIMIT = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None

lock = threading.Lock()
progress = json.loads(PROGRESS.read_text()) if PROGRESS.exists() else {}


def save_progress():
    with lock:
        PROGRESS.write_text(json.dumps(progress))


def curl(args, data=None):
    p = subprocess.run(["curl", "-s", "-m", "120", *args], input=data, capture_output=True)
    return p.returncode, p.stdout


def service_key() -> str:
    return subprocess.check_output(["security", "find-generic-password", "-s", "BACH service role", "-w"], text=True).strip()


KEY = None if DRY else service_key()


def fix(name: str) -> tuple[str, int, int]:
    """Returns (outcome, bytes_before, bytes_after)."""
    code, raw = curl([f"{BASE}/public/{BUCKET}/{name}"])
    if code != 0 or len(raw) < 12:
        return "download-failed", 0, 0
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "already-webp", len(raw), len(raw)
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:
        return "not-an-image", len(raw), 0
    # keep transparency only where there really is some
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        if im.getextrema()[3][0] == 255:
            im = im.convert("RGB")
    elif im.mode != "RGB":
        im = im.convert("RGB")
    out = io.BytesIO()
    im.save(out, "WEBP", quality=80, method=6)
    body = out.getvalue()
    if DRY:
        return "would-fix", len(raw), len(body)
    # headers on stdin so the key never shows in the process list
    cfg = (
        f'header = "Authorization: Bearer {KEY}"\n'
        f'header = "apikey: {KEY}"\n'
        'header = "Content-Type: image/webp"\n'
        'header = "Cache-Control: max-age=31536000"\n'
        'header = "x-upsert: true"\n'
    ).encode()
    tmp = HERE / f".heavy-{threading.get_ident()}.webp"
    tmp.write_bytes(body)
    try:
        code, resp = curl(["-X", "PUT", f"{BASE}/{BUCKET}/{name}", "--config", "-", "--data-binary", f"@{tmp}", "-w", "\n%{http_code}"], data=cfg)
    finally:
        tmp.unlink(missing_ok=True)
    status = resp.decode(errors="replace").rsplit("\n", 1)[-1]
    if code != 0 or status not in ("200", "201"):
        return f"upload-failed {status}", len(raw), 0
    return "fixed", len(raw), len(body)


def main():
    rows = json.loads(LIST.read_text())
    todo = [n for n, _ in rows if progress.get(n) not in ("fixed", "already-webp")][:LIMIT]
    print(f"{len(rows)} files listed, {len(todo)} to check{' (dry run)' if DRY else ''}")
    totals = {"before": 0, "after": 0}
    counts: dict[str, int] = {}
    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fix, n): n for n in todo}
        for f in as_completed(futures):
            name = futures[f]
            try:
                outcome, before, after = f.result()
            except Exception as e:  # keep going; it is retried on the next run
                outcome, before, after = f"error {e.__class__.__name__}", 0, 0
            counts[outcome] = counts.get(outcome, 0) + 1
            if outcome in ("fixed", "would-fix"):
                totals["before"] += before
                totals["after"] += after
            if not DRY and outcome in ("fixed", "already-webp"):
                progress[name] = outcome
            done += 1
            if done % 100 == 0:
                if not DRY:
                    save_progress()
                print(f"  {done}/{len(todo)}  {counts}", flush=True)
    if not DRY:
        save_progress()
    mb = lambda b: f"{b / 1e6:,.0f} MB"
    print(f"done: {counts}")
    print(f"photos re-encoded: {mb(totals['before'])} -> {mb(totals['after'])}")
    if any(k.startswith(("upload-failed", "download-failed", "error")) for k in counts):
        print("some files failed - run the script again, it picks up where it stopped")


if __name__ == "__main__":
    main()

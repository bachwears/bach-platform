#!/usr/bin/env python3
"""Move duplicate photos out of the photo-matching queue (2026-10-07).

The list (unmatched-duplicates-2026-10-07.json) holds files in storage
product-media/unmatched/ whose model code belongs to a product that already has
photos in that same colour on the website — old copies. Each one is MOVED to
product-media/ignored/ (nothing is deleted; move back the same way if needed).

Runs with the service_role key from the macOS keychain item 'BACH service role'
(the same one the photo upload scripts use); the key is never printed.

    python3 scripts/hide-unmatched-duplicates-2026-10-07.py          # dry run: counts only
    python3 scripts/hide-unmatched-duplicates-2026-10-07.py --go     # move them
"""
import json
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

URL = "https://hrosyuaehkhzhnvefhts.supabase.co"
BUCKET = "product-media"
LIST = pathlib.Path(__file__).with_name("unmatched-duplicates-2026-10-07.json")


def main() -> None:
    files = json.loads(LIST.read_text())
    print(f"{len(files)} duplicate photos listed")
    if "--go" not in sys.argv:
        print("dry run — add --go to move them to ignored/")
        return
    key = subprocess.check_output(["security", "find-generic-password", "-s", "BACH service role", "-w"]).decode().strip()
    moved = gone = failed = 0
    for name in files:
        body = json.dumps({"bucketId": BUCKET, "sourceKey": f"unmatched/{name}", "destinationKey": f"ignored/{name}"}).encode()
        req = urllib.request.Request(
            f"{URL}/storage/v1/object/move",
            data=body,
            method="POST",
            headers={"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"},
        )
        try:
            urllib.request.urlopen(req, timeout=30).read()
            moved += 1
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code in (400, 404) and "not found" in msg.lower():
                gone += 1  # already linked or moved since the list was made
            else:
                failed += 1
                print(f"  ! {name}: {e.code} {msg[:120]}")
    print(f"moved {moved} · already gone {gone} · failed {failed}")


if __name__ == "__main__":
    main()

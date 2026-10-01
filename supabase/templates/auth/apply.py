#!/usr/bin/env python3
"""Push the rendered Auth emails (subjects + HTML) to the production project.

Needs the Supabase access token in the macOS keychain entry 'Supabase CLI (bach)'
(see bach-platform/scripts/sb). Run build.py first.
"""

import json
import ssl
import subprocess
import time
import urllib.request
from pathlib import Path

from build import CONTENT, NOTICES, SUBJECTS

PROJECT = "hrosyuaehkhzhnvefhts"
HERE = Path(__file__).parent

token = subprocess.check_output(
    ["security", "find-generic-password", "-s", "Supabase CLI (bach)", "-w"], text=True
).strip()
ctx = ssl.create_default_context(cafile="/etc/ssl/cert.pem")
body = {}
for kind in CONTENT:
    body[f"mailer_subjects_{kind}"] = SUBJECTS[kind]
    body[f"mailer_templates_{kind}_content"] = (HERE / f"{kind}.html").read_text()
for flag in NOTICES.values():
    body[flag] = True

req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{PROJECT}/config/auth",
    data=json.dumps(body).encode(),
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "User-Agent": "bach"},
    method="PATCH",
)
for attempt in range(5):
    try:
        cfg = json.load(urllib.request.urlopen(req, context=ctx, timeout=40))
        break
    except Exception:
        if attempt == 4:
            raise
        time.sleep(4)
for kind in CONTENT:
    ok = cfg.get(f"mailer_templates_{kind}_content") == body[f"mailer_templates_{kind}_content"]
    print(f"{kind:30} subject={cfg.get(f'mailer_subjects_{kind}')!r} html={'ok' if ok else 'MISMATCH'}")
for flag in NOTICES.values():
    print(f"{flag} = {cfg.get(flag)}")

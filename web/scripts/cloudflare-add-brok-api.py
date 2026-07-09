#!/usr/bin/env python3
"""Add brok.neobanx.com A record using your logged-in Chrome Cloudflare session.

Cloudflare account for neobanx.com DNS: ronald@neobanx.com (Google Workspace SSO).
Sign in at dash.cloudflare.com in Chrome, then: npm run dns:cloudflare-api
"""
import json
import sys

import browser_cookie3
import requests

ZONE = "neobanx.com"
NAME = "brok"
IP = "76.76.21.21"

cj = browser_cookie3.chrome(domain_name="dash.cloudflare.com")
cookies = {c.name: c.value for c in cj}
headers = {"accept": "application/json", "content-type": "application/json"}

user = requests.get("https://dash.cloudflare.com/api/v4/user", cookies=cookies, headers=headers, timeout=30)
if user.status_code != 200 or not user.json().get("success"):
    print("Not logged into Cloudflare in Chrome. Open dash.cloudflare.com and sign in as ronald@neobanx.com first.")
    sys.exit(1)

email = user.json()["result"]["email"]
print(f"Cloudflare session: {email}")

zones = requests.get(
    f"https://dash.cloudflare.com/api/v4/zones?name={ZONE}",
    cookies=cookies,
    headers=headers,
    timeout=30,
).json()

zone = (zones.get("result") or [None])[0]
if not zone:
    print(f"No zone '{ZONE}' on account {email}.")
    print("Sign in with the account that owns neobanx.com (likely ronald@neobanx.com via Google).")
    sys.exit(1)

zone_id = zone["id"]
print(f"Zone found: {ZONE} ({zone_id})")

existing = requests.get(
    f"https://dash.cloudflare.com/api/v4/zones/{zone_id}/dns_records?type=A&name={NAME}.{ZONE}",
    cookies=cookies,
    headers=headers,
    timeout=30,
).json()

for rec in existing.get("result") or []:
    if rec.get("content") == IP:
        print(f"Already exists: {NAME}.{ZONE} -> {IP}")
        sys.exit(0)

payload = {"type": "A", "name": NAME, "content": IP, "ttl": 1, "proxied": False}
created = requests.post(
    f"https://dash.cloudflare.com/api/v4/zones/{zone_id}/dns_records",
    cookies=cookies,
    headers=headers,
    data=json.dumps(payload),
    timeout=30,
).json()

if not created.get("success"):
    print("Create failed:", created.get("errors"))
    sys.exit(1)

rec = created["result"]
print(f"Created: {rec['name']} -> {rec['content']} (proxied={rec.get('proxied')})")
print("Verify: dig brok.neobanx.com +short")
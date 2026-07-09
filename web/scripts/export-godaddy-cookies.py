#!/usr/bin/env python3
import json
import browser_cookie3

out = []
seen = set()
for domain in (".godaddy.com", "godaddy.com", ".sso.godaddy.com", "sso.godaddy.com"):
    try:
        for c in browser_cookie3.chrome(domain_name=domain):
            dom = c.domain if c.domain.startswith(".") else f".{c.domain}"
            key = (c.name, dom, c.path or "/")
            if key in seen:
                continue
            seen.add(key)
            if not c.name or c.value is None:
                continue
            # __Host- cookies cannot use a Domain attribute in Playwright/Chromium import
            if c.name.startswith("__Host-"):
                continue
            item = {
                "name": c.name,
                "value": c.value,
                "domain": dom,
                "path": c.path or "/",
                "secure": bool(c.secure),
                "sameSite": "Lax",
            }
            if c.expires and int(c.expires) > 0:
                item["expires"] = int(c.expires)
            out.append(item)
    except Exception:
        pass

print(json.dumps(out))
#!/usr/bin/env python3
import json
import browser_cookie3

out = []
seen = set()
for domain in (".cloudflare.com", "cloudflare.com", "dash.cloudflare.com", ".dash.cloudflare.com"):
    try:
        for c in browser_cookie3.chrome(domain_name=domain):
            if not c.name or c.value is None or c.name.startswith("__Host-"):
                continue
            dom = c.domain if c.domain.startswith(".") else f".{c.domain}"
            key = (c.name, dom, c.path or "/")
            if key in seen:
                continue
            seen.add(key)
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
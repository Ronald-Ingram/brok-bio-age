#!/usr/bin/env python3
"""
BROK farm / anomaly heartbeat — email + Telegram alerts.

Run every 5–15 minutes (cron / launchd). Exit 0 always unless hard failure.

Env (from bio-age-tool web/.env.local and/or neobanx-brok-mvp/.env / ~/.env):
  DATABASE_URL                 required
  TELEGRAM_BOT_TOKEN           optional (from BROK bot)
  BROK_ALERT_TELEGRAM_CHAT_ID  optional; default Ronald admin 6211143757
  BROK_ALERT_EMAIL             optional; default info@neobanx.com
  BROK_GMAIL_*                 for email via Gmail API (same as product)

Thresholds (override with env):
  BROK_ALERT_USERS_1H=40
  BROK_ALERT_TRIALS_1H=25
  BROK_ALERT_XFER_1H=25
  BROK_ALERT_RELEASE_1H=10
  BROK_ALERT_ZERO_TRIAL_1H=20
"""
from __future__ import annotations

import base64
import json
import os
import smtplib
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from email.mime.text import MIMEText
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "data" / "alerts" / "farm_anomaly_state.json"
ADMIN_TG_DEFAULT = "6211143757"  # Ronald Ingram (BROK telegram admin)


def load_env() -> None:
    for envp in (
        ROOT / "web" / ".env.local",
        ROOT / ".env",
        Path.home() / "neobanx-brok-mvp" / ".env",
        Path.home() / ".env",
    ):
        if not envp.exists():
            continue
        for line in envp.read_text().splitlines():
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def thr(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def metrics(conn) -> dict:
    cur = conn.cursor()
    cur.execute(
        """
        select
          (select count(*) from brok_users where created_at > now() - interval '1 hour') as users_1h,
          (select count(*) from brok_users where created_at > now() - interval '15 minutes') as users_15m,
          (select count(*) from pock_ledger where kind='trial_credit' and created_at > now() - interval '1 hour') as trials_1h,
          (select count(*) from pock_ledger where kind='transfer_out' and created_at > now() - interval '1 hour') as xfer_1h,
          (select count(*) from pock_ledger where kind='custody_release' and created_at > now() - interval '1 hour') as release_1h,
          (select count(*) from brok_users
             where created_at > now() - interval '1 hour'
               and trial_credited = true and coalesce(pock_balance,0)=0) as zero_trial_1h,
          (select count(*) from brok_users) as users_total,
          (select coalesce(bool_and(enabled), false) from brok_kill_switches
             where key in ('trial_mint','p2p_transfers')) as kills_on,
          (select count(*) from brok_users where account_frozen_at is not null) as frozen_n,
          (select count(*) from pock_ledger
             where kind='transfer_out' and created_at > now() - interval '1 hour'
               and note ilike '%%1cdaee38%%') as sink_xfer_1h
        """
    )
    row = cur.fetchone()
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, row))


def evaluate(m: dict) -> list[str]:
    alerts: list[str] = []
    if m["users_1h"] >= thr("BROK_ALERT_USERS_1H", 40):
        alerts.append(f"High wallet creates: {m['users_1h']}/hour (15m={m['users_15m']})")
    if m["trials_1h"] >= thr("BROK_ALERT_TRIALS_1H", 25):
        alerts.append(f"High trial credits: {m['trials_1h']}/hour")
    if m["xfer_1h"] >= thr("BROK_ALERT_XFER_1H", 25):
        alerts.append(f"High P2P transfer_out: {m['xfer_1h']}/hour")
    if m["release_1h"] >= thr("BROK_ALERT_RELEASE_1H", 10):
        alerts.append(f"High custody releases: {m['release_1h']}/hour")
    if m["zero_trial_1h"] >= thr("BROK_ALERT_ZERO_TRIAL_1H", 20):
        alerts.append(
            f"Farm signature: {m['zero_trial_1h']} new zero-balance trial wallets / hour"
        )
    if m["sink_xfer_1h"] and m["sink_xfer_1h"] > 0:
        alerts.append(f"Transfers mentioning sink 1cdaee38: {m['sink_xfer_1h']}/hour")
    # Kill switches intentionally OFF after reopen (min-reserve protects siphon).
    # Only warn if you set BROK_ALERT_EXPECT_KILLS_ON=1.
    expect_kills = os.getenv("BROK_ALERT_EXPECT_KILLS_ON", "").strip().lower() in (
        "1",
        "true",
        "on",
        "yes",
    )
    if expect_kills and not m["kills_on"]:
        alerts.append("WARNING: trial_mint or p2p_transfers kill switch is OFF")
    return alerts


def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text())
        except Exception:
            pass
    return {}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2))


def telegram_send(text: str) -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat = (
        os.getenv("BROK_ALERT_TELEGRAM_CHAT_ID", "").strip()
        or os.getenv("BROK_ALERT_TG_CHAT_ID", "").strip()
        or ADMIN_TG_DEFAULT
    )
    if not token or not chat:
        print("telegram: skip (no token/chat)", file=sys.stderr)
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    body = json.dumps(
        {
            "chat_id": chat,
            "text": text[:4000],
            "disable_web_page_preview": True,
        }
    ).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            ok = resp.status == 200
            print("telegram:", "ok" if ok else resp.status)
            return ok
    except Exception as e:
        print("telegram error:", e, file=sys.stderr)
        return False


def gmail_send(subject: str, body: str) -> bool:
    """Reuse BROK Gmail OAuth if configured; else optional SMTP."""
    to = (
        os.getenv("BROK_ALERT_EMAIL", "").strip()
        or os.getenv("BROK_INBOX_EMAIL", "").strip()
        or "info@neobanx.com"
    )
    client_id = os.getenv("BROK_GMAIL_CLIENT_ID", "").strip()
    client_secret = os.getenv("BROK_GMAIL_CLIENT_SECRET", "").strip()
    refresh = os.getenv("BROK_GMAIL_REFRESH_TOKEN", "").strip()
    if client_id and client_secret and refresh:
        try:
            token_res = urllib.request.urlopen(
                urllib.request.Request(
                    "https://oauth2.googleapis.com/token",
                    data=urllib.parse.urlencode(
                        {
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "refresh_token": refresh,
                            "grant_type": "refresh_token",
                        }
                    ).encode(),
                    method="POST",
                ),
                timeout=30,
            )
            access = json.loads(token_res.read().decode()).get("access_token")
            if not access:
                raise RuntimeError("no access_token")
            from_addr = os.getenv("BROK_INBOX_EMAIL", "info@neobanx.com").strip()
            raw = (
                f"From: BROK Alerts <{from_addr}>\r\n"
                f"To: {to}\r\n"
                f"Subject: {subject}\r\n"
                f"Content-Type: text/plain; charset=utf-8\r\n"
                f"\r\n{body}"
            )
            encoded = (
                base64.urlsafe_b64encode(raw.encode())
                .decode()
                .rstrip("=")
            )
            send_req = urllib.request.Request(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                data=json.dumps({"raw": encoded}).encode(),
                headers={
                    "Authorization": f"Bearer {access}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(send_req, timeout=30) as resp:
                print("gmail:", resp.status)
                return resp.status in (200, 201)
        except Exception as e:
            print("gmail error:", e, file=sys.stderr)

    # SMTP fallback
    host = os.getenv("BROK_ALERT_SMTP_HOST", "").strip()
    user = os.getenv("BROK_ALERT_SMTP_USER", "").strip()
    password = os.getenv("BROK_ALERT_SMTP_PASS", "").strip()
    if host and user and password:
        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = user
            msg["To"] = to
            ctx = ssl.create_default_context()
            with smtplib.SMTP(host, int(os.getenv("BROK_ALERT_SMTP_PORT", "587"))) as s:
                s.starttls(context=ctx)
                s.login(user, password)
                s.sendmail(user, [to], msg.as_string())
            print("smtp: ok")
            return True
        except Exception as e:
            print("smtp error:", e, file=sys.stderr)
    print("email: skip (not configured)", file=sys.stderr)
    return False


def main() -> int:
    import urllib.parse

    load_env()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL required", file=sys.stderr)
        return 1

    import psycopg2

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    try:
        m = metrics(conn)
    finally:
        conn.close()

    now = datetime.now(timezone.utc).isoformat()
    print(json.dumps({"ts": now, "metrics": m}, default=str))

    alerts = evaluate(m)
    state = load_state()
    last_key = state.get("last_alert_key")
    last_ts = float(state.get("last_alert_ts") or 0)
    cooldown = int(os.getenv("BROK_ALERT_COOLDOWN_SEC", "1800"))  # 30m

    if not alerts:
        state["last_ok_ts"] = now
        state["last_metrics"] = m
        save_state(state)
        print("ok: no anomalies")
        return 0

    key = "|".join(sorted(alerts))
    # Always alert on new signature; cooldown only for identical key
    if key == last_key and (time.time() - last_ts) < cooldown:
        print("anomaly (suppressed cooldown):", alerts)
        return 0

    body_lines = [
        "BROK anomaly alert",
        f"UTC: {now}",
        "",
        "Signals:",
        *[f"  • {a}" for a in alerts],
        "",
        "Metrics (1h):",
        f"  users_1h={m['users_1h']} trials_1h={m['trials_1h']} xfer_1h={m['xfer_1h']}",
        f"  release_1h={m['release_1h']} zero_trial_1h={m['zero_trial_1h']}",
        f"  users_total={m['users_total']} frozen={m['frozen_n']} kills_on={m['kills_on']}",
        "",
        "Action: check kill switches, sink freezes, admin dashboard.",
        "Docs: bio-age-tool/docs/INCIDENT_TRIAL_FARM_KILL_2026-07-22.md",
    ]
    text = "\n".join(body_lines)
    subject = f"[BROK ALERT] {alerts[0][:80]}"

    tg = telegram_send(text)
    em = gmail_send(subject, text)
    state["last_alert_key"] = key
    state["last_alert_ts"] = time.time()
    state["last_alert_channels"] = {"telegram": tg, "email": em}
    state["last_metrics"] = m
    save_state(state)
    print("alerted:", {"telegram": tg, "email": em, "signals": alerts})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

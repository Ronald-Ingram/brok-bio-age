"use client";

import { adminAuthHeaders } from "@/lib/adminAuthClient";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { Fingerprint, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const SESSION_KEY = "brok_admin_session";

export function loadAdminSession(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

export function saveAdminSession(token: string): void {
  sessionStorage.setItem(SESSION_KEY, token);
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem("brok_admin_secret");
}

interface AdminPasskeyGateProps {
  session: string | null;
  onSession: (token: string) => void;
  onClear: () => void;
}

export function AdminPasskeyGate({
  session,
  onSession,
  onClear,
}: AdminPasskeyGateProps) {
  const [passkeysRegistered, setPasskeysRegistered] = useState(0);
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/passkey/status");
      const data = (await res.json()) as { passkeysRegistered?: number };
      setPasskeysRegistered(data.passkeysRegistered ?? 0);
    } catch {
      setPasskeysRegistered(0);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const savedSecret = sessionStorage.getItem("brok_admin_secret");
    if (savedSecret) setSecret(savedSecret);
  }, [refreshStatus]);

  const passkeyLogin = async () => {
    setError(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const optRes = await fetch("/api/admin/passkey/login-options", {
        method: "POST",
      });
      const options = await optRes.json();
      if (!optRes.ok) throw new Error(options.error ?? "options_failed");

      const credential = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/admin/passkey/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const verify = (await verifyRes.json()) as {
        session?: string;
        error?: string;
      };
      if (!verifyRes.ok || !verify.session) {
        throw new Error(verify.error ?? "passkey_login_failed");
      }
      saveAdminSession(verify.session);
      onSession(verify.session);
      setStatusMsg("Signed in with passkey.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "passkey_login_failed";
      if (msg.includes("NotAllowedError") || msg.includes("cancel")) {
        setError("Biometric sign-in cancelled.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const secretToSession = async () => {
    if (!secret.trim()) return;
    setError(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: adminAuthHeaders({ secret: secret.trim() }),
      });
      const data = (await res.json()) as { session?: string; error?: string };
      if (!res.ok || !data.session) {
        throw new Error(
          data.error === "forbidden"
            ? "Invalid admin secret. Check BROK_OG_ADMIN_SECRET (no extra spaces)."
            : data.error ?? "sign_in_failed"
        );
      }
      sessionStorage.setItem("brok_admin_secret", secret.trim());
      saveAdminSession(data.session);
      onSession(data.session);
      setStatusMsg("Admin session started.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign_in_failed");
    } finally {
      setBusy(false);
    }
  };

  const registerPasskey = async () => {
    if (!secret.trim()) {
      setShowSecret(true);
      setError("Enter admin secret once to register this device.");
      return;
    }
    setError(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const optRes = await fetch("/api/admin/passkey/register-options", {
        method: "POST",
        headers: adminAuthHeaders({ secret: secret.trim() }),
      });
      const options = await optRes.json();
      if (!optRes.ok) throw new Error(options.error ?? "options_failed");

      const credential = await startRegistration({ optionsJSON: options });
      const label =
        typeof navigator !== "undefined" && /iPhone|iPad/i.test(navigator.userAgent)
          ? "iPhone / iPad"
          : typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent)
            ? "MacBook"
            : "Admin device";

      const verifyRes = await fetch("/api/admin/passkey/register-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...adminAuthHeaders({ secret: secret.trim() }),
        },
        body: JSON.stringify({ credential, deviceLabel: label }),
      });
      const verify = (await verifyRes.json()) as {
        session?: string;
        error?: string;
      };
      if (!verifyRes.ok) throw new Error(verify.error ?? "register_failed");

      if (verify.session) {
        saveAdminSession(verify.session);
        onSession(verify.session);
      }
      await refreshStatus();
      setStatusMsg(
        `Passkey registered on this device (${label}). Use Touch ID or Face ID next time.`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "register_failed";
      if (msg.includes("NotAllowedError")) {
        setError("Biometric registration cancelled.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  if (session) {
    return (
      <section className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-emerald-300/90 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Admin session active
        </span>
        <button
          type="button"
          onClick={() => {
            clearAdminSession();
            onClear();
          }}
          className="text-xs text-white/45 hover:text-white/70 underline"
        >
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-bg-card p-4 space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-white/85 flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-neon-cyan" />
          Sign in to admin
        </h2>
        <p className="text-xs text-white/45 leading-relaxed">
          Use Touch ID on MacBook or Face ID on iPhone after you register this device once.
          Works only on{" "}
          <span className="text-white/60">https://brok.neobanx.com</span> (same URL each time).
        </p>
      </div>

      {passkeysRegistered > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void passkeyLogin()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-4 py-3 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/25 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Fingerprint className="w-4 h-4" />
          )}
          Sign in with Touch ID / Face ID
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowSecret((v) => !v)}
          className="text-xs text-white/45 hover:text-neon-cyan underline"
        >
          {showSecret ? "Hide secret" : passkeysRegistered > 0 ? "Use admin secret instead" : "First-time setup"}
        </button>
        {showSecret && (
          <button
            type="button"
            disabled={busy || !secret.trim()}
            onClick={() => void registerPasskey()}
            className="text-xs px-2.5 py-1 rounded border border-white/15 text-white/55 hover:text-neon-cyan"
          >
            Register this device (Touch ID / Face ID)
          </button>
        )}
      </div>

      {showSecret && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            placeholder="BROK_OG_ADMIN_SECRET (one-time setup)"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm font-mono"
          />
          <button
            type="button"
            disabled={busy || !secret.trim()}
            onClick={() => void secretToSession()}
            className="px-5 py-2.5 rounded-lg border border-white/20 text-white/70 text-sm hover:bg-white/5 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            Sign in with secret
          </button>
        </div>
      )}

      {passkeysRegistered === 0 && !showSecret && (
        <p className="text-xs text-amber-300/80 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
          No passkey yet — tap <strong>First-time setup</strong>, enter your admin secret, then{" "}
          <strong>Register this device</strong>.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2 bg-red-400/5">
          {error}
        </p>
      )}
      {statusMsg && (
        <p className="text-xs text-emerald-400/90 border border-emerald-400/20 rounded-lg px-3 py-2 bg-emerald-400/5">
          {statusMsg}
        </p>
      )}
    </section>
  );
}
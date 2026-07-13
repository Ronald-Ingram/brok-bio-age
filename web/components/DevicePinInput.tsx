"use client";

import type { CSSProperties } from "react";

/**
 * Numeric Device PIN field that avoids Apple Keychain / password managers.
 * Uses type="text" + digit filter (not type="password") so iOS/macOS
 * does not treat this as a login password or Face ID credential.
 */
export function DevicePinInput({
  id,
  label,
  value,
  onChange,
  placeholder = "4–8 digits",
  autoFocus,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-wider text-white/45">
        {label}
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        // Critical: do NOT use password / current-password / new-password
        autoComplete="one-time-code"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        name="brok_device_pin"
        data-1p-ignore="true"
        data-lpignore="true"
        data-form-type="other"
        data-bwignore="true"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          onChange(digits);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-3 py-3 rounded-xl bg-black/40 border border-white/15 text-base tracking-[0.35em] font-mono outline-none focus:border-neon-cyan/40"
        style={{ WebkitTextSecurity: "disc" } as CSSProperties}
      />
    </label>
  );
}

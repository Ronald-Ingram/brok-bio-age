"use client";

import type { AgeMode, ModelConfig } from "@/lib/types";
import { Field, NumberInput } from "./Field";

interface ModelConfigPanelProps {
  values: ModelConfig;
  onChange: (values: ModelConfig) => void;
}

const AGE_MODES: { value: AgeMode; label: string }[] = [
  { value: "scaled", label: "Scaled (default α)" },
  { value: "standard", label: "Standard Levine" },
  { value: "anchor_offset", label: "Anchor offset" },
  { value: "offset", label: "Prior BROK offset" },
  { value: "custom", label: "Custom age override" },
];

export function ModelConfigPanel({ values, onChange }: ModelConfigPanelProps) {
  const set = <K extends keyof ModelConfig>(key: K, val: ModelConfig[K]) =>
    onChange({ ...values, [key]: val });

  return (
    <section className="bio-stack space-y-4">
      <h2 className="bio-section-title text-sm font-medium text-neon-cyan">
        BROK model config
      </h2>
      <div className="bio-form-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Age mode">
          <select
            value={values.age_mode}
            onChange={(e) => set("age_mode", e.target.value as AgeMode)}
            className="w-full px-3 py-2 rounded-lg bg-bg-card border border-white/10 text-sm text-white focus:outline-none focus:border-neon-cyan/60"
          >
            {AGE_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Age α" hint="0.95 default — mild de-anchoring">
          <NumberInput
            value={values.age_alpha}
            onChange={(v) => set("age_alpha", v === "" ? 0.95 : v)}
            step="0.05"
            min={0}
            max={1}
          />
        </Field>
        {values.age_mode === "anchor_offset" && (
          <Field label="Age β">
            <NumberInput
              value={values.age_beta}
              onChange={(v) => set("age_beta", v === "" ? 0.5 : v)}
              step="0.1"
            />
          </Field>
        )}
        {values.age_mode === "custom" && (
          <Field label="Age override" unit="years">
            <NumberInput
              value={values.age_override ?? ""}
              onChange={(v) =>
                set("age_override", v === "" ? undefined : v)
              }
            />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm text-white/70 pt-6">
          <input
            type="checkbox"
            checked={values.use_hba1c_over_glucose}
            onChange={(e) =>
              set("use_hba1c_over_glucose", e.target.checked)
            }
            className="rounded border-white/20 bg-bg-card text-neon-cyan"
          />
          Prefer HbA1c over fasting glucose
        </label>
      </div>
    </section>
  );
}
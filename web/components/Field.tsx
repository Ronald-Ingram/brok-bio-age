import type { GlossaryEntry } from "@/lib/glossary";
import type { FieldSource } from "@/lib/fieldDefaults";
import { InfoTip } from "./InfoTip";

interface FieldProps {
  label: string;
  unit?: string;
  hint?: string;
  glossary?: GlossaryEntry;
  children: React.ReactNode;
}

export function Field({ label, unit, hint, glossary, children }: FieldProps) {
  return (
    <label className="bio-field block space-y-1.5">
      <span className="bio-field__label-row flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-white/60 uppercase tracking-wide">
        <span className="bio-field__label">{label}</span>
        {unit && (
          <span className="bio-field__unit text-white/35 normal-case">
            ({unit})
          </span>
        )}
        {glossary && <InfoTip entry={glossary} />}
      </span>
      <div className="bio-field__control-wrap">{children}</div>
      {hint && (
        <span className="bio-field__hint text-[11px] text-white/35 block">
          {hint}
        </span>
      )}
    </label>
  );
}

interface NumberInputProps {
  value: number | "";
  onChange: (v: number | "") => void;
  step?: string;
  min?: number;
  max?: number;
  average?: number;
  source?: FieldSource;
}

function inputClassName(source: FieldSource, hasValue: boolean): string {
  const base =
    "bio-field__control w-full px-3 py-2 rounded-lg bg-bg-card border text-sm focus:outline-none focus:ring-1 transition-colors";
  if (!hasValue) {
    return `${base} border-white/10 placeholder:text-red-400/90 placeholder:italic text-white/40 focus:border-neon-cyan/60 focus:ring-neon-cyan/30`;
  }
  if (source === "pdf") {
    return `${base} border-emerald-400/35 text-emerald-300 italic focus:border-emerald-400/60 focus:ring-emerald-400/30`;
  }
  return `${base} border-blue-400/30 text-blue-300 focus:border-blue-400/60 focus:ring-blue-400/30`;
}

export function NumberInput({
  value,
  onChange,
  step = "any",
  min,
  max,
  average,
  source = "unset",
}: NumberInputProps) {
  const hasValue = value !== "";
  const resolvedSource = hasValue && source === "unset" ? "manual" : source;

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={average !== undefined ? String(average) : undefined}
      value={value}
      onChange={(e) =>
        onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
      }
      className={inputClassName(resolvedSource, hasValue)}
    />
  );
}
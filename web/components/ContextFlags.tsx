"use client";

import { GLOSSARY } from "@/lib/glossary";
import { POPULATION_AVERAGES, type FieldProvenance } from "@/lib/fieldDefaults";
import type { FormContextFlags } from "@/lib/formTypes";
import type { Sex, TestosteroneSource } from "@/lib/types";
import { Field, NumberInput } from "./Field";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ContextFlagsProps {
  values: FormContextFlags;
  provenance: FieldProvenance;
  onChange: (values: FormContextFlags, provenance: FieldProvenance) => void;
}

export function ContextFlags({ values, provenance, onChange }: ContextFlagsProps) {
  const [open, setOpen] = useState(true);

  const set = <K extends keyof FormContextFlags>(
    key: K,
    val: FormContextFlags[K]
  ) => {
    const nextProv = { ...provenance };
    if (val === "" || val === undefined) {
      delete nextProv[key as string];
    } else if (typeof val === "number" || typeof val === "string") {
      nextProv[key as string] = "manual";
    }
    onChange({ ...values, [key]: val }, nextProv);
  };

  const src = (key: string) => provenance[key] ?? "unset";

  return (
    <section className="bio-card rounded-xl border border-white/10 bg-bg-card/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="bio-card__header w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5"
      >
        Context flags (sex, T, DEXA)
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="bio-card__body bio-form-grid px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/5 pt-4">
          <Field label="Sex">
            <select
              value={values.sex}
              onChange={(e) =>
                set("sex", (e.target.value as Sex | "") || "")
              }
              className={`w-full px-3 py-2 rounded-lg bg-bg-card border text-sm focus:outline-none ${
                values.sex
                  ? provenance.sex === "pdf"
                    ? "border-emerald-400/35 text-emerald-300 italic"
                    : "border-blue-400/30 text-blue-300"
                  : "border-white/10 text-white/40"
              }`}
            >
              <option value="">— select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>

          <label className="bio-check-row flex items-center gap-2 text-sm text-white/70 sm:col-span-2">
            <input
              type="checkbox"
              checked={values.creatine_supplementation}
              onChange={(e) =>
                set("creatine_supplementation", e.target.checked)
              }
              className="rounded border-white/20 bg-bg-card text-neon-cyan focus:ring-neon-cyan/40"
            />
            Liposomal / creatine supplementation
          </label>

          <Field label="Testosterone" unit="ng/dL">
            <NumberInput
              value={values.testosterone_ng_dl}
              onChange={(v) => set("testosterone_ng_dl", v)}
              average={POPULATION_AVERAGES.testosterone_ng_dl}
              source={src("testosterone_ng_dl")}
            />
          </Field>

          <Field label="T source" hint="Endogenous vs TRT" glossary={GLOSSARY.TRT}>
            <select
              value={values.testosterone_source}
              onChange={(e) =>
                set("testosterone_source", e.target.value as TestosteroneSource)
              }
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-white/10 text-sm text-blue-300 focus:outline-none"
            >
              <option value="unknown">Unknown</option>
              <option value="endogenous">Endogenous (natural)</option>
              <option value="exogenous">Exogenous (TRT)</option>
            </select>
          </Field>

          <label className="bio-check-row flex items-center gap-2 text-sm text-white/70 sm:col-span-2">
            <input
              type="checkbox"
              checked={values.exogenous_testosterone_recent}
              onChange={(e) =>
                set("exogenous_testosterone_recent", e.target.checked)
              }
              className="rounded border-white/20 bg-bg-card text-neon-cyan focus:ring-neon-cyan/40"
            />
            Exogenous T within last 6 months (TRT monitoring window)
          </label>

          <Field label="eGFR" unit="mL/min" glossary={GLOSSARY.eGFR}>
            <NumberInput
              value={values.egfr}
              onChange={(v) => set("egfr", v)}
              average={POPULATION_AVERAGES.egfr}
              source={src("egfr")}
            />
          </Field>
          <Field
            label="DEXA lean mass"
            unit="kg"
            glossary={GLOSSARY.DEXA}
          >
            <NumberInput
              value={values.dexa_lean_mass_kg}
              onChange={(v) => set("dexa_lean_mass_kg", v)}
              average={POPULATION_AVERAGES.dexa_lean_mass_kg}
              source={src("dexa_lean_mass_kg")}
            />
          </Field>
          <Field label="Prior lean mass" unit="kg">
            <NumberInput
              value={values.prior_lean_mass_kg}
              onChange={(v) => set("prior_lean_mass_kg", v)}
              average={POPULATION_AVERAGES.prior_lean_mass_kg}
              source={src("prior_lean_mass_kg")}
            />
          </Field>
          <Field
            label="DEXA bone T-score"
            glossary={GLOSSARY["T-score"]}
          >
            <NumberInput
              value={values.dexa_bone_t_score}
              onChange={(v) => set("dexa_bone_t_score", v)}
              average={POPULATION_AVERAGES.dexa_bone_t_score}
              source={src("dexa_bone_t_score")}
              step="0.1"
            />
          </Field>
          <Field label="Body fat" unit="%">
            <NumberInput
              value={values.body_fat_pct}
              onChange={(v) => set("body_fat_pct", v)}
              average={POPULATION_AVERAGES.body_fat_pct}
              source={src("body_fat_pct")}
              step="0.1"
            />
          </Field>
        </div>
      )}
    </section>
  );
}
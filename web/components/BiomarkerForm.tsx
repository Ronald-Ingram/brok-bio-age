"use client";

import { GLOSSARY } from "@/lib/glossary";
import { POPULATION_AVERAGES, type FieldProvenance } from "@/lib/fieldDefaults";
import type { FormBiomarkerInput } from "@/lib/formTypes";
import { Field, NumberInput } from "./Field";

interface BiomarkerFormProps {
  values: FormBiomarkerInput;
  provenance: FieldProvenance;
  onChange: (values: FormBiomarkerInput, provenance: FieldProvenance) => void;
}

export function BiomarkerForm({
  values,
  provenance,
  onChange,
}: BiomarkerFormProps) {
  const set = <K extends keyof FormBiomarkerInput>(
    key: K,
    val: FormBiomarkerInput[K]
  ) => {
    const nextProv = { ...provenance };
    if (val === "") {
      delete nextProv[key as string];
    } else {
      nextProv[key as string] = "manual";
    }
    onChange({ ...values, [key]: val }, nextProv);
  };

  const src = (key: string) => provenance[key] ?? "unset";

  return (
    <section className="bio-stack space-y-4">
      <h2 className="bio-section-title text-sm font-medium text-neon-cyan">
        Blood biomarkers
      </h2>
      <p className="bio-section-note text-xs text-white/40">
        Red italic = reference placeholder. Blue = manual entry. Green italic =
        parsed from official PDF (LabCorp, DEXA).
      </p>
      <div className="bio-form-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Albumin" unit="g/dL">
          <NumberInput
            value={values.albumin_g_dl}
            onChange={(v) => set("albumin_g_dl", v)}
            average={POPULATION_AVERAGES.albumin_g_dl}
            source={src("albumin_g_dl")}
            step="0.1"
          />
        </Field>
        <Field label="Creatinine" unit="mg/dL">
          <NumberInput
            value={values.creatinine_mg_dl}
            onChange={(v) => set("creatinine_mg_dl", v)}
            average={POPULATION_AVERAGES.creatinine_mg_dl}
            source={src("creatinine_mg_dl")}
            step="0.01"
          />
        </Field>
        <Field label="Glucose" unit="mg/dL" hint="Or use HbA1c below">
          <NumberInput
            value={values.glucose_mg_dl}
            onChange={(v) => set("glucose_mg_dl", v)}
            average={POPULATION_AVERAGES.glucose_mg_dl}
            source={src("glucose_mg_dl")}
          />
        </Field>
        <Field label="HbA1c" unit="%" glossary={GLOSSARY.HbA1c}>
          <NumberInput
            value={values.hba1c_pct}
            onChange={(v) => set("hba1c_pct", v)}
            average={POPULATION_AVERAGES.hba1c_pct}
            source={src("hba1c_pct")}
            step="0.1"
          />
        </Field>
        <Field label="CRP" unit="mg/L" glossary={GLOSSARY.CRP}>
          <NumberInput
            value={values.crp_mg_l}
            onChange={(v) => set("crp_mg_l", v)}
            average={POPULATION_AVERAGES.crp_mg_l}
            source={src("crp_mg_l")}
            step="0.01"
          />
        </Field>
        <Field
          label="Lymphocyte %"
          unit="%"
          glossary={GLOSSARY.Lymphocytes}
        >
          <NumberInput
            value={values.lymphocyte_pct}
            onChange={(v) => set("lymphocyte_pct", v)}
            average={POPULATION_AVERAGES.lymphocyte_pct}
            source={src("lymphocyte_pct")}
          />
        </Field>
        <Field label="MCV" unit="fL" glossary={GLOSSARY.MCV}>
          <NumberInput
            value={values.mcv_fl}
            onChange={(v) => set("mcv_fl", v)}
            average={POPULATION_AVERAGES.mcv_fl}
            source={src("mcv_fl")}
          />
        </Field>
        <Field label="RDW" unit="%" glossary={GLOSSARY.RDW}>
          <NumberInput
            value={values.rdw_pct}
            onChange={(v) => set("rdw_pct", v)}
            average={POPULATION_AVERAGES.rdw_pct}
            source={src("rdw_pct")}
            step="0.1"
          />
        </Field>
        <Field label="ALP" unit="U/L" glossary={GLOSSARY.ALP}>
          <NumberInput
            value={values.alp_u_l}
            onChange={(v) => set("alp_u_l", v)}
            average={POPULATION_AVERAGES.alp_u_l}
            source={src("alp_u_l")}
          />
        </Field>
        <Field label="WBC" unit="10³/µL" glossary={GLOSSARY.WBC}>
          <NumberInput
            value={values.wbc_10e3}
            onChange={(v) => set("wbc_10e3", v)}
            average={POPULATION_AVERAGES.wbc_10e3}
            source={src("wbc_10e3")}
            step="0.1"
          />
        </Field>
        <Field label="Chronological age" unit="years">
          <NumberInput
            value={values.chronological_age}
            onChange={(v) => set("chronological_age", v)}
            average={POPULATION_AVERAGES.chronological_age}
            source={src("chronological_age")}
          />
        </Field>
        <Field label="Test date" hint="YYYY-MM-DD (optional)">
          <input
            type="date"
            value={values.test_date ?? ""}
            onChange={(e) => set("test_date", e.target.value || undefined)}
            className={`w-full px-3 py-2 rounded-lg bg-bg-card border text-sm focus:outline-none focus:ring-1 transition-colors ${
              values.test_date
                ? provenance.test_date === "pdf"
                  ? "border-emerald-400/35 text-emerald-300 italic"
                  : "border-blue-400/30 text-blue-300"
                : "border-white/10 text-white/40"
            }`}
          />
        </Field>
      </div>
    </section>
  );
}
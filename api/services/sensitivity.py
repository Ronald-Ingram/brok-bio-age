"""Fixed-perturbation sensitivity analysis for standard PhenoAge."""

from __future__ import annotations

from brok_bioage.levine import compute_levine
from brok_bioage.units import BiomarkerInputs


def _apply_delta(inputs: BiomarkerInputs, **kwargs) -> BiomarkerInputs:
    data = {
        "albumin_g_dl": inputs.albumin_g_dl,
        "creatinine_mg_dl": inputs.creatinine_mg_dl,
        "glucose_mg_dl": inputs.glucose_mg_dl,
        "crp_mg_l": inputs.crp_mg_l,
        "lymphocyte_pct": inputs.lymphocyte_pct,
        "mcv_fl": inputs.mcv_fl,
        "rdw_pct": inputs.rdw_pct,
        "alp_u_l": inputs.alp_u_l,
        "wbc_10e3": inputs.wbc_10e3,
        "chronological_age": inputs.chronological_age,
    }
    data.update(kwargs)
    return BiomarkerInputs(**data)


PERTURBATION_SPECS: list[tuple[str, str, dict[str, float]]] = [
    ("creatinine", "+0.20 mg/dL creatinine", {"creatinine_mg_dl": 0.20}),
    ("rdw", "+0.50% RDW", {"rdw_pct": 0.50}),
    ("glucose", "+10 mg/dL glucose", {"glucose_mg_dl": 10.0}),
    ("albumin", "−0.20 g/dL albumin", {"albumin_g_dl": -0.20}),
    ("crp", "+1.0 mg/L CRP", {"crp_mg_l": 1.0}),
    ("age", "+1 year age", {"chronological_age": 1.0}),
]


def compute_sensitivity(inputs: BiomarkerInputs) -> list[dict]:
    baseline = compute_levine(inputs).pheno_age
    results: list[dict] = []

    for key, label, deltas in PERTURBATION_SPECS:
        if key == "glucose" and inputs.glucose_mg_dl is None:
            continue
        kwargs = {
            field: getattr(inputs, field) + delta for field, delta in deltas.items()
        }
        perturbed = _apply_delta(inputs, **kwargs)
        pheno = compute_levine(perturbed).pheno_age
        results.append(
            {
                "biomarker": key,
                "perturbation": label,
                "delta_pheno_years_standard": round(pheno - baseline, 2),
            }
        )

    return sorted(
        results, key=lambda x: abs(x["delta_pheno_years_standard"]), reverse=True
    )
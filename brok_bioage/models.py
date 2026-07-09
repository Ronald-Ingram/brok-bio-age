"""Domain models for BROK adjustments and pace tracking."""

from dataclasses import dataclass
from datetime import date
from enum import Enum

from brok_bioage.units import BiomarkerInputs


class AgeMode(str, Enum):
    STANDARD = "standard"
    SCALED = "scaled"
    ANCHOR_OFFSET = "anchor_offset"
    OFFSET = "offset"
    CUSTOM = "custom"


class Sex(str, Enum):
    MALE = "male"
    FEMALE = "female"


class TestosteroneSource(str, Enum):
    ENDOGENOUS = "endogenous"
    EXOGENOUS = "exogenous"
    UNKNOWN = "unknown"


# Research-based monitoring window: Endocrine Society TRT follow-up at 3–6 months.
EXOGENOUS_T_RECENT_MONTHS = 6

# Adult male total T reference ~300–1000 ng/dL; "above average" threshold for age 50+.
MALE_T_ABOVE_AVERAGE_NG_DL = 600


@dataclass(frozen=True)
class ContextFlags:
    creatine_supplementation: bool = False
    testosterone_ng_dl: float | None = None
    testosterone_source: TestosteroneSource = TestosteroneSource.UNKNOWN
    exogenous_testosterone_recent: bool = False
    sex: Sex | None = None
    egfr: float | None = None
    dexa_lean_mass_kg: float | None = None
    dexa_fat_mass_kg: float | None = None
    dexa_bone_t_score: float | None = None
    prior_lean_mass_kg: float | None = None
    body_fat_pct: float | None = None


@dataclass(frozen=True)
class ModelConfig:
    age_mode: AgeMode = AgeMode.SCALED
    age_alpha: float = 0.95
    age_beta: float = 0.5
    age_override: float | None = None
    prior_brok_pheno_age: float | None = None
    use_hba1c_over_glucose: bool = True


@dataclass(frozen=True)
class PriorTest:
    test_date: date
    chronological_age: float
    pheno_age_standard: float
    pheno_age_brok: float | None = None


@dataclass(frozen=True)
class BrokBiomarkerInputs:
    """Extends standard inputs with optional HbA1c for BROK glucose term."""

    albumin_g_dl: float
    creatinine_mg_dl: float
    glucose_mg_dl: float | None
    crp_mg_l: float
    lymphocyte_pct: float
    mcv_fl: float
    rdw_pct: float
    alp_u_l: float
    wbc_10e3: float
    chronological_age: float
    hba1c_pct: float | None = None
    test_date: date | None = None

    def to_levine_inputs(self, glucose_mg_dl: float) -> BiomarkerInputs:
        return BiomarkerInputs(
            albumin_g_dl=self.albumin_g_dl,
            creatinine_mg_dl=self.creatinine_mg_dl,
            glucose_mg_dl=glucose_mg_dl,
            crp_mg_l=self.crp_mg_l,
            lymphocyte_pct=self.lymphocyte_pct,
            mcv_fl=self.mcv_fl,
            rdw_pct=self.rdw_pct,
            alp_u_l=self.alp_u_l,
            wbc_10e3=self.wbc_10e3,
            chronological_age=self.chronological_age,
        )


@dataclass(frozen=True)
class AdjustmentAudit:
    field: str
    standard_value: float
    brok_value: float
    reason: str


@dataclass
class BrokTermBreakdown:
    biomarker: str
    c_input: float
    weight: float
    term_standard: float
    term_brok: float
    adjustment_note: str | None = None
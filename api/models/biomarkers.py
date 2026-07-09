"""Pydantic request/response schemas for BROK Bio-Age API."""

from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AgeMode(str, Enum):
    standard = "standard"
    scaled = "scaled"
    anchor_offset = "anchor_offset"
    offset = "offset"
    custom = "custom"


class Sex(str, Enum):
    male = "male"
    female = "female"


class TestosteroneSource(str, Enum):
    endogenous = "endogenous"
    exogenous = "exogenous"
    unknown = "unknown"


class BiomarkerInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    albumin_g_dl: float = Field(..., ge=2.0, le=6.0)
    creatinine_mg_dl: float = Field(..., ge=0.3, le=3.0)
    glucose_mg_dl: Optional[float] = Field(None, ge=50, le=300)
    hba1c_pct: Optional[float] = Field(None, ge=4.0, le=15.0)
    crp_mg_l: float = Field(..., ge=0.01, le=50.0)
    lymphocyte_pct: float = Field(..., ge=0, le=100)
    mcv_fl: float = Field(..., ge=60, le=120)
    rdw_pct: float = Field(..., ge=10, le=25)
    alp_u_l: float = Field(..., ge=20, le=500)
    wbc_10e3: float = Field(..., ge=1.0, le=30.0)
    chronological_age: float = Field(..., ge=18, le=120)
    test_date: Optional[date] = None

    @model_validator(mode="after")
    def require_glucose_or_hba1c(self) -> "BiomarkerInput":
        if self.glucose_mg_dl is None and self.hba1c_pct is None:
            raise ValueError("Either glucose_mg_dl or hba1c_pct is required")
        return self


class ContextFlags(BaseModel):
    creatine_supplementation: bool = False
    testosterone_ng_dl: Optional[float] = Field(None, ge=0, le=3000)
    testosterone_source: TestosteroneSource = TestosteroneSource.unknown
    exogenous_testosterone_recent: bool = False
    sex: Optional[Sex] = None
    egfr: Optional[float] = Field(None, ge=5, le=150)
    dexa_lean_mass_kg: Optional[float] = None
    dexa_fat_mass_kg: Optional[float] = None
    dexa_bone_t_score: Optional[float] = None
    prior_lean_mass_kg: Optional[float] = None
    body_fat_pct: Optional[float] = Field(None, ge=3, le=60)


class ModelConfig(BaseModel):
    age_mode: AgeMode = AgeMode.scaled
    age_alpha: float = Field(0.95, ge=0.0, le=1.0)
    age_beta: float = Field(0.5, ge=0.0, le=1.0)
    age_override: Optional[float] = Field(None, ge=18, le=120)
    prior_brok_pheno_age: Optional[float] = Field(None, ge=18, le=120)
    use_hba1c_over_glucose: bool = True


class PriorTest(BaseModel):
    test_date: date
    chronological_age: float
    pheno_age_standard: float
    pheno_age_brok: Optional[float] = None


class CalculateRequest(BaseModel):
    biomarkers: BiomarkerInput
    context: ContextFlags = ContextFlags()
    config: ModelConfig = ModelConfig()
    prior_tests: list[PriorTest] = []


class PhenoAgeResult(BaseModel):
    lincomb: float
    mortality_risk: float
    pheno_age: float
    delta_vs_chronological: float


class AdjustmentAudit(BaseModel):
    field: str
    standard_value: float
    brok_value: float
    reason: str


class SensitivityImpact(BaseModel):
    biomarker: str
    perturbation: str
    delta_pheno_years_standard: float


class PaceMetrics(BaseModel):
    prior_test_date: Optional[date]
    chrono_elapsed_years: Optional[float]
    pheno_elapsed_standard: Optional[float]
    pheno_elapsed_brok: Optional[float]
    pace_ratio_standard: Optional[float]
    pace_ratio_brok: Optional[float]
    deceleration_years_standard: Optional[float]
    deceleration_years_brok: Optional[float]


class CalculateResponse(BaseModel):
    standard: PhenoAgeResult
    brok: PhenoAgeResult
    delta_brok_vs_standard: float
    adjustments: list[AdjustmentAudit]
    sensitivity: list[SensitivityImpact] = []
    pace: Optional[PaceMetrics]
    pace_history: list[PaceMetrics] = []
    interpretation: str = ""
    disclaimers: list[str] = []
    model_version: str = "brok-phenoage-0.1.0"
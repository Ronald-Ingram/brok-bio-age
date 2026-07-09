"""Shared API constants."""

MAX_PDF_TEXT_CHARS = 15000
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
REQUIRED_PARSE_FIELDS = frozenset(
    {
        "albumin_g_dl",
        "creatinine_mg_dl",
        "crp_mg_l",
        "lymphocyte_pct",
        "mcv_fl",
        "rdw_pct",
        "alp_u_l",
        "wbc_10e3",
    }
)
GLUCOSE_OR_HBA1C = frozenset({"glucose_mg_dl", "hba1c_pct"})
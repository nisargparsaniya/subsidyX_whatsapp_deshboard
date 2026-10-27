"""Industrialist Client Tier Classification Engine.

Automatic Tier Calculation:
- Profile: INDUSTRIALIST only (CAs / Associates have client_tier = None)
- SILVER: Micro Enterprise or estimated subsidy < 50 Lakhs
- GOLD: Small Enterprise or 50 <= estimated subsidy < 200 Lakhs
- PLATINUM: Medium / Large Enterprise or estimated subsidy >= 200 Lakhs
"""

TIER_SILVER = "SILVER"
TIER_GOLD = "GOLD"
TIER_PLATINUM = "PLATINUM"
TIERS = (TIER_SILVER, TIER_GOLD, TIER_PLATINUM)


def compute_client_tier(
    client_profile_type: str = "INDUSTRIALIST",
    enterprise_classification: str = "",
    estimated_subsidy_lakhs: float = 0.0,
) -> str | None:
    profile = (client_profile_type or "INDUSTRIALIST").strip().upper()
    if profile != "INDUSTRIALIST":
        return None

    ent = (enterprise_classification or "").strip().lower()
    subsidy = float(estimated_subsidy_lakhs or 0.0)

    # Medium or Large or subsidy >= 200 Lakhs -> PLATINUM
    if "medium" in ent or "large" in ent or subsidy >= 200.0:
        return TIER_PLATINUM

    # Small or 50 <= subsidy < 200 Lakhs -> GOLD
    if "small" in ent or subsidy >= 50.0:
        return TIER_GOLD

    # Micro or subsidy < 50 Lakhs -> SILVER
    return TIER_SILVER

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from .. import db
from ..auth import require_user
from ..config import get_settings

router = APIRouter(dependencies=[Depends(require_user)])


@router.get("/usage/month")
def month():
    rows = db.fetch_all(
        "select feature, sum(cost_usd) as cost from api_usage "
        "where created_at >= date_trunc('month', now()) group by feature"
    )
    by_feature = {r["feature"]: float(r["cost"]) for r in rows}
    return {
        "month": datetime.now(timezone.utc).strftime("%Y-%m"),
        "cost_usd": round(sum(by_feature.values()), 6),
        "cap_usd": get_settings().ai_monthly_cap_usd,
        "by_feature": by_feature,
    }

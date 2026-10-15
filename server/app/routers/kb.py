from fastapi import APIRouter, Depends

from .. import db
from ..auth import require_user

router = APIRouter(dependencies=[Depends(require_user)])


@router.get("/kb/version")
def version():
    row = db.fetch_one("select value from kb_meta where key = 'kb_version'")
    return {"version": row["value"] if row else "0"}

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from .. import db
from ..auth import require_user
from ..services import grading

router = APIRouter(dependencies=[Depends(require_user)])


class GradeIn(BaseModel):
    question_id: str
    answer_text: str

    @field_validator("answer_text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Cevap boş olamaz")
        return v


@router.post("/cases/grade")
async def grade(body: GradeIn):
    q = await db.run(grading.load_question, body.question_id)
    if q is None:
        raise HTTPException(404, "Olay sorusu bulunamadı")
    return await grading.grade(q, body.answer_text)

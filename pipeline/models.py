"""İçerik hattının yapılandırılmış çıktı şemaları (Claude structured outputs)."""

from typing import Literal

from pydantic import BaseModel, Field


class MaddeRef(BaseModel):
    kanun: str = Field(description="Kanun kısaltması: TBK, TMK, TCK, AY, HMK, TTK, İİK, İK ...")
    madde: str = Field(description="Madde numarası, ör. '27' veya '5/A'")


class TopicPlan(BaseModel):
    slug: str = Field(description="ascii, küçük harf, tireli kısa kimlik; ör. 'irade-sakatliklari'")
    title: str
    maddeler: list[MaddeRef] = Field(description="Konunun temel maddeleri (en fazla 12)")
    ictihat_sorgulari: list[str] = Field(description="Yargıtay araması için 2 kısa Türkçe anahtar ifade")
    beceri: str = Field(description="Listeden en ilgili becerinin adı (dizin adı)")


class UnitPlan(BaseModel):
    title: str
    topics: list[TopicPlan]


class Curriculum(BaseModel):
    units: list[UnitPlan]


class Term(BaseModel):
    term: str
    definition: str


class TopicContent(BaseModel):
    summary_md: str = Field(description="Bir sayfalık hızlı tekrar özeti (markdown)")
    content_md: str = Field(description="Detaylı anlatım: tanımlar, unsurlar, şartlar, sonuçlar, istisnalar, örnekler")
    critical_md: str = Field(description="Sınav kritik noktalar ve sık karıştırılanlar, madde madde")
    doctrine_md: str = Field(description="Doktrindeki tartışmalar: baskın görüş / diğer görüşler; yazar adı YOK")
    glossary: list[Term]


class Mcq(BaseModel):
    stem_md: str
    options: list[str] = Field(description="Tam olarak 4 şık")
    correct_option: int = Field(description="Doğru şıkkın 0 tabanlı sırası (0-3)")
    explanation_md: str = Field(description="Neden doğru, diğerleri neden yanlış; ilgili madde")


class McqSet(BaseModel):
    mcq: list[Mcq]


class RubricItem(BaseModel):
    point: str = Field(description="Cevapta bulunması gereken tespit")
    weight: int = Field(description="Puan ağırlığı; bir olaydaki ağırlıkların toplamı 100")
    madde_ref: str = Field(description="İlgili madde, ör. 'TBK m. 30'; yoksa boş")


class CaseQ(BaseModel):
    stem_md: str = Field(description="Sınav tarzı olay metni ve soru(lar)")
    rubric: list[RubricItem]
    model_answer_md: str


class Card(BaseModel):
    front_md: str
    back_md: str


class CasesAndCards(BaseModel):
    cases: list[CaseQ]
    cards: list[Card]


class CaseSummary(BaseModel):
    relevant: bool = Field(description="Karar bu konu için öğretici ve ilgili mi")
    summary_md: str = Field(description="3-5 cümle: olay, hukuki sorun, Yargıtay'ın vardığı ilke")


class Issue(BaseModel):
    field: str = Field(description="summary_md | content_md | critical_md | doctrine_md")
    quote: str = Field(description="Sorunlu ifade (kısa alıntı)")
    problem: str
    severity: Literal["minor", "major"]


class Verification(BaseModel):
    status: Literal["verified", "partial", "failed"]
    issues: list[Issue]


class Table(BaseModel):
    title: str
    columns: list[str] = Field(description="İlk sütun başlığı genelde boş ya da 'Ölçüt'")
    rows: list[list[str]]
    related_slugs: list[str]


class ComparisonTables(BaseModel):
    tables: list[Table]

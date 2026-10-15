"""Müfredat, konu üretimi, içtihat özetleri, doğrulama ve karşılaştırma tabloları."""

import asyncio
import json
from datetime import datetime, timezone

import yaml

from . import models, prompts, skills
from .common import CURRICULUM, OUT

GEN_MAX_TOKENS = 48000  # akışlı çağrı; düşünme + uzun JSON için pay
CASE_TEXT_LIMIT = 15000


def _llm():
    from app import llm

    return llm


async def _parse(feature, output_format, system, user, effort="medium", model=None):
    llm = _llm()
    return await llm.generate_json(
        feature,
        output_format,
        model=model or llm.OPUS,
        max_tokens=GEN_MAX_TOKENS,
        system=system,
        output_config={"effort": effort},
        messages=[{"role": "user", "content": user}],
    )


# ── müfredat ───────────────────────────────────────────────────────────
async def make_curriculum(course: dict) -> dict:
    bundle, _ = skills.course_bundle(course["skills"])
    system = prompts.system_blocks(course, bundle)
    names = skills.plugin_skill_names(course["skills"][0]) if course["skills"] else []
    cur: models.Curriculum = await _parse(
        f"pipeline:{course['id']}:mufredat", models.Curriculum, system, prompts.curriculum(course, names), effort="high"
    )
    data = cur.model_dump()
    seen = set()
    for u in data["units"]:
        for t in u["topics"]:
            base, n = t["slug"], 2
            while t["slug"] in seen:
                t["slug"] = f"{base}-{n}"
                n += 1
            seen.add(t["slug"])
    CURRICULUM.mkdir(parents=True, exist_ok=True)
    (CURRICULUM / f"{course['id']}.yaml").write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=120), encoding="utf-8"
    )
    return data


def read_curriculum(course_id: str) -> dict:
    return yaml.safe_load((CURRICULUM / f"{course_id}.yaml").read_text(encoding="utf-8"))


# ── kaynaklar ──────────────────────────────────────────────────────────
async def fetch_articles(hub, refs: list[dict]) -> list[dict]:
    out = []
    for r in refs:
        text, is_error = await hub.call("madde_getir", {"kanun": r["kanun"], "madde_no": str(r["madde"])})
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = {}
        out.append(
            {
                "abbr": r["kanun"],
                "law_name": data.get("kanun") or r["kanun"],
                "law_no": data.get("kanun_no"),
                "article_no": str(r["madde"]),
                "official_text": None if is_error else data.get("metin"),
                "source_url": data.get("kaynak"),
                "verified": (not is_error) and bool(data.get("metin")),
            }
        )
    return out


def _decision_text(raw: str) -> str:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw
    if isinstance(data, dict):
        return data.get("metin") or data.get("text") or raw
    return raw


async def fetch_cases(hub, course: dict, system, title: str, queries: list[str], limit: int = 3) -> list[dict]:
    candidates, seen = [], set()
    for q in queries[:2]:
        text, is_error = await hub.call("ictihat_ara", {"ifade": q, "mahkeme": "yargitay", "adet": 5})
        if is_error:
            continue
        try:
            results = json.loads(text).get("sonuclar") or []
        except (json.JSONDecodeError, AttributeError):
            continue
        for r in results[:2]:
            if r.get("id") and r["id"] not in seen:
                seen.add(r["id"])
                candidates.append(r)
    cases = []
    for r in candidates:
        if len(cases) >= limit:
            break
        raw, is_error = await hub.call("karar_getir", {"karar_id": r["id"], "mahkeme": "yargitay"})
        if is_error:
            continue
        summary: models.CaseSummary = await _parse(
            f"pipeline:{course['id']}:ictihat", models.CaseSummary, system,
            prompts.case_summary(title, r.get("atif", ""), _decision_text(raw)[:CASE_TEXT_LIMIT]), effort="low",
        )
        if not summary.relevant:
            continue
        mahkeme = r.get("mahkeme") or "Yargıtay"
        cases.append(
            {
                "court": "Yargıtay" if mahkeme.startswith("Yargıtay") else mahkeme,
                "chamber": mahkeme.removeprefix("Yargıtay").strip() or None,
                "esas_no": r.get("esas_no"),
                "karar_no": r.get("karar_no"),
                "decision_date": r.get("karar_tarihi"),
                "summary_md": summary.summary_md,
                "source_url": r.get("kaynak"),
                "verified": True,
            }
        )
    return cases


# ── soru düzeni: sunucuyla ortak ────────────────────────────────────
from app.quiz_util import shuffle_options  # noqa: E402


# ── konu ───────────────────────────────────────────────────────────────
async def make_topic(hub, course: dict, system, refs_skill: list[str], unit_index: int, unit: dict,
                     topic_index: int, plan: dict) -> dict:
    cid, title = course["id"], plan["title"]
    articles = await fetch_articles(hub, plan.get("maddeler", []))
    texts = prompts.official_texts(articles)

    content: models.TopicContent = await _parse(
        f"pipeline:{cid}:icerik", models.TopicContent, system, prompts.content(unit["title"], title, texts)
    )
    c = content.model_dump()
    ver: models.Verification = await _parse(
        f"pipeline:{cid}:dogrulama", models.Verification, system, prompts.verify(title, texts, c), effort="low"
    )
    if ver.status == "failed":
        feedback = "\n".join(f"- [{i.field}] \"{i.quote}\": {i.problem}" for i in ver.issues)
        content = await _parse(
            f"pipeline:{cid}:icerik", models.TopicContent, system,
            prompts.content(unit["title"], title, texts, feedback),
        )
        c = content.model_dump()
        ver = await _parse(
            f"pipeline:{cid}:dogrulama", models.Verification, system, prompts.verify(title, texts, c), effort="low"
        )

    mcq_set: models.McqSet = await _parse(
        f"pipeline:{cid}:soru", models.McqSet, system, prompts.mcq(title, texts, c["content_md"], c["critical_md"]),
        effort="low",
    )
    case_set: models.CaseSet = await _parse(
        f"pipeline:{cid}:olay", models.CaseSet, system, prompts.cases(title, texts, c["content_md"]), effort="low"
    )
    card_set: models.CardSet = await _parse(
        f"pipeline:{cid}:kart", models.CardSet, system, prompts.cards(title, c["content_md"], c["critical_md"]),
        effort="low",
    )
    cases = await fetch_cases(hub, course, system, title, plan.get("ictihat_sorgulari", []))

    beceri = plan.get("beceri")
    main_plugin = course["skills"][0] if course["skills"] else None
    skill_refs = [f"{main_plugin}/{beceri}"] if main_plugin and beceri else []

    return {
        "course_id": cid,
        "unit_index": unit_index,
        "unit_title": unit["title"],
        "topic_index": topic_index,
        "slug": plan["slug"],
        "title": title,
        "model": _llm().OPUS,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "skill_refs": skill_refs or refs_skill[:3],
        "content": c,
        "articles": [{k: v for k, v in a.items() if k != "abbr"} for a in articles],
        "cases": cases,
        "mcq": shuffle_options([q.model_dump() for q in mcq_set.mcq], seed=f"{cid}-{plan['slug']}"),
        "cases_q": [q.model_dump() for q in case_set.cases],
        "cards": [k.model_dump() for k in card_set.cards],
        "verification": ver.model_dump(),
    }


def topic_path(course_id: str, slug: str):
    return OUT / course_id / f"{slug}.json"


async def generate_course(hub, course: dict, only: str | None = None, concurrency: int = 3) -> list[str]:
    cur = read_curriculum(course["id"])
    bundle, refs = skills.course_bundle(course["skills"])
    system = prompts.system_blocks(course, bundle)
    (OUT / course["id"]).mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(concurrency)
    done, failed = [], []

    async def one(ui, unit, ti, plan):
        path = topic_path(course["id"], plan["slug"])
        if path.exists() and not only:
            return
        async with sem:
            print(f"  → {plan['slug']} ...", flush=True)
            try:
                doc = await make_topic(hub, course, system, refs, ui, unit, ti, plan)
            except Exception as e:  # tek konu hatası tüm dersi durdurmasın
                failed.append(f"{plan['slug']}: {e}")
                print(f"  ✗ {plan['slug']}: {e}", flush=True)
                return
            path.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
            done.append(plan["slug"])
            print(f"  ✓ {plan['slug']} ({doc['verification']['status']}, {len(doc['mcq'])} soru, "
                  f"{len(doc['cases'])} karar)", flush=True)

    jobs = []
    for ui, unit in enumerate(cur["units"], 1):
        for ti, plan in enumerate(unit["topics"], 1):
            if only and plan["slug"] != only:
                continue
            jobs.append(one(ui, unit, ti, plan))
    await asyncio.gather(*jobs)
    return failed


async def make_tables(course: dict) -> list[dict]:
    docs = read_outputs(course["id"])
    bundle, _ = skills.course_bundle(course["skills"])
    system = prompts.system_blocks(course, bundle)
    listing = [{"slug": d["slug"], "title": d["title"], "summary": d["content"]["summary_md"]} for d in docs]
    res: models.ComparisonTables = await _parse(
        f"pipeline:{course['id']}:tablo", models.ComparisonTables, system, prompts.tables(course, listing)
    )
    tables = [t.model_dump() for t in res.tables]
    (OUT / course["id"] / "_tablolar.json").write_text(json.dumps(tables, ensure_ascii=False, indent=1), encoding="utf-8")
    return tables


def read_outputs(course_id: str) -> list[dict]:
    d = OUT / course_id
    docs = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(d.glob("*.json")) if not p.name.startswith("_")]
    return sorted(docs, key=lambda x: (x["unit_index"], x["topic_index"]))


def read_tables(course_id: str) -> list[dict]:
    p = OUT / course_id / "_tablolar.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []

"""Claude Code oturumunda elle yazılan konu taslaklarını denetler ve sisteme hazırlar.

    python -X utf8 -m pipeline.elle bitir HUK2011 <slug>      # denetle + pipeline/out/... yaz
    python -X utf8 -m pipeline.elle bitir HUK2011 --hepsi
    python -X utf8 -m pipeline.elle kontrol HUK2011 <slug>    # yalnız denetle

Taslak: pipeline/taslak/<DERS>/<slug>.yaml (biçim: pipeline/YAZIM_REHBERI.md).
Madde metinleri ve karar künyeleri taslaktan DEĞİL, araştırma önbelleğinden
(pipeline/cache, bkz. pipeline.arastir) alınır; metinde atıf yapılan her madde
konunun madde listesinde olmalı ve resmî metni alınmış olmalıdır.
"""

import argparse
import asyncio
import json
import re
import sys
from datetime import datetime, timezone

import yaml

from .common import CURRICULUM, OUT, ROOT, load_env

TASLAK = ROOT / "pipeline" / "taslak"
MODEL = "claude-code (elle, araştırmalı)"

ALIASES = {"IIK": "İİK", "IK": "İK", "IYUK": "İYUK", "ANAYASA": "AY", "MOHUK": "MÖHUK"}
KANUN_RE = r"(TBK|TMK|TCK|TTK|HMK|İİK|IIK|AY|İK|IK|CMK|İYUK|IYUK|KMK|TKHK|HUAK|MÖHUK|KVKK|SGK|DMK|VUK)"
LETTER = r"A-Za-zÇĞİÖŞÜçğıöşü"
# "53/1-3" = madde 53, fıkra 1, bent 3: eğik çizgiden sonraki "-N" fıkra/bent gösterimidir, madde aralığı değil
SUB = r"(?:/[0-9a-zA-Z]+(?:[-–][0-9a-zA-Z]+)?)?"
REF_RE = re.compile(
    rf"(?<![{LETTER}]){KANUN_RE}\s+md?\.\s*((?:\d+{SUB}(?:\s*(?:,|ve|veya|ile|-|–)\s*(?=\d))?)+)"
)
BARE_RE = re.compile(rf"(?<![{LETTER}.])m\.\s*(\d+)")
OPTION_LETTER_RE = re.compile(r"\b[A-D]\s*şık|\bşık(?:kı)?\s*[A-D]\b|\b[A-D]\)\s", re.IGNORECASE)

MIN = {"ozet": 150, "anlatim": 1200, "cozum": 150, "karar_ozet": 25}
COUNTS = {"sozluk": (6, 40), "sorular": (15, 30), "olaylar": (2, 5), "kartlar": (12, 30), "kritik": (8, 40)}


def canon(kanun: str) -> str:
    k = kanun.strip().upper()
    return ALIASES.get(k, k)


def words(s: str) -> int:
    return len((s or "").split())


def refs_in(text: str, primary: str | None) -> set[tuple[str, str]]:
    """Metindeki (kanun, madde) atıfları; çıplak 'm. N' konunun ana kanununa sayılır."""
    found: set[tuple[str, str]] = set()
    spans = []
    for m in REF_RE.finditer(text or ""):
        spans.append(m.span())
        for num in re.findall(rf"(?<![/\d])(\d+){SUB}", m.group(2)):
            found.add((canon(m.group(1)), num))
    if primary:
        for m in BARE_RE.finditer(text or ""):
            if not any(a <= m.start() < b for a, b in spans):
                found.add((primary, m.group(1)))
    return found


def kart_on(k: dict) -> str:
    # PyYAML (YAML 1.1) çıplak `on:` anahtarını True'ya çevirir
    return str(k.get("on", k.get(True, "")) or "").strip()


def _texts(t: dict) -> list[tuple[str, str]]:
    out = [("ozet", t.get("ozet", "")), ("anlatim", t.get("anlatim", "")), ("kritik", t.get("kritik", "")),
           ("doktrin", t.get("doktrin", ""))]
    for i, s in enumerate(t.get("sorular") or [], 1):
        out += [(f"Soru {i}", s.get("soru", "")), (f"Soru {i} açıklama", s.get("aciklama", ""))]
        out += [(f"Soru {i} şık", o) for o in s.get("siklar") or []]
    for i, o in enumerate(t.get("olaylar") or [], 1):
        out += [(f"Olay {i}", o.get("olay", "")), (f"Olay {i} çözüm", o.get("cozum", ""))]
        out += [(f"Olay {i} ölçüt", f"{c.get('tespit', '')} {c.get('madde', '')}") for c in o.get("olcut") or []]
    for i, k in enumerate(t.get("kartlar") or [], 1):
        out += [(f"Kart {i}", f"{kart_on(k)} {k.get('arka', '')}")]
    for i, k in enumerate(t.get("kararlar") or [], 1):
        out += [(f"Karar {i} özet", k.get("ozet", ""))]
    for i, s in enumerate(t.get("sozluk") or [], 1):
        out += [(f"Sözlük {i}", s.get("tanim", ""))]
    return out


def kontrol_et(course_id: str, t: dict, plan: dict, metinler: dict, kunyeler: dict):
    """Dönen: (doc | None, hatalar, uyarılar). Hata varsa doc None."""
    from app.quiz_util import shuffle_options

    hatalar: list[str] = []
    uyarilar: list[str] = []

    maddeler = [(canon(m["kanun"]), str(m["madde"])) for m in t.get("maddeler") or []]
    if not maddeler:
        hatalar.append("maddeler listesi boş")
    primary = maddeler[0][0] if maddeler else None
    for k, n in maddeler:
        if not (metinler.get((k, n)) or {}).get("metin"):
            hatalar.append(f"{k} m. {n}: resmî metin alınamadı (numara yanlış ya da mülga olabilir)")

    listed = set(maddeler)
    for alan, metin in _texts(t):
        for k, n in sorted(refs_in(metin, primary) - listed):
            hatalar.append(f"{alan}: {k} m. {n} atfı var ama maddeler listesinde yok")

    # uzunluklar ve sayılar
    if words(t.get("ozet", "")) < MIN["ozet"]:
        hatalar.append(f"özet çok kısa ({words(t.get('ozet', ''))} < {MIN['ozet']} kelime)")
    if words(t.get("anlatim", "")) < MIN["anlatim"]:
        hatalar.append(f"anlatım çok kısa ({words(t.get('anlatim', ''))} < {MIN['anlatim']} kelime)")
    if not (t.get("doktrin") or "").strip():
        hatalar.append("doktrin bölümü boş")
    kritik_satir = [ln for ln in (t.get("kritik") or "").splitlines() if re.match(r"\s*(?:[-*]|\d+\.)\s+", ln)]
    lo, hi = COUNTS["kritik"]
    if not lo <= len(kritik_satir) <= hi:
        hatalar.append(f"kritik: {len(kritik_satir)} madde ({lo}-{hi} olmalı)")
    for alan in ("sozluk", "sorular", "olaylar", "kartlar"):
        n = len(t.get(alan) or [])
        lo, hi = COUNTS[alan]
        if not lo <= n <= hi:
            hatalar.append(f"{alan}: {n} öğe ({lo}-{hi} olmalı)")

    mcqs = []
    for i, s in enumerate(t.get("sorular") or [], 1):
        siklar = [str(x).strip() for x in s.get("siklar") or []]
        if len(siklar) != 4 or len(set(siklar)) != 4 or not all(siklar):
            hatalar.append(f"Soru {i}: tam 4 farklı ve dolu şık olmalı")
            continue
        dogru = s.get("dogru")
        if not isinstance(dogru, int) or not 0 <= dogru <= 3:
            hatalar.append(f"Soru {i}: dogru 0-3 arası bir sayı olmalı")
            continue
        if not (s.get("soru") or "").strip() or not (s.get("aciklama") or "").strip():
            hatalar.append(f"Soru {i}: soru ve açıklama dolu olmalı")
            continue
        if OPTION_LETTER_RE.search(s.get("aciklama", "")):
            uyarilar.append(f"Soru {i}: açıklamada şık harfi geçiyor (şıklar karıştırılıyor; içerikle anlat)")
        mcqs.append({"stem_md": s["soru"].strip(), "options": siklar, "correct_option": dogru,
                     "explanation_md": s["aciklama"].strip()})

    cases_q = []
    for i, o in enumerate(t.get("olaylar") or [], 1):
        olcut = o.get("olcut") or []
        if len(olcut) < 2:
            hatalar.append(f"Olay {i}: en az 2 ölçüt olmalı")
        try:
            toplam = sum(int(c.get("puan", 0)) for c in olcut)
        except (TypeError, ValueError):
            toplam = -1
        if toplam != 100:
            hatalar.append(f"Olay {i}: ölçüt puanlarının toplamı 100 olmalı (şu an {toplam})")
        if words(o.get("cozum", "")) < MIN["cozum"]:
            hatalar.append(f"Olay {i}: örnek çözüm çok kısa ({words(o.get('cozum', ''))} < {MIN['cozum']} kelime)")
        cases_q.append({
            "stem_md": (o.get("olay") or "").strip(),
            "rubric": [{"point": str(c.get("tespit", "")).strip(), "weight": int(c.get("puan", 0) or 0),
                        "madde_ref": str(c.get("madde", "") or "").strip()} for c in olcut],
            "model_answer_md": (o.get("cozum") or "").strip(),
        })

    cases = []
    for i, k in enumerate(t.get("kararlar") or [], 1):
        kid = str(k.get("id", ""))
        kunye = kunyeler.get(kid)
        if not kunye:
            hatalar.append(f"Karar {i}: id={kid} araştırma önbelleğinde yok (önce pipeline.arastir ictihat ile bulun)")
            continue
        if not kunye.get("okundu", True):
            hatalar.append(f"Karar {i}: id={kid} tam metni okunmadı (önce: python -X utf8 -m pipeline.arastir karar {kid})")
            continue
        if words(k.get("ozet", "")) < MIN["karar_ozet"]:
            hatalar.append(f"Karar {i}: özet çok kısa")
        mahkeme = kunye.get("mahkeme") or ""
        cases.append({
            "court": "Yargıtay" if mahkeme.startswith("Yargıtay") else mahkeme,
            "chamber": mahkeme.removeprefix("Yargıtay").strip() or None,
            "esas_no": kunye.get("esas_no"),
            "karar_no": kunye.get("karar_no"),
            "decision_date": kunye.get("karar_tarihi"),
            "summary_md": (k.get("ozet") or "").strip(),
            "source_url": kunye.get("kaynak"),
            "verified": True,
        })

    cards = [{"front_md": kart_on(k), "back_md": str(k.get("arka", "")).strip()}
             for k in t.get("kartlar") or []]
    if any(not c["front_md"] or not c["back_md"] for c in cards):
        hatalar.append("kartlar: boş ön ya da arka yüz var")

    if hatalar:
        return None, hatalar, uyarilar

    articles = []
    for k, n in maddeler:
        d = metinler[(k, n)]
        articles.append({"law_name": d.get("kanun") or k, "law_no": d.get("kanun_no"), "article_no": n,
                         "official_text": d["metin"], "source_url": d.get("kaynak"), "verified": True})

    doc = {
        "course_id": course_id,
        "unit_index": plan["unit_index"],
        "unit_title": plan["unit_title"],
        "topic_index": plan["topic_index"],
        "slug": plan["slug"],
        "title": t.get("baslik") or plan["title"],
        "model": MODEL,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "skill_refs": list(t.get("beceriler") or []),
        "content": {
            "summary_md": t["ozet"].strip(),
            "content_md": t["anlatim"].strip(),
            "critical_md": t["kritik"].strip(),
            "doctrine_md": t["doktrin"].strip(),
            "glossary": [{"term": str(s["terim"]).strip(), "definition": str(s["tanim"]).strip()} for s in t["sozluk"]],
        },
        "articles": articles,
        "cases": cases,
        "mcq": shuffle_options(mcqs, seed=f"{course_id}-{plan['slug']}"),
        "cases_q": cases_q,
        "cards": cards,
        "verification": {
            "status": "verified" if not uyarilar else "partial",
            "issues": [{"field": "taslak", "quote": "", "problem": u, "severity": "minor"} for u in uyarilar],
        },
    }
    return doc, hatalar, uyarilar


# ── G/Ç ────────────────────────────────────────────────────────────────
def plan_for(course_id: str, slug: str) -> dict:
    cur = yaml.safe_load((CURRICULUM / f"{course_id}.yaml").read_text(encoding="utf-8"))
    for ui, unit in enumerate(cur["units"], 1):
        for ti, tp in enumerate(unit["topics"], 1):
            if tp["slug"] == slug:
                return {"slug": slug, "title": tp["title"], "unit_index": ui, "unit_title": unit["title"], "topic_index": ti}
    raise SystemExit(f"{course_id} müfredatında '{slug}' yok")


def _gather(t: dict):
    from . import arastir

    maddeler = [(canon(m["kanun"]), str(m["madde"])) for m in t.get("maddeler") or []]
    metinler = {}
    by_law: dict[str, list[str]] = {}
    for k, n in maddeler:
        by_law.setdefault(k, []).append(n)
    for k, nums in by_law.items():
        for d, n in zip(asyncio.run(arastir.madde(k, nums)), nums):
            metinler[(k, n)] = d
    kunyeler = {}
    for kr in t.get("kararlar") or []:
        k = arastir.kunye(str(kr.get("id", "")))
        if k:
            kunyeler[str(kr["id"])] = k
    return metinler, kunyeler


def isle(course_id: str, slug: str, yaz: bool) -> bool:
    path = TASLAK / course_id / f"{slug}.yaml"
    try:
        t = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        print(f"✗ {slug}: YAML hatası: {e}")
        return False
    metinler, kunyeler = _gather(t)
    doc, hatalar, uyarilar = kontrol_et(course_id, t, plan_for(course_id, slug), metinler, kunyeler)
    for u in uyarilar:
        print(f"  ⚠ {u}")
    if hatalar:
        print(f"✗ {slug}: {len(hatalar)} hata")
        for h in hatalar:
            print(f"  - {h}")
        return False
    if yaz:
        (OUT / course_id).mkdir(parents=True, exist_ok=True)
        (OUT / course_id / f"{slug}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    c = doc["content"]
    print(f"✓ {slug}: {doc['verification']['status']} | anlatım {words(c['content_md'])} kelime | "
          f"{len(doc['mcq'])} soru, {len(doc['cases_q'])} olay, {len(doc['cards'])} kart, "
          f"{len(doc['articles'])} madde, {len(doc['cases'])} karar" + (" → yazıldı" if yaz else ""))
    return True


def main(argv: list[str]) -> int:
    load_env()
    ap = argparse.ArgumentParser(prog="pipeline.elle")
    ap.add_argument("cmd", choices=["bitir", "kontrol"])
    ap.add_argument("course")
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--hepsi", action="store_true")
    a = ap.parse_args(argv)
    slugs = [p.stem for p in sorted((TASLAK / a.course).glob("*.yaml"))] if a.hepsi else [a.slug]
    ok = all([isle(a.course, s, yaz=a.cmd == "bitir") for s in slugs])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

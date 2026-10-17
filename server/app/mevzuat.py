"""Resmî güncel kanun metni — Adalet Bakanlığı bedesten mevzuat servisi.

mevzuat.gov.tr geliştirme makinesinden TLS el sıkışmasında bağlantıyı
sıfırlıyor; aynı konsolide metni sunan bedesten servisi erişilebilir. Bu modül
Mevzuat MCP'sinin `mevzuat_ara` / `madde_getir` araçlarının yerini tutar.
Kaynak linki olarak mevzuat.gov.tr adresi döner (öğrenci tarayıcıda açar).
"""

import base64
import html as htmlmod
import re
from typing import Any

import httpx

BASE = "https://bedesten.adalet.gov.tr/mevzuat"

LAWS: dict[str, str] = {
    "TBK": "6098", "TMK": "4721", "TCK": "5237", "CMK": "5271", "HMK": "6100",
    "TTK": "6102", "IIK": "2004", "İİK": "2004", "IYUK": "2577", "İYUK": "2577",
    "AY": "2709", "ANAYASA": "2709", "IK": "4857", "İK": "4857", "SSGSSK": "5510",
    "KMK": "634", "TKHK": "6502", "VUK": "213", "AATUHK": "6183", "DMK": "657",
    "KAMULASTIRMA": "2942", "IMAR": "3194", "İMAR": "3194", "KABAHATLER": "5326",
    "CGTIHK": "5275", "CGTİHK": "5275", "KVKK": "6698", "MOHUK": "5718", "MÖHUK": "5718",
    "HUAK": "6325", "AVUKATLIK": "1136", "NOTERLIK": "1512", "TAPU": "2644",
    "SENDIKALAR": "6356", "BASIN": "5187", "PVSK": "2911",
}

_mevzuat_cache: dict[str, dict] = {}
_tree_cache: dict[str, list[dict]] = {}


def law_number(kanun: str) -> str | None:
    k = kanun.strip().upper().replace(".", "").replace(" ", "")
    if k.isdigit():
        return k
    return LAWS.get(k) or None


def _strip_tags(s: str) -> str:
    return re.sub(r"\s+", " ", htmlmod.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def _heading_or_paragraph(m: re.Match) -> str:
    """bedesten bazı fıkraları <h2> içinde (normal kalınlıkta) veriyor; gerçek bölüm
    başlıkları ise kısa ve noktasız ("6. İlan yoluyla ödül sözü verme"). Cümle gibi
    biten bloklar fıkradır ve korunur; başlıklar (sonraki maddenin) atılır."""
    text = _strip_tags(m.group(0))
    if len(text) > 150 or re.search(r"[.;:]$", text):
        return f"<p>{text}</p>"
    return ""


def html_to_text(content: str) -> str:
    content = re.sub(r"<h[1-6][^>]*>.*?</h[1-6]>", _heading_or_paragraph, content, flags=re.S | re.I)
    content = re.sub(r"<br\s*/?>", "\n", content, flags=re.I)
    content = re.sub(r"</p\s*>", "\n", content, flags=re.I)
    content = re.sub(r"<[^>]+>", "", content)
    content = htmlmod.unescape(content).replace("\xa0", " ")
    lines = [ln for ln in (re.sub(r"\s+", " ", ln).strip() for ln in content.split("\n")) if ln]
    # sondaki kısa, noktalama işaretsiz "III. Ad üzerindeki hak" / "b. Ayıp" satırı sonraki maddenin başlığıdır
    while len(lines) > 1 and _NEXT_HEADING_RE.match(lines[-1]) and len(lines[-1]) <= 80:
        lines.pop()
    return "\n".join(lines)


_NEXT_HEADING_RE = re.compile(r"^(?:[IVXLC]+|[a-zçğıöşü])\.\s+\S.*[^.;:,)]$")


async def _post(path: str, data: dict) -> Any:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{BASE}/{path}", json={"data": data, "applicationName": "UyapMevzuat", "paging": True})
        r.raise_for_status()
        body = r.json()
    meta = body.get("metadata") or {}
    if meta.get("FMTY") != "SUCCESS":
        raise RuntimeError(meta.get("FMU") or "mevzuat servisi hata döndürdü")
    return body["data"]


async def _find_law(no: str) -> dict | None:
    if no in _mevzuat_cache:
        return _mevzuat_cache[no]
    data = await _post("searchDocuments", {"pageSize": 5, "pageNumber": 1, "mevzuatNo": no})
    items = [m for m in data.get("mevzuatList") or [] if str(m.get("mevzuatNo")) == no]
    # aynı numaralı birden çok tür olabilir; kanunu tercih et
    items.sort(key=lambda m: 0 if (m.get("mevzuatTur") or {}).get("name") == "KANUN" else 1)
    if not items:
        return None
    _mevzuat_cache[no] = items[0]
    return items[0]


async def _articles(mevzuat_id: str) -> list[dict]:
    if mevzuat_id in _tree_cache:
        return _tree_cache[mevzuat_id]
    data = await _post("mevzuatMaddeTree", {"mevzuatId": mevzuat_id})
    flat: list[dict] = []

    def walk(node: dict) -> None:
        for ch in node.get("children") or []:
            if ch.get("maddeId") and ch.get("maddeNo") is not None:
                flat.append(ch)
            walk(ch)

    walk(data)
    _tree_cache[mevzuat_id] = flat
    return flat


def _match(article: dict, madde_no: str) -> bool:
    want = madde_no.strip().upper().replace(" ", "")
    if str(article.get("maddeNo")) == want:
        return True
    baslik = (article.get("maddeBaslik") or "").upper().replace(" ", "")
    return baslik.endswith(":" + want)


async def madde_getir(kanun: str, madde_no: str | int) -> dict:
    madde_no = str(madde_no)
    no = law_number(kanun)
    if not no:
        found = await mevzuat_ara(kanun, 1)
        if not found:
            return {"kanun": kanun, "madde_no": madde_no, "metin": None, "uyari": "Kanun bulunamadı"}
        no = str(found[0]["no"])
    law = await _find_law(no)
    if law is None:
        return {"kanun": kanun, "madde_no": madde_no, "metin": None, "uyari": "Kanun bulunamadı"}
    arts = [a for a in await _articles(law["mevzuatId"]) if _match(a, madde_no)]
    if not arts:
        return {
            "kanun": law["mevzuatAdi"], "kanun_no": no, "madde_no": madde_no, "metin": None,
            "uyari": "Madde bulunamadı (numara yanlış ya da mülga olabilir)", "kaynak": law.get("url"),
        }
    data = await _post("getDocumentContent", {"documentType": "MADDE", "id": arts[0]["maddeId"]})

    metin = html_to_text(base64.b64decode(data["content"]).decode("utf-8", errors="replace"))
    return {
        "kanun": law["mevzuatAdi"], "kanun_no": no, "madde_no": madde_no, "metin": metin,
        "kaynak": law.get("url"),
    }


async def mevzuat_ara(ifade: str, adet: int = 5) -> list[dict]:
    data = await _post(
        "searchDocuments",
        {"pageSize": max(1, min(adet, 10)), "pageNumber": 1, "mevzuatTurList": ["KANUN"], "phrase": ifade},
    )
    return [
        {"no": m.get("mevzuatNo"), "ad": m.get("mevzuatAdi"), "mevzuat_id": m.get("mevzuatId"), "kaynak": m.get("url")}
        for m in data.get("mevzuatList") or []
    ]

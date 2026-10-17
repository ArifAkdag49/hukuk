"""Elle içerik yazarken araştırma aracı (API ücreti yok).

    python -X utf8 -m pipeline.arastir madde TBK 27 28
    python -X utf8 -m pipeline.arastir ictihat "aşırı yararlanma" [--mahkeme yargitay] [--adet 8] [--sayfa 1]
    python -X utf8 -m pipeline.arastir karar 1046055300 [--mahkeme yargitay] [--max 15000]
    python -X utf8 -m pipeline.arastir basliklar TMK 683 729     # bölüm ve madde başlıkları
    python -X utf8 -m pipeline.arastir mufredat HUK3011          # müfredattaki bütün maddeleri denetle
    python -X utf8 -m pipeline.arastir tam TBK --ara "GEÇİCİ MADDE" [--baglam 6] [--yenile]
                                     # tam metin: geçici maddeler, kanuna işlenemeyen hükümler, dipnotlar
    python -X utf8 -m pipeline.arastir degisiklik HUK3015 [--yil 2023]   # ya da: degisiklik TCK
                                     # müfredat kanunlarında yakın tarihli değişiklik notları

Madde metni Adalet Bakanlığı bedesten servisinden, kararlar içtihat MCP'sinden
gelir. Her sonuç `pipeline/cache/` altına yazılır: `elle bitir` adımı madde
metnini ve karar künyesini YALNIZCA bu önbellekten alır, böylece künye ve madde
metni hiçbir zaman elle yazılmaz.
"""

import argparse
import asyncio
import base64
import html
import json
import pathlib
import re
import sys

from .common import ROOT, load_env

CACHE = ROOT / "pipeline" / "cache"
MADDE_DIR = CACHE / "madde"
ICTIHAT_DIR = CACHE / "ictihat"
KARAR_DIR = CACHE / "karar"
TAM_DIR = CACHE / "tam"


def _safe(s: str) -> str:
    return re.sub(r"[^0-9A-Za-zÇĞİÖŞÜçğıöşü_-]+", "_", s)


def madde_path(kanun: str, madde: str) -> pathlib.Path:
    return MADDE_DIR / f"{_safe(kanun.upper())}-{_safe(str(madde))}.json"


def ictihat_path(karar_id: str) -> pathlib.Path:
    return ICTIHAT_DIR / f"{_safe(str(karar_id))}.json"


def karar_path(karar_id: str) -> pathlib.Path:
    return KARAR_DIR / f"{_safe(str(karar_id))}.txt"


# karar metninin ilk satırı: "Hukuk Genel Kurulu         2011/17-3 E.  ,  2011/142 K."
_BASLIK_RE = re.compile(r"(\d{4}/[\d-]+)\s*E\.\s*,\s*(\d{4}/\d+)\s*K\.")


def kunye(karar_id: str) -> dict | None:
    """Önbellekteki künye. Kararın tam metni okunduysa esas/karar numarası metnin kendi başlığından
    alınır: arama sonucu HGK numarasındaki daire kodunu düşürebiliyor (2011/17-3 → 2011/3)."""
    p = ictihat_path(karar_id)
    if not p.exists():
        return None
    k = json.loads(p.read_text(encoding="utf-8"))
    kp = karar_path(karar_id)
    k["okundu"] = kp.exists()
    if kp.exists():
        m = _BASLIK_RE.search(kp.read_text(encoding="utf-8")[:400])
        if m and (m.group(1), m.group(2)) != (k.get("esas_no"), k.get("karar_no")):
            k["esas_no"], k["karar_no"] = m.group(1), m.group(2)
            k["atif"] = f"{k.get('mahkeme', '')}, E.{k['esas_no']} K.{k['karar_no']}, T.{k.get('karar_tarihi', '')}"
    return k


async def madde(kanun: str, numaralar: list[str]) -> list[dict]:
    from app import mevzuat

    MADDE_DIR.mkdir(parents=True, exist_ok=True)
    out = []
    for no in numaralar:
        p = madde_path(kanun, no)
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
        else:
            data = await mevzuat.madde_getir(kanun, no)
            if data.get("metin"):
                p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        out.append(data)
    return out


def baslik_satirlari(tree: dict, ilk: int | None, son: int | None) -> list[str]:
    """Madde ağacını girintili satırlara çevirir; aralıkta maddesi olmayan bölümler atlanır."""

    def walk(node: dict, depth: int) -> list[str]:
        out: list[str] = []
        for ch in node.get("children") or []:
            n = ch.get("maddeNo")
            pad = "  " * depth
            if n is None:
                inner = walk(ch, depth + 1)
                if inner:
                    out += [f"{pad}[{ch.get('title')}]", *inner]
                continue
            if (ilk is None or n >= ilk) and (son is None or n <= son):
                out.append(f"{pad}m. {n} — {ch.get('title')}")
            out += walk(ch, depth + 1)
        return out

    return walk(tree, 0)


async def basliklar(kanun: str, ilk: int | None, son: int | None) -> list[str]:
    from app import mevzuat

    no = mevzuat.law_number(kanun) or kanun
    law = await mevzuat._find_law(no)
    if law is None:
        return [f"{kanun}: kanun bulunamadı"]
    tree = await mevzuat._post("mevzuatMaddeTree", {"mevzuatId": law["mevzuatId"]})
    return [f"# {law.get('mevzuatAdi')} ({no})", *baslik_satirlari(tree, ilk, son)]


# Madde başlığının türü; bazı kanunlarda (TCK, CMK) başlık "Madde 81 -" biçiminde yazılır
_BASLIK_TURU = {"MADDE": "m.", "Madde": "m.", "GEÇİCİ MADDE": "geçici m.", "Geçici Madde": "geçici m.",
                "EK MADDE": "ek m.", "Ek Madde": "ek m."}


def tam_metin_satirlari(raw: str) -> list[str]:
    """Kanunun HTML tam metnini boş olmayan, boşlukları sadeleştirilmiş satırlara çevirir. Ayrı satıra düşmüş
    "MADDE" / "201- ..." ve "Geçici" / "Madde 12- ..." başlıkları birleştirilir."""
    raw = re.sub(r"<br\s*/?>|</p\s*>|</h\d\s*>|</div\s*>|</tr\s*>", "\n", raw, flags=re.I)
    txt = html.unescape(re.sub(r"<[^>]+>", "", raw)).replace("\xa0", " ")
    out: list[str] = []
    for s in (re.sub(r"\s+", " ", ln).strip() for ln in txt.split("\n")):
        if not s:
            continue
        if out and out[-1] in _BASLIK_TURU and re.match(r"\d+\s*(?:/\s*[A-Za-z]\s*)?[-–]", s):
            out[-1] = f"{out[-1]} {s}"
        elif out and out[-1] in ("Geçici", "GEÇİCİ", "Ek", "EK") and re.match(r"(?:Madde|MADDE)\s*\d", s):
            out[-1] = f"{out[-1]} {s}"
        else:
            out.append(s)
    return out


_NOT_RE = re.compile(r"\(((?:Değişik|Ek|Mülga|İptal|Yürürlükten)[^()]*?(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})[^()]*)\)")
_DIPNOT_RE = re.compile(r"^\[\d+\]\s*(\d{1,2})/(\d{1,2})/(\d{4})\s+tarihli[^\n]*", re.M)


def degisiklik_notlari(metin: str, en_erken_yil: int) -> list[str]:
    """Metindeki "(Değişik/Ek/Mülga/İptal: g/a/yyyy-...)" notları ve "[n] g/a/yyyy tarihli ..." dipnotlarından
    yılı `en_erken_yil` ya da sonrası olanlar."""
    out = [m.group(1) for m in _NOT_RE.finditer(metin) if int(m.group(4)) >= en_erken_yil]
    out += [m.group(0)[:240] for m in _DIPNOT_RE.finditer(metin) if int(m.group(3)) >= en_erken_yil]
    return list(dict.fromkeys(re.sub(r"\s+", " ", x).strip() for x in out))


_MADDE_BASI_RE = re.compile(
    r"^(GEÇİCİ MADDE|Geçici Madde|EK MADDE|Ek Madde|MADDE|Madde)\s*(\d+(?:\s*/\s*[A-Za-zÇĞİÖŞÜ])?)\s*[-–]")
_DIPNOT_BASI_RE = re.compile(r"^\[(\d+)\]\s")


def _kenar_basligini_ayir(onceki: list[str]) -> list[str]:
    """Önceki bloğun sonundaki kenar başlığı satırlarını (kısım/bölüm başlıklarıyla en çok on iki kısa, noktalamayla
    bitmeyen satır; önlerinde cümle sonu ya da blok başı) bloktan çıkarıp döner: başlık ve dipnot işareti bir sonraki
    maddeye aittir."""
    def son(s: str) -> str:  # sondaki dipnot işaretleri noktalamayı gizlemesin: "edilir.[6]"
        return re.sub(r"(?:\[\d+\])+$", "", s)

    i = len(onceki)
    while (i > 0 and len(onceki) - i < 12 and len(onceki[i - 1]) <= 100 and not _MADDE_BASI_RE.match(onceki[i - 1])
           and not re.search(r"[.;:,]$", son(onceki[i - 1]))):
        i -= 1
    if i == len(onceki) or (i > 0 and not re.search(r"[.;:]$", son(onceki[i - 1]))):
        return []
    tasinan = onceki[i:]
    del onceki[i:]
    return tasinan


def tam_degisiklikler(satirlar: list[str], en_erken_yil: int) -> list[str]:
    """Tam metindeki değişiklik notları madde madde; sondaki dipnotlar, onlara atıf yapan maddeye bağlanır."""
    bloklar: list[tuple[str, list[str]]] = [("giriş", [])]
    dipnotlar: dict[str, list[str]] = {}
    on_ek, dipnot = "", None
    for s in satirlar:
        d = _DIPNOT_BASI_RE.match(s)
        m = _MADDE_BASI_RE.match(s)
        if d:
            dipnot = d.group(1)
            dipnotlar[dipnot] = [s]
            continue
        if dipnot is not None and not m:
            dipnotlar[dipnot].append(s)
            continue
        dipnot = None
        if "İŞLENEMEYEN HÜKÜM" in s:
            on_ek = "işlenemeyen hüküm, "
        if m:
            baslik = _kenar_basligini_ayir(bloklar[-1][1])
            bloklar.append((f"{on_ek}{_BASLIK_TURU[m.group(1)]} {re.sub(r'\s+', '', m.group(2))}", baslik))
        bloklar[-1][1].append(s)
    out = [f"{ad}: {n}" for ad, sat in bloklar for n in degisiklik_notlari(" ".join(sat), en_erken_yil)]
    for k, sat in dipnotlar.items():
        notlar = degisiklik_notlari(" ".join(sat), en_erken_yil)
        if notlar:
            sahipler = [ad for ad, bs in bloklar if f"[{k}]" in " ".join(bs)] or ["dipnot"]
            out += [f"{', '.join(sahipler)}: {n}" for n in notlar]
    return out


def ara(satirlar: list[str], desen: str, baglam: int = 6) -> list[str]:
    """Desene uyan satırları önce ve sonrasındaki `baglam` satırla, satır numaralı verir; ayrık bloklar "--" ile ayrılır."""
    rx = re.compile(desen, flags=re.I)
    out: list[str] = []
    son = 0
    for i in (i for i, s in enumerate(satirlar) if rx.search(s)):
        bas, bit = max(0, i - baglam), min(len(satirlar), i + baglam + 1)
        if out and bas > son:
            out.append("--")
        out += [f"{j + 1}: {satirlar[j]}" for j in range(max(bas, son), bit)]
        son = max(son, bit)
    return out


async def tam(kanun: str, yenile: bool = False) -> tuple[str, list[str]]:
    """Kanunun tam metni (geçici maddeler ve kanuna işlenemeyen hükümler dahil); `pipeline/cache/tam/` altında saklanır."""
    from app import mevzuat

    no = mevzuat.law_number(kanun) or kanun
    p = TAM_DIR / f"{_safe(no)}.txt"
    if p.exists() and not yenile:
        return no, p.read_text(encoding="utf-8").split("\n")
    law = await mevzuat._find_law(no)
    if law is None:
        raise SystemExit(f"{kanun}: kanun bulunamadı")
    data = await mevzuat._post("getDocumentContent", {"documentType": "MEVZUAT", "id": law["mevzuatId"]})
    satirlar = tam_metin_satirlari(base64.b64decode(data["content"]).decode("utf-8", errors="replace"))
    TAM_DIR.mkdir(parents=True, exist_ok=True)
    p.write_text("\n".join(satirlar), encoding="utf-8")
    return no, satirlar


async def degisiklik_raporu(hedef: str, en_erken_yil: int) -> list[str]:
    """Ders kodu verilirse müfredattaki her kanunun, müfredat maddelerinin aralığına düşen (ve geçici/ek) maddelerindeki;
    kanun verilirse bütün kanundaki `en_erken_yil` ve sonrasına ait değişiklik notları."""
    import yaml

    from .common import CURRICULUM

    p = CURRICULUM / f"{hedef}.yaml"
    if not p.exists():
        no, satirlar = await tam(hedef)
        return [f"# {hedef} ({no})", *tam_degisiklikler(satirlar, en_erken_yil)]
    araliklar: dict[str, list[int]] = {}
    for u in yaml.safe_load(p.read_text(encoding="utf-8"))["units"]:
        for t in u["topics"]:
            for m in t.get("maddeler") or []:
                n = re.match(r"\d+", str(m["madde"]))
                if n:
                    araliklar.setdefault(str(m["kanun"]), []).append(int(n.group(0)))
    out: list[str] = []
    for kanun, nums in araliklar.items():
        no, satirlar = await tam(kanun)
        lo, hi = min(nums), max(nums)
        out.append(f"# {kanun} ({no}) m. {lo}-{hi}")
        for s in tam_degisiklikler(satirlar, en_erken_yil):
            mm = re.match(r"(?:işlenemeyen hüküm, )?m\. (\d+)", s)
            if mm is None or lo <= int(mm.group(1)) <= hi:
                out.append(s)
    return out


def bos_madde(metin: str) -> bool:
    """"MADDE 107– (Mülga: ...)" gibi gövdesi kalmamış madde mi? İptal edilip yeniden
    düzenlenen (TCK 278) ya da yalnız bir fıkrası mülga olan maddeler boş sayılmaz."""
    m = re.search(r"MADDE\s+[0-9/A-Za-zÇĞİÖŞÜçğıöşü]+\s*[-–]\s*", metin, flags=re.I)
    if not m:
        return False
    govde = re.sub(r"^\([^)]*\)", "", metin[m.end():].strip()).strip()
    return len(govde) < 20


async def mufredat(course_id: str, bekle: float = 0.3) -> tuple[int, int, list[str]]:
    """Müfredattaki her maddenin resmî metnini çeker (önbelleğe yazar); eksik ya da mülga olanları döner."""
    import yaml

    from .common import CURRICULUM

    cur = yaml.safe_load((CURRICULUM / f"{course_id}.yaml").read_text(encoding="utf-8"))
    slugs: list[str] = []
    by_law: dict[str, set[str]] = {}
    for u in cur["units"]:
        for t in u["topics"]:
            slugs.append(t["slug"])
            for m in t["maddeler"]:
                by_law.setdefault(m["kanun"], set()).add(str(m["madde"]))
    sorunlar = [f"tekrarlanan slug: {s}" for s in sorted({s for s in slugs if slugs.count(s) > 1})]
    for kanun, nums in by_law.items():
        for no in sorted(nums, key=lambda x: (len(x), x)):
            cached = madde_path(kanun, no).exists()
            (d,) = await madde(kanun, [no])
            metin = d.get("metin") or ""
            if not metin:
                sorunlar.append(f"{kanun} m. {no}: {d.get('uyari') or 'metin yok'}")
            elif bos_madde(metin):
                sorunlar.append(f"{kanun} m. {no}: mülga ya da iptal edilmiş (gövdesi boş)")
            if not cached:
                await asyncio.sleep(bekle)
    return len(slugs), sum(len(v) for v in by_law.values()), sorunlar


async def _hub():
    from app.mcp_hub import McpHub

    hub = McpHub()
    await hub.start()
    return hub


async def ictihat(ifade: str, mahkeme: str, adet: int, sayfa: int) -> dict:
    hub = await _hub()
    try:
        text, is_error = await hub.call("ictihat_ara", {"ifade": ifade, "mahkeme": mahkeme, "adet": adet, "sayfa": sayfa})
    finally:
        await hub.stop()
    if is_error:
        return {"hata": text}
    data = json.loads(text)
    ICTIHAT_DIR.mkdir(parents=True, exist_ok=True)
    for r in data.get("sonuclar") or []:
        if r.get("id"):
            ictihat_path(r["id"]).write_text(json.dumps({**r, "mahkeme_turu": mahkeme}, ensure_ascii=False, indent=1), encoding="utf-8")
    return data


async def karar(karar_id: str, mahkeme: str) -> str:
    KARAR_DIR.mkdir(parents=True, exist_ok=True)
    p = karar_path(karar_id)
    if p.exists():
        return p.read_text(encoding="utf-8")
    hub = await _hub()
    try:
        text, is_error = await hub.call("karar_getir", {"karar_id": karar_id, "mahkeme": mahkeme})
    finally:
        await hub.stop()
    if is_error:
        return f"HATA: {text}"
    try:
        data = json.loads(text)
        body = data.get("metin") or text if isinstance(data, dict) else text
    except json.JSONDecodeError:
        body = text
    p.write_text(body, encoding="utf-8")
    return body


def main(argv: list[str]) -> int:
    load_env()
    ap = argparse.ArgumentParser(prog="pipeline.arastir")
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("madde")
    m.add_argument("kanun")
    m.add_argument("numaralar", nargs="+")
    i = sub.add_parser("ictihat")
    i.add_argument("ifade")
    i.add_argument("--mahkeme", default="yargitay")
    i.add_argument("--adet", type=int, default=8)
    i.add_argument("--sayfa", type=int, default=1)
    k = sub.add_parser("karar")
    k.add_argument("karar_id")
    k.add_argument("--mahkeme", default="yargitay")
    k.add_argument("--max", type=int, default=15000)
    b = sub.add_parser("basliklar", help="kanunun bölüm ve madde başlıkları (aralık verilebilir)")
    b.add_argument("kanun")
    b.add_argument("ilk", type=int, nargs="?")
    b.add_argument("son", type=int, nargs="?")
    mu = sub.add_parser("mufredat", help="müfredattaki bütün maddeleri çek ve denetle")
    mu.add_argument("course_id")
    t = sub.add_parser("tam", help="kanunun tam metni (geçici maddeler dahil); --ara ile satır ara")
    t.add_argument("kanun")
    t.add_argument("--ara", help="aranacak düzenli ifade (büyük-küçük harf ayrımı yok)")
    t.add_argument("--baglam", type=int, default=6, help="eşleşmenin önünde ve arkasında gösterilecek satır")
    t.add_argument("--yenile", action="store_true", help="önbelleği yok sayıp metni yeniden indir")
    dg = sub.add_parser("degisiklik", help="yakın tarihli değişiklik notları: ders kodu (müfredattaki kanunlar) ya da kanun")
    dg.add_argument("hedef")
    dg.add_argument("--yil", type=int, default=2023, help="bu yıl ve sonrasındaki notlar (varsayılan 2023)")
    a = ap.parse_args(argv)

    if a.cmd == "degisiklik":
        for s in asyncio.run(degisiklik_raporu(a.hedef, a.yil)):
            print(s)
        return 0

    if a.cmd == "tam":
        no, satirlar = asyncio.run(tam(a.kanun, a.yenile))
        if not a.ara:
            print(f"{a.kanun} ({no}): {len(satirlar)} satır → {TAM_DIR / (_safe(no) + '.txt')}")
            return 0
        bulunan = ara(satirlar, a.ara, a.baglam)
        print("\n".join(bulunan) if bulunan else f"'{a.ara}' bulunamadı")
        return 0

    if a.cmd == "madde":
        for d in asyncio.run(madde(a.kanun, a.numaralar)):
            head = f"### {a.kanun.upper()} m. {d.get('madde_no')} — {d.get('kanun', '')}"
            print(head)
            print(d.get("metin") or f"(METİN YOK: {d.get('uyari', 'bulunamadı')})")
            print()
        return 0
    if a.cmd == "ictihat":
        data = asyncio.run(ictihat(a.ifade, a.mahkeme, a.adet, a.sayfa))
        if "hata" in data:
            print(data["hata"])
            return 1
        print(f"toplam {data.get('toplam')} sonuç (sayfa {data.get('sayfa')})")
        for r in data.get("sonuclar") or []:
            print(f"- id={r.get('id')} | {r.get('atif')} | {r.get('kaynak')}")
        return 0
    if a.cmd == "basliklar":
        for satir in asyncio.run(basliklar(a.kanun, a.ilk, a.son)):
            print(satir)
        return 0
    if a.cmd == "mufredat":
        konu, madde_sayisi, sorunlar = asyncio.run(mufredat(a.course_id))
        print(f"{a.course_id}: {konu} konu, {madde_sayisi} madde")
        for x in sorunlar:
            print(f"  - {x}")
        print("sorun yok" if not sorunlar else f"{len(sorunlar)} sorun")
        return 1 if sorunlar else 0
    if a.cmd == "karar":
        body = asyncio.run(karar(a.karar_id, a.mahkeme))
        print(body[: a.max])
        if len(body) > a.max:
            print(f"\n[… {len(body) - a.max} karakter daha; --max ile artırılabilir]")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

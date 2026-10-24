"""Argon (ya da başka bir araştırmacı) ders dosyasını konu başına kaynak paketlerine ayırır.

    python -X utf8 -m pipeline.kaynak ayir "<dosya.md>" HUK3012      # pipeline/kaynak/HUK3012/<slug>.md yazar
    python -X utf8 -m pipeline.kaynak kararlar "<dosya.md>"          # dosyadaki karar id'lerinin tam metnini önbelleğe alır

Dosyada her konu `## Konu <no>. <başlık>` ile başlar ve hemen altında `slug: <slug>` satırı bulunur.
Yalnız müfredatta olan slug'lar yazılır. Paket yalnızca *araştırma girdisidir*: yazar madde metnini paketten değil
resmî kaynaktan (`pipeline.arastir madde`) alır; karar künyeleri `elle` denetiminde karar metninden okunur.
"""

import argparse
import asyncio
import pathlib
import re
import sys

import yaml

from .common import CURRICULUM, ROOT, load_env

KAYNAK = ROOT / "pipeline" / "kaynak"
_KONU_RE = re.compile(r"(?m)^## Konu (\d+)\.[^\n]*\n")
_SLUG_RE = re.compile(r"^slug:\s*(\S+)", re.M)


def ayir(metin: str) -> list[tuple[int, str, str]]:
    """(konu no, slug, paket metni) listesi; slug satırı olmayan bölüm atlanır."""
    out = []
    basliklar = list(_KONU_RE.finditer(metin))
    for i, m in enumerate(basliklar):
        son = basliklar[i + 1].start() if i + 1 < len(basliklar) else len(metin)
        blok = metin[m.start():son].rstrip()
        blok = re.sub(r"\n-{3,}\s*$", "", blok).rstrip()
        s = _SLUG_RE.search(blok[:400])
        if s:
            out.append((int(m.group(1)), s.group(1), blok + "\n"))
    return out


def karar_idleri(metin: str) -> list[str]:
    return list(dict.fromkeys(re.findall(r"getDokuman\?id=(\d+)", metin)))


def yaz(metin: str, ders: str, hedef: pathlib.Path, gecerli: set[str]) -> tuple[list[str], list[str]]:
    """Paketleri `hedef/<ders>/<slug>.md` olarak yazar. (yazılanlar, müfredatta olmayan slug'lar) döner."""
    yazilan, bilinmeyen = [], []
    (hedef / ders).mkdir(parents=True, exist_ok=True)
    for _, slug, blok in ayir(metin):
        if slug not in gecerli:
            bilinmeyen.append(slug)
            continue
        (hedef / ders / f"{slug}.md").write_text(blok, encoding="utf-8")
        yazilan.append(slug)
    return yazilan, bilinmeyen


async def kararlari_indir(idler: list[str], bekle: float = 3.0) -> tuple[int, int]:
    """Önbellekte olmayan kararları tek içtihat bağlantısıyla indirir; (yeni, indirilemeyen) döner."""
    from . import arastir

    bekleyen = [k for k in idler if not arastir.karar_path(k).exists()]
    yeni = hata = 0
    if not bekleyen:
        return yeni, hata
    hub = await arastir._hub()
    try:
        for kid in bekleyen:
            for deneme in range(3):
                metin = await arastir.karar(kid, "yargitay", hub=hub)
                if not metin.startswith("HATA"):
                    break
                arastir.karar_path(kid).unlink(missing_ok=True)
                await asyncio.sleep(20)
            if metin.startswith("HATA"):
                arastir.karar_path(kid).unlink(missing_ok=True)
                hata += 1
            else:
                yeni += 1
            await asyncio.sleep(bekle)
    finally:
        await hub.stop()
    return yeni, hata


def main(argv: list[str]) -> int:
    load_env()
    ap = argparse.ArgumentParser(prog="pipeline.kaynak")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("ayir")
    a.add_argument("dosya")
    a.add_argument("ders")
    k = sub.add_parser("kararlar")
    k.add_argument("dosya")
    args = ap.parse_args(argv)
    metin = pathlib.Path(args.dosya).read_text(encoding="utf-8")
    if args.cmd == "ayir":
        cur = yaml.safe_load((CURRICULUM / f"{args.ders}.yaml").read_text(encoding="utf-8"))
        gecerli = {t["slug"] for u in cur["units"] for t in u["topics"]}
        yazilan, bilinmeyen = yaz(metin, args.ders, KAYNAK, gecerli)
        print(f"{args.ders}: {len(yazilan)} paket yazıldı → {KAYNAK / args.ders}")
        if bilinmeyen:
            print(f"müfredatta olmayan slug'lar atlandı: {bilinmeyen}")
        return 0
    idler = karar_idleri(metin)
    yeni, hata = asyncio.run(kararlari_indir(idler))
    print(f"{len(idler)} karar id: {yeni} yeni indirildi, {hata} indirilemedi")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

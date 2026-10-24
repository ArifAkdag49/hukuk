"""Konu durumu: hangi konunun paketi, taslağı, çıktısı var; sıradaki yazılacaklar.

    python -X utf8 -m pipeline.durum                    # bütün derslerin özeti
    python -X utf8 -m pipeline.durum HUK3012 --liste    # dersin her konusu ve durumu
    python -X utf8 -m pipeline.durum HUK3012 --siradaki 8   # yazılacak ilk 8 konu: slug, beceri dosyası, başlık

Durumlar: `bitti` (pipeline/out/<DERS>/<slug>.json var) · `taslak` (yazıldı, henüz bitirilmedi) ·
`paket` (kaynak paketi var, yazılmadı) · `paketsiz` (araştırması yok).
"""

import argparse
import glob
import pathlib
import sys

import yaml

from .common import ROOT

DERSLER = ["HUK3011", "HUK3012", "HUK3013", "HUK3015", "HUK3017", "HUK3014", "HUK3016", "HUK2009", "HUK2017"]


def durum(ders: str, root: pathlib.Path = ROOT) -> list[dict]:
    cur = yaml.safe_load((root / "pipeline" / "curriculum" / f"{ders}.yaml").read_text(encoding="utf-8"))
    rows, no = [], 0
    for u in cur["units"]:
        for t in u["topics"]:
            no += 1
            s = t["slug"]
            if (root / "pipeline" / "out" / ders / f"{s}.json").exists():
                d = "bitti"
            elif (root / "pipeline" / "taslak" / ders / f"{s}.yaml").exists():
                d = "taslak"
            elif (root / "pipeline" / "kaynak" / ders / f"{s}.md").exists():
                d = "paket"
            else:
                d = "paketsiz"
            rows.append({"no": no, "slug": s, "durum": d, "baslik": t["title"], "beceri": t.get("beceri", "")})
    return rows


def siradaki(ders: str, root: pathlib.Path = ROOT) -> list[dict]:
    return [r for r in durum(ders, root) if r["durum"] == "paket"]


def beceri_yolu(beceri: str, root: pathlib.Path = ROOT) -> str:
    """`<eklenti>/<beceri>` biçimi (YAML `beceriler` alanı için)."""
    bulunan = glob.glob(str(root / "vendor" / "turk-hukuku-ve-claude" / "*" / "skills" / beceri / "SKILL.md"))
    return f"{pathlib.Path(bulunan[0]).parents[2].name}/{beceri}" if bulunan else f"?/{beceri}"


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.durum")
    ap.add_argument("ders", nargs="?")
    ap.add_argument("--liste", action="store_true")
    ap.add_argument("--siradaki", type=int, metavar="N")
    a = ap.parse_args(argv)
    if a.ders and a.siradaki:
        for r in siradaki(a.ders)[: a.siradaki]:
            print(f"{r['no']} | {r['slug']} | {beceri_yolu(r['beceri'])} | {r['baslik']}")
        return 0
    if a.ders and a.liste:
        for r in durum(a.ders):
            print(f"{r['no']:>2} {r['durum']:<9} {r['slug']}")
        return 0
    toplam = {"bitti": 0, "taslak": 0, "paket": 0, "paketsiz": 0}
    for ders in [a.ders] if a.ders else DERSLER:
        rows = durum(ders)
        sayi = {k: sum(r["durum"] == k for r in rows) for k in toplam}
        for k in toplam:
            toplam[k] += sayi[k]
        print(f"{ders}: {len(rows)} konu | bitti {sayi['bitti']} · taslak {sayi['taslak']} · "
              f"yazılacak (paketi var) {sayi['paket']} · araştırması yok {sayi['paketsiz']}")
    print(f"TOPLAM: bitti {toplam['bitti']} · taslak {toplam['taslak']} · yazılacak {toplam['paket']} · araştırması yok {toplam['paketsiz']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

"""Argon araştırma dosyasının konu başına kaynak paketlerine ayrılması."""

from pipeline import kaynak

DOSYA = """# HUK3012 Borçlar Özel — Araştırma dosyası

## Konu 1. Satış Sözleşmesi
slug: satis-genel
### 1. Kapsam
Birinci konu. getDokuman?id=111 ve getDokuman?id=222

---

## Konu 2. Zapttan Sorumluluk
slug: zapttan-sorumluluk
### 1. Kapsam
İkinci konu. getDokuman?id=333 getDokuman?id=111
"""


def test_split_gives_one_package_per_topic_with_its_slug():
    parcalar = kaynak.ayir(DOSYA)
    assert [(no, slug) for no, slug, _ in parcalar] == [(1, "satis-genel"), (2, "zapttan-sorumluluk")]
    assert parcalar[0][2].startswith("## Konu 1. Satis".replace("Satis", "Satış"))
    assert "İkinci konu" not in parcalar[0][2] and "Birinci konu" not in parcalar[1][2]
    assert not parcalar[0][2].rstrip().endswith("---")


def test_decision_ids_are_collected_in_order_without_duplicates():
    assert kaynak.karar_idleri(DOSYA) == ["111", "222", "333"]


def test_write_packages_skips_topics_that_are_not_in_the_curriculum(tmp_path):
    yazilan, bilinmeyen = kaynak.yaz(DOSYA, "HUK9999", tmp_path, gecerli={"satis-genel"})
    assert yazilan == ["satis-genel"] and bilinmeyen == ["zapttan-sorumluluk"]
    assert (tmp_path / "HUK9999" / "satis-genel.md").exists()
    assert not (tmp_path / "HUK9999" / "zapttan-sorumluluk.md").exists()

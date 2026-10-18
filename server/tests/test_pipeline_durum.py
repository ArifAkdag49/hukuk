"""Konu durumu: paket var mı, taslak yazıldı mı, çıktı (elle bitir) üretildi mi."""

import yaml

from pipeline import durum


def _kur(tmp_path):
    (tmp_path / "pipeline" / "curriculum").mkdir(parents=True)
    cur = {"units": [{"title": "U1", "topics": [
        {"slug": "a", "title": "Konu A", "maddeler": [], "beceri": "x"},
        {"slug": "b", "title": "Konu B", "maddeler": [], "beceri": "y"},
        {"slug": "c", "title": "Konu C", "maddeler": [], "beceri": "z"},
        {"slug": "d", "title": "Konu D", "maddeler": [], "beceri": "z"}]}]}
    (tmp_path / "pipeline" / "curriculum" / "HUK0001.yaml").write_text(yaml.safe_dump(cur), encoding="utf-8")
    for alt, ad in (("kaynak", "a.md"), ("kaynak", "b.md"), ("kaynak", "c.md"), ("taslak", "b.yaml"), ("taslak", "a.yaml"), ("out", "a.json")):
        d = tmp_path / "pipeline" / alt / "HUK0001"
        d.mkdir(parents=True, exist_ok=True)
        (d / ad).write_text("x", encoding="utf-8")


def test_state_of_each_topic(tmp_path):
    _kur(tmp_path)
    rows = durum.durum("HUK0001", tmp_path)
    assert [(r["no"], r["slug"], r["durum"]) for r in rows] == [
        (1, "a", "bitti"), (2, "b", "taslak"), (3, "c", "paket"), (4, "d", "paketsiz")]


def test_next_topics_are_the_ones_with_a_package_and_no_draft(tmp_path):
    _kur(tmp_path)
    assert [r["slug"] for r in durum.siradaki("HUK0001", tmp_path)] == ["c"]

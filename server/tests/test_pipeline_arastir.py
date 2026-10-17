"""Araştırma aracının saf yardımcıları (ağ gerektirmeyen kısımlar)."""

from pipeline import arastir

TREE = {
    "children": [
        {"maddeNo": None, "title": "BAŞLANGIÇ", "children": [
            {"maddeNo": 1, "title": "A. Hukukun uygulanması", "children": []},
            {"maddeNo": 2, "title": "I. Dürüst davranma", "children": []},
        ]},
        {"maddeNo": None, "title": "DÖRDÜNCÜ KİTAP", "children": [
            {"maddeNo": None, "title": "BİRİNCİ BÖLÜM", "children": [
                {"maddeNo": 683, "title": "A. Mülkiyet hakkının içeriği", "children": []},
                {"maddeNo": 684, "title": "1. Kapsamı", "children": []},
            ]},
        ]},
    ]
}


def test_title_lines_keep_only_sections_with_articles_in_range():
    lines = arastir.baslik_satirlari(TREE, 683, 700)
    assert lines == [
        "[DÖRDÜNCÜ KİTAP]",
        "  [BİRİNCİ BÖLÜM]",
        "    m. 683 — A. Mülkiyet hakkının içeriği",
        "    m. 684 — 1. Kapsamı",
    ]


def test_title_lines_without_range_list_everything():
    lines = arastir.baslik_satirlari(TREE, None, None)
    assert lines[0] == "[BAŞLANGIÇ]" and "  m. 2 — I. Dürüst davranma" in lines and len(lines) == 7

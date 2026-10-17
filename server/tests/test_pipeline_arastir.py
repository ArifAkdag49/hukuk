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


def test_empty_article_detection():
    assert arastir.bos_madde("Belirsiz alacak davası\nMADDE 107– (Mülga:16/7/2026-7589/19 md.)")
    assert arastir.bos_madde("MADDE 3- (İptal: Anayasa Mahkemesi’nin 16/2/2012 tarihli Kararı ile. )")
    assert not arastir.bos_madde("Madde 278- (İptal: AYM 30/6/2011; Değişik: 2/7/2012-6352/91 md.)\n(1) İşlenmekte olan bir suçu bildirmeyen kişi cezalandırılır.")
    assert not arastir.bos_madde("MADDE 193- (1) Birleşmeye katılanlar sorumludur.\n(2) (Mülga: 26/6/2012-6335/43 md.)")


def test_title_lines_without_range_list_everything():
    lines = arastir.baslik_satirlari(TREE, None, None)
    assert lines[0] == "[BAŞLANGIÇ]" and "  m. 2 — I. Dürüst davranma" in lines and len(lines) == 7

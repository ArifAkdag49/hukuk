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


def test_full_text_lines_strip_markup_and_blank_lines():
    raw = "<p>MADDE 1-&nbsp;Kanun, <b>sözüyle</b></p><br/>  ve   özüyle<div></div><div>GEÇİCİ MADDE 1- (Ek:8/6/2022-7409/4 md.)</div>"
    assert arastir.tam_metin_satirlari(raw) == [
        "MADDE 1- Kanun, sözüyle", "ve özüyle", "GEÇİCİ MADDE 1- (Ek:8/6/2022-7409/4 md.)"]


def test_full_text_search_numbers_lines_and_separates_distant_matches():
    lines = ["a", "GEÇİCİ MADDE 1- x", "b", "c", "d", "GEÇİCİ MADDE 2- y", "e"]
    assert arastir.ara(lines, "GEÇİCİ MADDE", baglam=0) == ["2: GEÇİCİ MADDE 1- x", "--", "6: GEÇİCİ MADDE 2- y"]
    assert arastir.ara(lines, "GEÇİCİ MADDE 1", baglam=1) == ["1: a", "2: GEÇİCİ MADDE 1- x", "3: b"]
    assert arastir.ara(lines, "yok", baglam=2) == []

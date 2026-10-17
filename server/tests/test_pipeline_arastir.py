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


def test_full_text_lines_join_article_heading_split_from_its_number():
    assert arastir.tam_metin_satirlari("<p>MADDE</p><p>201- Borca katılma</p><p>GEÇİCİ MADDE</p><p>2- Kira</p>") == [
        "MADDE 201- Borca katılma", "GEÇİCİ MADDE 2- Kira"]


def test_amendment_notes_since_a_year_from_notes_and_footnotes():
    metin = ("MADDE 18/B- (Ek:28/3/2023-7445/37 md.) (1) Dava şartı. (5) (Ek:7/11/2024-7531/26 md.) Tescil. "
             "(Değişik : 15/12/1999 - 4489/2 md.) (İptal: Anayasa Mahkemesinin 22/7/2020 tarihli ve E.: 2018/73, "
             "K.: 2020/40 sayılı Kararı ile.)\n[42] 24/11/2023 tarihli ve 7887 sayılı Cumhurbaşkanı Kararı ile yükseltilmiştir.")
    assert arastir.degisiklik_notlari(metin, 2020) == [
        "Ek:28/3/2023-7445/37 md.", "Ek:7/11/2024-7531/26 md.",
        "İptal: Anayasa Mahkemesinin 22/7/2020 tarihli ve E.: 2018/73, K.: 2020/40 sayılı Kararı ile.",
        "[42] 24/11/2023 tarihli ve 7887 sayılı Cumhurbaşkanı Kararı ile yükseltilmiştir."]
    assert arastir.degisiklik_notlari(metin, 2025) == []


def test_full_text_amendments_per_article_with_footnotes_attached_to_citing_article():
    satirlar = ["MADDE 1- Kanun.", "MADDE 2- (Değişik:", "16/7/2026-7589/10 md.) Faiz.",
                "MADDE 3- Tutar elli bin liradır.[7]", "GEÇİCİ MADDE 1- (Ek:8/6/2022-7409/4 md.)", "Kira.",
                "6098 SAYILI KANUNA İŞLENEMEYEN HÜKÜMLER", "GEÇİCİ MADDE 2 – (Değişik: 4/7/2012-6353/53 md.)",
                "[7] 24/11/2023 tarihli ve 7887 sayılı", "Cumhurbaşkanı Kararı ile yükseltilmiştir."]
    assert arastir.tam_degisiklikler(satirlar, 2022) == [
        "m. 2: Değişik: 16/7/2026-7589/10 md.",
        "geçici m. 1: Ek:8/6/2022-7409/4 md.",
        "m. 3: [7] 24/11/2023 tarihli ve 7887 sayılı Cumhurbaşkanı Kararı ile yükseltilmiştir."]
    assert "işlenemeyen hüküm, geçici m. 2: Değişik: 4/7/2012-6353/53 md." in arastir.tam_degisiklikler(satirlar, 2010)


def test_full_text_amendments_recognise_title_case_article_headings():
    satirlar = ["Kasten öldürme", "Madde 81 - (Değişik:24/12/2025-7571/14 md.) (1) Bir insanı", "Geçici Madde 1 - (Ek:7/11/2024-7531/15 md.)"]
    assert arastir.tam_degisiklikler(satirlar, 2024) == ["m. 81: Değişik:24/12/2025-7571/14 md.", "geçici m. 1: Ek:7/11/2024-7531/15 md."]
    assert arastir.tam_metin_satirlari("<p>Madde</p><p>82- Nitelikli</p>") == ["Madde 82- Nitelikli"]


def test_full_text_amendments_attach_margin_title_footnote_to_the_following_article():
    satirlar = ["Madde 219- (1) Din görevlisi cezalandırılır.", "DÖRDÜNCÜ KISIM", "Millete ve Devlete Karşı Suçlar",
                "BEŞİNCİ BÖLÜM", "Kamu Barışına Karşı Suçlar", "Suç işlemek amacıyla örgüt kurma[92]",
                "Madde 220- (1) Örgüt kuranlar dört yıldan sekiz yıla", "kadar hapis cezası ile cezalandırılır.",
                "B. Yarar ve", "hasar", "MADDE 208- Satılanın yarar ve hasarı (Ek:7/11/2024-7531/1 md.)",
                "[92] 24/12/2025 tarihli ve 7571 sayılı Kanunun 20 nci maddesiyle değiştirilmiştir."]
    assert arastir.tam_degisiklikler(satirlar, 2024) == [
        "m. 208: Ek:7/11/2024-7531/1 md.",
        "m. 220: [92] 24/12/2025 tarihli ve 7571 sayılı Kanunun 20 nci maddesiyle değiştirilmiştir."]


def test_full_text_lines_join_transitional_word_split_from_article_heading():
    assert arastir.tam_metin_satirlari("<p>Geçici</p><p>Madde 12- (Ek:23/1/2026-7573/6 md.)</p><p>EK</p><p>MADDE 3- Metin</p>") == [
        "Geçici Madde 12- (Ek:23/1/2026-7573/6 md.)", "EK MADDE 3- Metin"]

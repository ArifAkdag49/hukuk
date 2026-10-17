"""Elle yazılan konu taslağının denetimi ve sisteme uygun biçime çevrilmesi."""

from pipeline import elle

PLAN = {"slug": "deneme", "title": "Deneme Konusu", "unit_index": 3, "unit_title": "Ünite 3", "topic_index": 2}
METIN = {("TBK", "53"): {"kanun": "TÜRK BORÇLAR KANUNU", "kanun_no": "6098", "madde_no": "53", "metin": "MADDE 53- Ölüm hâlinde...", "kaynak": "u"},
         ("TBK", "54"): {"kanun": "TÜRK BORÇLAR KANUNU", "kanun_no": "6098", "madde_no": "54", "metin": "MADDE 54- Bedensel...", "kaynak": "u"}}
KUNYE = {"360322900": {"id": "360322900", "mahkeme": "Yargıtay 17. Hukuk Dairesi", "esas_no": "2014/20408", "karar_no": "2017/2550",
                       "karar_tarihi": "09.03.2017", "atif": "Yargıtay 17. Hukuk Dairesi, E.2014/20408 K.2017/2550, T.09.03.2017", "kaynak": "k"}}


def kelime(n, s="söz "):
    return (s * n).strip()


def taslak(**over):
    t = {
        "slug": "deneme",
        "beceriler": ["borclar-hukuku-genel/borca-aykirilik-tazminat"],
        "maddeler": [{"kanun": "TBK", "madde": "53"}, {"kanun": "TBK", "madde": "54"}],
        "ozet": kelime(200) + " TBK m. 53",
        "anlatim": kelime(1300) + " TBK m. 53/1 ve TBK m. 54 ile (m. 53) birlikte.",
        "kritik": "\n".join(f"- madde {i}" for i in range(9)),
        "doktrin": "Baskın görüşe göre ...",
        "sozluk": [{"terim": f"t{i}", "tanim": "tanım"} for i in range(6)],
        "kararlar": [{"id": "360322900", "ozet": kelime(40)}],
        "sorular": [
            {"soru": f"Soru {i}?", "siklar": [f"a{i}", f"b{i}", f"c{i}", f"d{i}"], "dogru": 1, "aciklama": "TBK m. 54 gereği."}
            for i in range(15)
        ],
        "olaylar": [
            {"olay": "Olay", "olcut": [{"tespit": "x", "puan": 60, "madde": "TBK m. 53"}, {"tespit": "y", "puan": 40, "madde": ""}],
             "cozum": kelime(160)}
            for _ in range(2)
        ],
        "kartlar": [{"on": f"ön {i}", "arka": f"arka {i}"} for i in range(12)],
    }
    t.update(over)
    return t


def kontrol(t):
    return elle.kontrol_et("HUK2011", t, PLAN, METIN, KUNYE)


def test_valid_draft_becomes_loadable_doc_with_official_texts_and_case_citation():
    doc, hatalar, uyarilar = kontrol(taslak())
    assert hatalar == [] and uyarilar == []
    assert doc["unit_index"] == 3 and doc["title"] == "Deneme Konusu"
    assert doc["articles"][0]["official_text"].startswith("MADDE 53") and doc["articles"][0]["verified"]
    case = doc["cases"][0]
    assert (case["court"], case["chamber"], case["esas_no"]) == ("Yargıtay", "17. Hukuk Dairesi", "2014/20408")
    assert doc["verification"]["status"] == "verified"
    q = doc["mcq"][0]
    assert q["options"][q["correct_option"]] == "b0"  # karıştırılsa da doğru şık korunur


def test_citation_of_unlisted_article_is_an_error():
    _, hatalar, _ = kontrol(taslak(anlatim=kelime(1300) + " Ayrıca TBK m. 49 ve TMK m. 2"))
    assert any("TBK m. 49" in h for h in hatalar)
    assert any("TMK m. 2" in h for h in hatalar)


def test_ranges_and_lists_are_all_checked():
    _, hatalar, _ = kontrol(taslak(kritik="\n".join(f"- k{i}" for i in range(8)) + "\n- TBK m. 53-56 arası ve TBK m. 54, 58"))
    assert any("TBK m. 56" in h for h in hatalar) and any("TBK m. 58" in h for h in hatalar)
    assert not any("TBK m. 54" in h for h in hatalar)


def test_rubric_points_must_sum_to_100():
    bad = taslak()
    bad["olaylar"][0]["olcut"][0]["puan"] = 50
    _, hatalar, _ = kontrol(bad)
    assert any("toplamı 100" in h for h in hatalar)


def test_case_id_must_come_from_search_cache():
    _, hatalar, _ = kontrol(taslak(kararlar=[{"id": "999", "ozet": kelime(40)}]))
    assert any("999" in h for h in hatalar)


def test_article_without_official_text_is_an_error():
    _, hatalar, _ = kontrol(taslak(maddeler=[{"kanun": "TBK", "madde": "53"}, {"kanun": "TBK", "madde": "54"}, {"kanun": "TBK", "madde": "9999"}]))
    assert any("9999" in h for h in hatalar)


def test_mcq_needs_four_distinct_options_and_valid_answer():
    sorular = taslak()["sorular"]
    sorular[0] = {"soru": "S?", "siklar": ["a", "a", "b", "c"], "dogru": 1, "aciklama": "x"}
    sorular[1] = {"soru": "S?", "siklar": ["a", "b", "c", "d"], "dogru": 4, "aciklama": "x"}
    _, hatalar, _ = kontrol(taslak(sorular=sorular))
    assert any("Soru 1" in h for h in hatalar) and any("Soru 2" in h for h in hatalar)


def test_too_short_content_is_an_error():
    _, hatalar, _ = kontrol(taslak(anlatim="kısa TBK m. 53"))
    assert any("anlatım" in h.lower() for h in hatalar)


def test_option_letter_reference_in_explanation_is_a_warning():
    sorular = taslak()["sorular"]
    sorular[0]["aciklama"] = "Doğru cevap B şıkkıdır."
    doc, hatalar, uyarilar = kontrol(taslak(sorular=sorular))
    assert hatalar == [] and any("şık harfi" in u for u in uyarilar)
    assert doc["verification"]["status"] == "partial"

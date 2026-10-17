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


def test_paragraph_item_notation_is_not_read_as_a_second_article():
    # "m. 53/1-3" = 53. madde 1. fıkra 3. bent; 3. madde değil
    assert elle.refs_in("TBK m. 53/1-3 ve TBK m. 54/1-4; ayrıca m. 53/1-2", "TBK") == {("TBK", "53", None), ("TBK", "54", None)}
    assert elle.refs_in("TBK m. 53-56", "TBK") == {("TBK", "53", None), ("TBK", "56", None)}


def test_single_letter_after_slash_is_kept_for_lettered_articles():
    assert elle.refs_in("TCK m. 123/A, İİK m. 68/a ve m. 56/I", "TCK") == {
        ("TCK", "123", "A"), ("İİK", "68", "a"), ("TCK", "56", "I")}


def test_lettered_article_must_be_listed_but_roman_paragraph_uses_base_article():
    metin = {**METIN, ("TBK", "55/A"): {"kanun": "TBK", "kanun_no": "6098", "madde_no": "55/A", "metin": "MADDE 55/A- ...", "kaynak": "u"}}
    t = taslak(maddeler=[{"kanun": "TBK", "madde": "53"}, {"kanun": "TBK", "madde": "54"}, {"kanun": "TBK", "madde": "55/A"}],
               anlatim=kelime(1300) + " TBK m. 55/A ile TBK m. 53/I birlikte; ama TBK m. 56/A listede yok.")
    _, hatalar, _ = elle.kontrol_et("HUK2011", t, PLAN, metin, KUNYE)
    assert hatalar == ["anlatim: TBK m. 56/A atfı var ama maddeler listesinde yok"]


def test_yaml_on_key_is_card_front():
    import yaml

    # PyYAML çıplak `on:` anahtarını True'ya çevirir; kart ön yüzü yine okunmalı
    kartlar = yaml.safe_load("\n".join(f"- on: ön {i}\n  arka: arka {i}" for i in range(12)))
    doc, hatalar, _ = kontrol(taslak(kartlar=kartlar))
    assert hatalar == [] and doc["cards"][0]["front_md"] == "ön 0"


def test_rubric_points_must_sum_to_100():
    bad = taslak()
    bad["olaylar"][0]["olcut"][0]["puan"] = 50
    _, hatalar, _ = kontrol(bad)
    assert any("toplamı 100" in h for h in hatalar)


def test_case_id_must_come_from_search_cache():
    _, hatalar, _ = kontrol(taslak(kararlar=[{"id": "999", "ozet": kelime(40)}]))
    assert any("999" in h for h in hatalar)


def test_case_must_be_read_before_use():
    kunye = {**KUNYE["360322900"], "okundu": False}
    _, hatalar, _ = elle.kontrol_et("HUK2011", taslak(), PLAN, METIN, {"360322900": kunye})
    assert any("okunmadı" in h and "360322900" in h for h in hatalar)


def test_kunye_takes_numbers_from_the_decision_header(tmp_path, monkeypatch):
    import json

    from pipeline import arastir

    monkeypatch.setattr(arastir, "ICTIHAT_DIR", tmp_path / "ictihat")
    monkeypatch.setattr(arastir, "KARAR_DIR", tmp_path / "karar")
    (tmp_path / "ictihat").mkdir()
    (tmp_path / "karar").mkdir()
    arastir.ictihat_path("76942300").write_text(json.dumps({
        "id": "76942300", "mahkeme": "Yargıtay Hukuk Genel Kurulu", "esas_no": "2011/3", "karar_no": "2011/142",
        "karar_tarihi": "13.04.2011", "atif": "Yargıtay Hukuk Genel Kurulu, E.2011/3 K.2011/142, T.13.04.2011",
    }), encoding="utf-8")
    assert arastir.kunye("76942300")["okundu"] is False  # metin okunmadan künye aynen döner

    arastir.karar_path("76942300").write_text('Hukuk Genel Kurulu         2011/17-3 E.  ,  2011/142 K.\n\n"İçtihat Metni"...', encoding="utf-8")
    k = arastir.kunye("76942300")
    assert k["okundu"] is True and k["esas_no"] == "2011/17-3"
    assert k["atif"] == "Yargıtay Hukuk Genel Kurulu, E.2011/17-3 K.2011/142, T.13.04.2011"
    assert arastir.kunye("yok") is None


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

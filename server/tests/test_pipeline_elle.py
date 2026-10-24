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
    assert elle.refs_in("TCK m. 123/A, İİK m. 68/a; ayrıca m. 56/I", "TCK") == {
        ("TCK", "123", "A"), ("İİK", "68", "a"), ("TCK", "56", "I")}


def test_law_cited_by_number_and_stisk_alias():
    refs = elle.refs_in("1475 sayılı Kanun m. 14 ile 5510 sayılı Kanunun m. 21 ve STİSK m. 25; ayrıca m. 18", "İK")
    assert refs == {("1475", "14", None), ("5510", "21", None), ("STİSK", "25", None), ("İK", "18", None)}
    assert elle.canon("Stisk") == "STİSK" and elle.canon("1475") == "1475"


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


def test_topic_without_statutes_may_have_no_articles_but_citations_still_need_listing():
    plan = {**PLAN, "kanunsuz": True}
    bos = {"maddeler": [], "anlatim": kelime(1300), "ozet": kelime(200), "sorular": [
        {**s, "aciklama": "Kanunnameler örfi hukuktur."} for s in taslak()["sorular"]],
        "olaylar": [{**o, "olcut": [{**c, "madde": ""} for c in o["olcut"]]} for o in taslak()["olaylar"]]}
    _, hatalar, _ = elle.kontrol_et("HUK2012", taslak(**bos), plan, {}, KUNYE)
    assert hatalar == []
    _, hatalar, _ = elle.kontrol_et("HUK2012", taslak(**{**bos, "anlatim": kelime(1300) + " TMK m. 1"}), plan, {}, KUNYE)
    assert hatalar == ["anlatim: TMK m. 1 atfı var ama maddeler listesinde yok"]
    _, hatalar, _ = elle.kontrol_et("HUK2011", taslak(**bos), PLAN, {}, KUNYE)
    assert "maddeler listesi boş" in hatalar


def test_rubric_points_must_sum_to_100():
    bad = taslak()
    bad["olaylar"][0]["olcut"][0]["puan"] = 50
    _, hatalar, _ = kontrol(bad)
    assert any("toplamı 100" in h for h in hatalar)


def test_case_id_must_come_from_search_cache():
    _, hatalar, _ = kontrol(taslak(kararlar=[{"id": "999", "ozet": kelime(40)}]))
    assert any("999" in h for h in hatalar)


def test_international_case_takes_citation_from_draft_with_official_source():
    uad = {"uluslararasi": True, "mahkeme": "Uluslararası Adalet Divanı", "ad": "Reparation for Injuries (danışma görüşü)",
           "tarih": "11.04.1949", "kaynak": "https://legal.un.org/icjsummaries/documents/english/st_leg_serf1.pdf",
           "ozet": kelime(40)}
    doc, hatalar, _ = kontrol(taslak(kararlar=[uad]))
    assert hatalar == []
    case = doc["cases"][0]
    assert (case["court"], case["chamber"], case["decision_date"]) == (
        "Uluslararası Adalet Divanı", "Reparation for Injuries (danışma görüşü)", "11.04.1949")


def test_international_case_needs_official_source_and_date_format():
    uad = {"uluslararasi": True, "mahkeme": "UAD", "ad": "Lotus", "tarih": "1927", "kaynak": "https://blog.example.com/lotus",
           "ozet": kelime(40)}
    _, hatalar, _ = kontrol(taslak(kararlar=[uad]))
    assert any("gg.aa.yyyy" in h for h in hatalar)
    _, hatalar, _ = kontrol(taslak(kararlar=[{**uad, "tarih": "07.09.1927"}]))
    assert any("resmî" in h for h in hatalar)


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


def test_question_summary_shows_correct_option_wrong_options_and_case_result():
    t = {"sorular": [{"soru": "Soru\n  metni?", "siklar": ["a", "b", "c", "d"], "dogru": 2, "aciklama": "Çünkü  c."}],
         "olaylar": [{"cozum": "Giriş paragrafı.\n\n**Sonuç:** Davacı haklıdır."}]}
    out = elle.soru_ozeti(t)
    assert "S1. Soru metni?\n   ✓ c\n   ✗ a | b | d\n   → Çünkü c." in out
    assert "OLAY 1 SONUÇ: Davacı haklıdır." in out


def test_topic_map_numbers_topics_across_units_and_lists_articles():
    cur = {"units": [
        {"title": "Ünite 1: Giriş", "topics": [
            {"slug": "a", "title": "Konu A", "maddeler": [{"kanun": "TBK", "madde": "1"}, {"kanun": "6216", "madde": "45"}]}]},
        {"title": "Ünite 2: Tarih", "topics": [{"slug": "b", "title": "Konu B", "maddeler": []}]},
    ]}
    assert elle.konu_haritasi(cur) == (
        "- Ünite 1: Giriş\n"
        "  1. Konu A (`a`; müfredat maddeleri: TBK 1, 6216 45)\n"
        "- Ünite 2: Tarih\n"
        "  2. Konu B (`b`; müfredatta madde yok)"
    )


def test_bare_article_right_after_another_law_reference_belongs_to_that_law():
    assert elle.refs_in("İİK m. 195, m. 200 ve m. 201 uyarınca", "TBK") == {
        ("İİK", "195", None), ("İİK", "200", None), ("İİK", "201", None)}
    assert elle.refs_in("HMK m. 141 ve m. 132", "TBK") == {("HMK", "141", None), ("HMK", "132", None)}


def test_bare_article_later_in_the_sentence_still_belongs_to_the_primary_law():
    assert elle.refs_in("İİK m. 89'a göre ihbar yapılır; alacak ise m. 183'e göre devredilir.", "TBK") == {
        ("İİK", "89", None), ("TBK", "183", None)}


def test_kunye_falls_back_to_the_decision_text_when_there_is_no_search_record(tmp_path, monkeypatch):
    from pipeline import arastir

    monkeypatch.setattr(arastir, "ICTIHAT_DIR", tmp_path / "ictihat")
    monkeypatch.setattr(arastir, "KARAR_DIR", tmp_path / "karar")
    (tmp_path / "karar").mkdir()
    arastir.karar_path("1230291000").write_text(
        '11. Hukuk Dairesi         2025/6374 E.  ,  2026/3284 K.\n\n"İçtihat Metni"\nMAHKEMESİ : Samsun BAM\n...\n'
        "aşağıda yazılı temyiz giderinin temyiz edene yükletilmesine, 04.06.2026 tarihinde kesin olarak oy birliğiyle karar verildi.",
        encoding="utf-8")
    k = arastir.kunye("1230291000")
    assert k["okundu"] is True
    assert (k["mahkeme"], k["esas_no"], k["karar_no"], k["karar_tarihi"]) == (
        "Yargıtay 11. Hukuk Dairesi", "2025/6374", "2026/3284", "04.06.2026")
    assert k["atif"] == "Yargıtay 11. Hukuk Dairesi, E.2025/6374 K.2026/3284, T.04.06.2026"
    assert k["kaynak"] == "https://karararama.yargitay.gov.tr/getDokuman?id=1230291000"

    arastir.karar_path("1206065200").write_text('Hukuk Genel Kurulu         2024/629 E.  ,  2025/723 K.\n\nmetin, 19.11.2025 tarihinde karar verildi.', encoding="utf-8")
    assert arastir.kunye("1206065200")["mahkeme"] == "Yargıtay Hukuk Genel Kurulu"

    arastir.karar_path("5").write_text("HATA: Bedesten ...", encoding="utf-8")
    assert arastir.kunye("5") is None  # başlığı okunamayan metinden künye üretilmez

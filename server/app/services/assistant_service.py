"""Canlı asistan: bilgi bankası + resmî kaynak araçları + web araması.

Sonnet 5.5 varsayılan; "Daha derin cevap" Opus 5.5. Araç döngüsü en fazla
MAX_TURNS tur; araç hataları `is_error` ile modele iletilir ve model madde ya da
karar uydurmak yerine kaynağa ulaşılamadığını söyler.
"""

import asyncio
import json
import uuid

from .. import db, llm, search
from ..mcp_hub import ASSISTANT_TOOLS, hub

MAX_TURNS = 8
HISTORY_LIMIT = 20
SUGGEST_NEW_AFTER = 20
TOOL_RESULT_LIMIT = 20_000  # karar tam metni 5-30 bin token olabiliyor; her turda yeniden gönderiliyor

SYSTEM = """Sen bir hukuk fakültesi öğrencisine ders çalışmada yardım eden asistansın (Marmara Üniversitesi, 2. ve 3. sınıf dersleri). Türkçe, sade ve öğretici cevap ver; gerekirse kısa örnekle somutlaştır.

Kaynak kuralları:
- Önce `bilgi_bankasi_ara` ile öğrencinin bilgi bankasına ve notlarına bak.
- Bir kanun maddesine numarasıyla atıf yapmadan önce `madde_getir` ile resmî metni al; metni çarpıtmadan aktar.
- Bir karara atıf yapmadan önce `ictihat_ara` ile bul; künyeyi aracın verdiği gibi kullan, asla uydurma.
- Güncel değişiklikler (yeni kanun, Resmî Gazete, yürürlük) için web aramasını kullan.
- Bir araç hata verirse ya da sonuç bulamazsa bunu açıkça söyle ("resmî kaynağa şu an ulaşılamıyor"); madde, karar ya da tarih uydurma.
- Doktrin görüşlerini yazar adı vermeden aktar.
- Bu bir hukuki danışmanlık değildir; somut bir uyuşmazlıkta öğrenciyi bir avukata yönlendir.

Biçim: markdown, kısa paragraflar ve gerektiğinde madde işaretleri. Cevabın sonunda kaynak listesi yazma; uygulama kaynakları ayrıca gösteriyor."""

KB_TOOL = {
    "name": "bilgi_bankasi_ara",
    "description": "Öğrencinin bilgi bankasındaki konu anlatımlarında ve yüklediği ders notlarında arama yapar.",
    "input_schema": {
        "type": "object",
        "properties": {"sorgu": {"type": "string", "description": "Aranacak kavram ya da sözcükler"}},
        "required": ["sorgu"],
        "additionalProperties": False,
    },
}
WEB_SEARCH = {"type": "web_search_20260209", "name": "web_search", "max_uses": 3}
TOOLS = [KB_TOOL, *ASSISTANT_TOOLS, WEB_SEARCH]


def _block_type(b) -> str:
    return getattr(b, "type", None) or (b.get("type") if isinstance(b, dict) else "")


async def _run_tool(name: str, args: dict, sources: list[dict]) -> tuple[str, bool]:
    if name == "bilgi_bankasi_ara":
        hits = await db.run(search.search_kb, args.get("sorgu", ""), 5)
        for h in hits:
            sources.append({"type": "kb", "label": h["title"], "ref": h["id"]})
        return json.dumps(hits or {"sonuc": "eşleşme yok"}, ensure_ascii=False), False

    text, is_error = await hub.call(name, args)
    if is_error:
        return text, True
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        data = None
    if name == "madde_getir" and isinstance(data, dict):
        sources.append({"type": "madde", "label": f"{data.get('kanun', args.get('kanun'))} m. {data.get('madde_no', args.get('madde_no'))}", "ref": data.get("kaynak") or ""})
    elif name == "ictihat_ara" and isinstance(data, dict):
        for r in (data.get("sonuclar") or [])[:3]:
            sources.append({"type": "karar", "label": r.get("atif") or r.get("mahkeme", ""), "ref": r.get("kaynak") or ""})
    elif name == "karar_getir" and isinstance(data, dict):
        label = data.get("atif") or data.get("kunye") or args.get("karar_id")
        sources.append({"type": "karar", "label": str(label), "ref": data.get("kaynak") or ""})
    return text, False


def _collect_web_sources(content, sources: list[dict]) -> None:
    for b in content or []:
        if _block_type(b) != "web_search_tool_result":
            continue
        results = getattr(b, "content", None)
        if not isinstance(results, list):  # hata nesnesi
            continue
        for r in results[:4]:
            url = getattr(r, "url", None)
            if url:
                sources.append({"type": "web", "label": getattr(r, "title", None) or url, "ref": url})


def _truncate(text: str) -> str:
    if len(text) <= TOOL_RESULT_LIMIT:
        return text
    return text[:TOOL_RESULT_LIMIT] + "\n\n[… metin kısaltıldı; tamamı için kaynak bağlantısına bakın]"


def _dedupe(sources: list[dict]) -> list[dict]:
    seen, out = set(), []
    for s in sources:
        key = (s["type"], s["ref"] or s["label"])
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out


def _history(thread_id: str) -> list[dict]:
    rows = db.fetch_all(
        "select role, content_md from (select role, content_md, created_at from chat_messages "
        "where thread_id = %s order by created_at desc limit %s) x order by created_at",
        [thread_id, HISTORY_LIMIT],
    )
    msgs = [{"role": r["role"], "content": r["content_md"]} for r in rows]
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    return msgs


def _topic_block(topic_id: str | None) -> list[dict]:
    if not topic_id:
        return []
    t = db.fetch_one("select title, summary_md, critical_md from topics where id = %s", [topic_id])
    if t is None:
        return []
    return [{"type": "text", "text": f"Öğrenci şu konuyu çalışıyor: {t['title']}\n\nÖzet:\n{t['summary_md']}\n\nKritik noktalar:\n{t['critical_md']}"}]


async def answer(thread: dict, content: str, deep: bool) -> dict:
    tid = str(thread["id"])
    prior = await db.run(_history, tid)
    is_first = not prior
    messages = prior + [{"role": "user", "content": content}]
    system = [{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}] + await db.run(_topic_block, thread.get("topic_id"))
    model = llm.OPUS if deep else llm.SONNET
    sources: list[dict] = []

    resp = None
    for _ in range(MAX_TURNS):
        resp = await llm.create(
            "asistan-derin" if deep else "asistan",
            model=model,
            max_tokens=16000,
            system=system,
            tools=TOOLS,
            output_config={"effort": "high" if deep else "medium"},
            messages=messages,
        )
        _collect_web_sources(resp.content, sources)
        if resp.stop_reason == "pause_turn":
            messages = messages + [{"role": "assistant", "content": resp.content}]
            continue
        if resp.stop_reason != "tool_use":
            break
        calls = [b for b in resp.content if _block_type(b) == "tool_use"]
        outputs = await asyncio.gather(*(_run_tool(c.name, dict(c.input), sources) for c in calls))
        results = [
            {"type": "tool_result", "tool_use_id": c.id, "content": _truncate(text), **({"is_error": True} if err else {})}
            for c, (text, err) in zip(calls, outputs)
        ]
        messages = messages + [{"role": "assistant", "content": resp.content}, {"role": "user", "content": results}]
    else:
        # tur sınırı doldu ve model hâlâ araç istiyor: araçsız son bir cevap al;
        # yoksa "şimdi buna bakıyorum" gibi bir ara cümle cevap diye kaydedilir
        if resp is not None and resp.stop_reason == "tool_use":
            resp = await llm.create(
                "asistan-derin" if deep else "asistan",
                model=model,
                max_tokens=16000,
                system=system,
                tools=TOOLS,
                tool_choice={"type": "none"},
                output_config={"effort": "high" if deep else "medium"},
                messages=messages,
            )
            _collect_web_sources(resp.content, sources)

    # atıflı cevaplar birçok text bloğuna bölünür; bloklar aynı cümlenin parçalarıdır
    text = "".join(b.text for b in (resp.content if resp else []) if _block_type(b) == "text").strip()
    if not text:
        text = "Bu soruya şu an bir cevap üretemedim. Soruyu biraz daha açarak tekrar dener misin?"
    msg = {
        "id": str(uuid.uuid4()),
        "thread_id": tid,
        "role": "assistant",
        "content_md": text,
        "sources": _dedupe(sources),
        "model": model,
    }
    await db.run(_save, tid, content, msg)
    if is_first and thread.get("title") in (None, "", "Yeni sohbet"):
        await _title(tid, content)
    count = (await db.run(db.fetch_one, "select count(*) as n from chat_messages where thread_id = %s", [tid]))["n"]
    saved = await db.run(db.fetch_one, "select created_at from chat_messages where id = %s", [msg["id"]])
    msg["created_at"] = saved["created_at"]
    return {"message": msg, "suggest_new_thread": count >= SUGGEST_NEW_AFTER}


def _save(tid: str, user_text: str, msg: dict) -> None:
    with db.pool().connection() as conn, conn.transaction():
        conn.execute(
            "insert into chat_messages (id, thread_id, role, content_md) values (%s, %s, 'user', %s)",
            [str(uuid.uuid4()), tid, user_text],
        )
        conn.execute(
            "insert into chat_messages (id, thread_id, role, content_md, sources, model, created_at) "
            "values (%s, %s, 'assistant', %s, %s, %s, clock_timestamp())",
            [msg["id"], tid, msg["content_md"], db.json(msg["sources"]), msg["model"]],
        )


async def _title(tid: str, question: str) -> None:
    try:
        r = await llm.create(
            "asistan-baslik",
            model=llm.HAIKU,
            max_tokens=200,
            output_config={"effort": "low"},
            messages=[{"role": "user", "content": f"Bu soruya 3-6 kelimelik Türkçe bir sohbet başlığı ver, yalnızca başlığı yaz:\n\n{question[:1000]}"}],
        )
        title = "".join(b.text for b in r.content if _block_type(b) == "text").strip().strip('"')[:80]
    except Exception:
        title = question[:60]
    if title:
        await db.run(db.execute, "update chat_threads set title = %s where id = %s", [title, tid])

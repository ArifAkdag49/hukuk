"""Bilgi bankası ve notlarda Türkçe tam metin arama (Postgres `turkish`)."""

import re

from . import db

_SQL = """
with q as (select {tsq} as query)
select 'topic' as kind, t.id::text as id, t.title,
       ts_headline('turkish', t.summary_md || ' ' || t.content_md, q.query,
                   'MaxWords=40, MinWords=15, MaxFragments=2') as snippet,
       ts_rank(t.search_tsv, q.query) as rank
from topics t, q where t.search_tsv @@ q.query
union all
select 'note', n.id::text, n.title,
       ts_headline('turkish', coalesce(n.summary_md, '') || ' ' || coalesce(n.extracted_text, ''), q.query,
                   'MaxWords=40, MinWords=15, MaxFragments=2'),
       ts_rank(n.search_tsv, q.query)
from notes n, q where n.status = 'ready' and n.search_tsv @@ q.query
order by rank desc limit %(limit)s
"""


def _words(query: str) -> list[str]:
    return [w for w in re.findall(r"\w+", query.lower()) if len(w) > 2]


def search_kb(query: str, limit: int = 5) -> list[dict]:
    if not _words(query):
        return []
    rows = db.fetch_all(_SQL.format(tsq="websearch_to_tsquery('turkish', %(q)s)"), {"q": query, "limit": limit})
    if not rows:  # tüm sözcükler birlikte geçmiyorsa herhangi biri
        rows = db.fetch_all(
            _SQL.format(tsq="to_tsquery('turkish', %(q)s)"), {"q": " | ".join(_words(query)), "limit": limit}
        )
    for r in rows:
        r.pop("rank", None)
        r["snippet"] = (r["snippet"] or "").replace("<b>", "").replace("</b>", "")
    return rows

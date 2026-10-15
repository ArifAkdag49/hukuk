"""İçerik hattı.

    python -m pipeline courses              # 14 dersi veritabanına kaydet
    python -m pipeline curriculum HUK2011   # konu ağacı → pipeline/curriculum/HUK2011.yaml
    python -m pipeline generate HUK2011 [--topic SLUG]
    python -m pipeline tables HUK2011
    python -m pipeline load HUK2011
    python -m pipeline all HUK2011          # curriculum (yoksa) + generate + tables + load
    python -m pipeline status [HUK2011]
"""

import argparse
import asyncio
import sys

from . import common, generate


async def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pipeline")
    ap.add_argument("cmd", choices=["courses", "curriculum", "generate", "tables", "load", "all", "status"])
    ap.add_argument("course", nargs="?")
    ap.add_argument("--topic")
    ap.add_argument("--concurrency", type=int, default=3)
    a = ap.parse_args(argv)

    async with common.Runtime(with_sources=a.cmd in ("curriculum", "generate", "all", "tables")) as rt:
        from app import db

        from . import load

        if a.cmd == "courses":
            load.ensure_courses([common.course_row(c) for c in common.courses()])
            print(f"{len(common.courses())} ders kaydedildi")
            return 0

        if a.cmd == "status":
            rows = db.fetch_all(
                "select split_part(feature, ':', 2) as ders, split_part(feature, ':', 3) as adim, "
                "count(*) as cagri, round(sum(cost_usd)::numeric, 4) as usd from api_usage "
                "where feature like 'pipeline:%%' group by 1, 2 order by 1, 2"
            )
            for r in rows:
                print(f"{r['ders']:8} {r['adim']:12} {r['cagri']:4} çağrı  ${r['usd']}")
            total = sum(float(r["usd"]) for r in rows)
            print(f"TOPLAM ${total:.2f}")
            if a.course:
                docs = generate.read_outputs(a.course)
                for d in docs:
                    print(f"  {d['slug']:40} {d['verification']['status']:9} mcq={len(d['mcq'])} olay={len(d['cases_q'])} "
                          f"kart={len(d['cards'])} karar={len(d['cases'])} madde={sum(1 for x in d['articles'] if x['verified'])}/{len(d['articles'])}")
            return 0

        course = common.course(a.course)
        if a.cmd in ("curriculum", "all"):
            if a.cmd == "curriculum" or not (common.CURRICULUM / f"{course['id']}.yaml").exists():
                cur = await generate.make_curriculum(course)
                n = sum(len(u["topics"]) for u in cur["units"])
                print(f"müfredat: {len(cur['units'])} ünite, {n} konu")
        if a.cmd in ("generate", "all"):
            failed = await generate.generate_course(rt.hub, course, only=a.topic, concurrency=a.concurrency)
            if failed:
                print("BAŞARISIZ KONULAR:\n" + "\n".join(failed))
        if a.cmd in ("tables", "all"):
            tables = await generate.make_tables(course)
            print(f"tablolar: {len(tables)}")
        if a.cmd in ("load", "all"):
            docs = generate.read_outputs(course["id"])
            load.load_course(common.course_row(course), docs, generate.read_tables(course["id"]) or None)
            print(f"yüklendi: {len(docs)} konu")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main(sys.argv[1:])))

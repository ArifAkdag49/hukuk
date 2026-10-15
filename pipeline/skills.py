"""Beceri kütüphanesinden (aydincan/turk-hukuku-ve-claude) ders bağlamı üretir.

Metinler model çağrılarında sistem talimatının sabit, önbelleğe alınan kısmına
konur; kaynak deposunun lisansı (Apache-2.0 / MIT) ve atfı korunur.
"""

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor" / "turk-hukuku-ve-claude"

ATIF_SKILLS = [
    "atif-turk-hukuku/skills/uydurma-icerik-tespiti-anti-hallusinasyon/SKILL.md",
    "atif-turk-hukuku/skills/mevzuat-atfi-ve-yururluk/SKILL.md",
]


def _strip_frontmatter(text: str) -> str:
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[end + 4 :].lstrip()
    return text


def plugin_skill_names(plugin: str) -> list[str]:
    d = VENDOR / plugin / "skills"
    return sorted(p.name for p in d.iterdir() if (p / "SKILL.md").exists()) if d.exists() else []


def course_bundle(plugins: list[str], full_first: bool = True) -> tuple[str, list[str]]:
    """İlk eklentinin tüm becerileri + diğerlerinin genel bakışı + atıf kuralları.

    Dönen: (metin, kullanılan beceri yolları)
    """
    parts: list[str] = []
    refs: list[str] = []
    for i, plugin in enumerate(plugins):
        base = VENDOR / plugin
        if not base.exists():
            continue
        method = sorted((base / "references").glob("*.md")) if (base / "references").exists() else []
        files = list(method)
        names = plugin_skill_names(plugin) if (i == 0 and full_first) else ["genel-bakis"]
        files += [base / "skills" / n / "SKILL.md" for n in names if (base / "skills" / n / "SKILL.md").exists()]
        for f in files:
            rel = f.relative_to(VENDOR).as_posix()
            refs.append(rel)
            parts.append(f"<beceri yol=\"{rel}\">\n{_strip_frontmatter(f.read_text(encoding='utf-8'))}\n</beceri>")
    for rel in ATIF_SKILLS:
        f = VENDOR / rel
        if f.exists():
            refs.append(rel)
            parts.append(f"<beceri yol=\"{rel}\">\n{_strip_frontmatter(f.read_text(encoding='utf-8'))}\n</beceri>")
    return "\n\n".join(parts), refs

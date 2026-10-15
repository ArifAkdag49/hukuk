"""Hukuki kaynak araçları: içtihat (MCP, stdio) ve mevzuat (bedesten).

Tüm hatalar uydurmaya yol açmasın diye açık bir metinle ve `is_error=True`
olarak döner; model bu metni görüp "resmî kaynağa ulaşılamıyor" der.
"""

import json
import os
import shutil
import sys
from contextlib import AsyncExitStack
from typing import Any

import anyio

from . import mevzuat

TIMEOUT_S = 60
UNAVAILABLE = "Resmî kaynağa şu anda ulaşılamıyor"

ASSISTANT_TOOLS: list[dict] = [
    {
        "name": "mevzuat_ara",
        "description": "Türk kanunlarında ada göre arama yapar; kanun numarasını bilmiyorsan önce bunu çağır.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ifade": {"type": "string", "description": "Kanun adından sözcükler, ör. 'borçlar'"},
                "adet": {"type": "integer", "description": "En fazla sonuç (1-10)"},
            },
            "required": ["ifade"],
            "additionalProperties": False,
        },
    },
    {
        "name": "madde_getir",
        "description": (
            "Bir kanun maddesinin RESMÎ güncel metnini getirir. Bir maddeye atıf yapmadan önce mutlaka çağır; "
            "metni aynen aktar. metin boşsa madde bulunamamıştır, uydurma."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "kanun": {"type": "string", "description": "Kısaltma (TBK, TMK, TCK, HMK, TTK, İİK, AY...) ya da kanun numarası"},
                "madde_no": {"type": "string", "description": "Madde numarası, ör. '49' veya '5/A'"},
            },
            "required": ["kanun", "madde_no"],
            "additionalProperties": False,
        },
    },
    {
        "name": "ictihat_ara",
        "description": (
            "Türk yargı kararı arar; künye, hazır atıf dizesi ve id döndürür. Bir karara atıf yapmadan önce çağır; "
            "künyeyi aynen kullan, uydurma."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ifade": {"type": "string", "description": "Aranacak sözcükler; tam ifade için çift tırnak"},
                "mahkeme": {"type": "string", "enum": ["adli", "yargitay", "emsal", "idari", "anayasa", "norm"]},
                "adet": {"type": "integer", "description": "En fazla sonuç (2-10)"},
            },
            "required": ["ifade"],
            "additionalProperties": False,
        },
    },
    {
        "name": "karar_getir",
        "description": "Bir kararın resmî tam metnini getirir (id ve mahkeme ictihat_ara sonucundan).",
        "input_schema": {
            "type": "object",
            "properties": {
                "karar_id": {"type": "string"},
                "mahkeme": {"type": "string", "enum": ["adli", "yargitay", "emsal", "idari", "anayasa", "norm"]},
            },
            "required": ["karar_id"],
            "additionalProperties": False,
        },
    },
]

TOOL_NAMES = {t["name"] for t in ASSISTANT_TOOLS}


def _ictihat_command() -> str:
    found = shutil.which("turk-hukuku-ictihat")
    if found:
        return found
    exe = "turk-hukuku-ictihat.exe" if os.name == "nt" else "turk-hukuku-ictihat"
    return os.path.join(os.path.dirname(sys.executable), exe)


class McpHub:
    def __init__(self) -> None:
        self._ictihat: Any = None
        self._stack: AsyncExitStack | None = None

    async def start(self) -> None:
        from mcp import ClientSession
        from mcp.client.stdio import StdioServerParameters, stdio_client

        self._stack = AsyncExitStack()
        read, write = await self._stack.enter_async_context(
            stdio_client(StdioServerParameters(command=_ictihat_command()))
        )
        session = await self._stack.enter_async_context(ClientSession(read, write))
        await session.initialize()
        self._ictihat = session

    async def stop(self) -> None:
        if self._stack is not None:
            await self._stack.aclose()
        self._stack = None
        self._ictihat = None

    async def _call_ictihat(self, name: str, args: dict) -> tuple[str, bool]:
        if self._ictihat is None:
            return f"{UNAVAILABLE}: içtihat servisi başlatılmadı", True
        res = await self._ictihat.call_tool(name, args)
        text = "\n".join(c.text for c in res.content if getattr(c, "type", "") == "text")
        return text, bool(res.isError)

    async def call(self, name: str, args: dict) -> tuple[str, bool]:
        if name not in TOOL_NAMES:
            return f"Bilinmeyen araç: {name}", True
        try:
            with anyio.fail_after(TIMEOUT_S):
                if name == "madde_getir":
                    out = await mevzuat.madde_getir(args["kanun"], args["madde_no"])
                    return json.dumps(out, ensure_ascii=False), out.get("metin") is None
                if name == "mevzuat_ara":
                    out = await mevzuat.mevzuat_ara(args["ifade"], int(args.get("adet", 5)))
                    return json.dumps(out, ensure_ascii=False), False
                return await self._call_ictihat(name, args)
        except Exception as e:  # ağ hatası, captcha, 403/429, zaman aşımı
            reason = "zaman aşımı" if isinstance(e, TimeoutError) else str(e)[:200]
            return f"{UNAVAILABLE} ({reason}). Madde veya karar uydurma; öğrenciyi resmî siteye yönlendir.", True


hub = McpHub()

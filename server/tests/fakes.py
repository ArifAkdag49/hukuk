"""Testler için sahte Claude istemcisi: önceden sıraya konmuş yanıtları döndürür."""

from types import SimpleNamespace


def usage(i=100, o=50):
    return SimpleNamespace(input_tokens=i, output_tokens=o, cache_read_input_tokens=0, cache_creation_input_tokens=0)


def text_block(text):
    return SimpleNamespace(type="text", text=text)


def tool_use(id, name, input):
    return SimpleNamespace(type="tool_use", id=id, name=name, input=input)


def message(content, stop_reason="end_turn"):
    return SimpleNamespace(content=content, stop_reason=stop_reason, usage=usage())


class FakeClient:
    """`parse_outputs`: messages.parse sırasıyla döner; `create_outputs`: messages.create."""

    def __init__(self, parse_outputs=(), create_outputs=()):
        self.parse_outputs = list(parse_outputs)
        self.create_outputs = list(create_outputs)
        self.calls = []
        self.messages = self

    async def parse(self, **kw):
        self.calls.append(("parse", kw))
        out = self.parse_outputs.pop(0)
        return SimpleNamespace(parsed_output=out, usage=usage(), stop_reason="end_turn")

    async def create(self, **kw):
        self.calls.append(("create", kw))
        return self.create_outputs.pop(0)


class FakeStream:
    def __init__(self, final):
        self.final = final

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get_final_message(self):
        return self.final


class FakeStreamClient:
    """messages.stream(...) → sıradaki son mesaj."""

    def __init__(self, finals):
        self.finals = list(finals)
        self.calls = []
        self.messages = self

    def stream(self, **kw):
        self.calls.append(kw)
        return FakeStream(self.finals.pop(0))

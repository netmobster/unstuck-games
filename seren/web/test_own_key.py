"""The player's own Anthropic key: shape translation, routing, caps, and the key never leaking.

No network: the Anthropic client is replaced with a fake that records what it was sent.
Run:  python seren/web/test_own_key.py
"""
from __future__ import annotations

import contextlib
import io
import os
import sys
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import llm  # noqa: E402

KEY = "sk-ant-test-THIS-MUST-NEVER-LEAK-0123456789"


class FakeBlock(types.SimpleNamespace):
    pass


class FakeClient:
    sent: list[dict] = []
    reply = None
    raise_exc = None

    def __init__(self, api_key=None, **_):
        FakeClient.key_seen = api_key
        self.beta = types.SimpleNamespace(messages=types.SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        FakeClient.sent.append(kwargs)
        if FakeClient.raise_exc:
            raise FakeClient.raise_exc
        return FakeClient.reply


def reply(content, stop="end_turn", model="claude-sonnet-5-5"):
    return types.SimpleNamespace(
        content=content, stop_reason=stop, model=model,
        usage=types.SimpleNamespace(input_tokens=1000, output_tokens=200,
                                    cache_read_input_tokens=0, cache_creation_input_tokens=0))


SYSTEM = llm.cache_blocks("the rules, which never change", "this turn's scene")
TOOLS = [{"toolSpec": {"name": "roll", "description": "roll dice",
                       "inputSchema": {"json": {"type": "object", "properties": {"dice": {"type": "string"}}}}}}]
HISTORY = [
    {"role": "user", "content": [{"text": "I look at the buckle."}]},
    {"role": "assistant", "content": [{"text": "You crouch."},
                                      {"toolUse": {"toolUseId": "tooluse_abc", "name": "roll",
                                                   "input": {"dice": "1d20"}}}]},
    {"role": "user", "content": [{"toolResult": {"toolUseId": "tooluse_abc",
                                                 "content": [{"json": {"ok": True, "total": 14}}],
                                                 "status": "success"}}]},
]


class Translation(unittest.TestCase):
    def test_system_cache_point_becomes_cache_control(self):
        out = llm.to_anthropic_system(SYSTEM)
        self.assertEqual([b["text"] for b in out], ["the rules, which never change", "this turn's scene"])
        self.assertEqual(out[0]["cache_control"], {"type": "ephemeral"})
        self.assertNotIn("cache_control", out[1])

    def test_tools(self):
        out = llm.to_anthropic_tools(TOOLS)
        self.assertEqual(out[0]["name"], "roll")
        self.assertEqual(out[0]["input_schema"]["properties"]["dice"]["type"], "string")

    def test_messages_tool_use_and_result(self):
        out = llm.to_anthropic_messages(HISTORY)
        self.assertEqual(out[1]["content"][1],
                         {"type": "tool_use", "id": "tooluse_abc", "name": "roll", "input": {"dice": "1d20"}})
        res = out[2]["content"][0]
        self.assertEqual(res["type"], "tool_result")
        self.assertEqual(res["tool_use_id"], "tooluse_abc")
        self.assertIn('"total": 14', res["content"])
        self.assertNotIn("is_error", res)

    def test_error_result_and_empty_text_dropped(self):
        msgs = [{"role": "user", "content": [{"text": ""}, {"toolResult": {
            "toolUseId": "t1", "content": [], "status": "error"}}]}]
        out = llm.to_anthropic_messages(msgs)
        self.assertEqual(len(out[0]["content"]), 1)
        self.assertTrue(out[0]["content"][0]["is_error"])

    def test_back_to_converse_drops_thinking(self):
        blocks = [FakeBlock(type="thinking", thinking=""),
                  FakeBlock(type="text", text="The groove is old."),
                  FakeBlock(type="tool_use", id="toolu_1", name="roll", input={"dice": "1d20"})]
        self.assertEqual(llm.from_anthropic_content(blocks), [
            {"text": "The groove is old."},
            {"toolUse": {"toolUseId": "toolu_1", "name": "roll", "input": {"dice": "1d20"}}}])


class Routing(unittest.TestCase):
    def setUp(self):
        import anthropic
        self.anthropic = anthropic
        self.real = anthropic.Anthropic
        anthropic.Anthropic = FakeClient
        FakeClient.sent, FakeClient.raise_exc = [], None
        FakeClient.reply = reply([FakeBlock(type="text", text="The groove is old.")])
        os.environ.pop("SEREN_AI", None)

    def tearDown(self):
        self.anthropic.Anthropic = self.real

    def test_own_key_routes_to_anthropic(self):
        out_buf = io.StringIO()
        with contextlib.redirect_stdout(out_buf), contextlib.redirect_stderr(out_buf):
            with llm.own_key(KEY, "opus", None):
                self.assertTrue(llm.using_own_key())
                self.assertEqual(llm.model_for("paid"), "claude-opus-5-5")
                self.assertEqual(llm.cap_label("paid"), "no cap · your key")
                got = llm.converse(system=SYSTEM, messages=HISTORY, tools=TOOLS, tier="paid", spent=0.5)
        self.assertFalse(llm.using_own_key())          # the key is gone after the request
        self.assertEqual(FakeClient.key_seen, KEY)
        sent = FakeClient.sent[0]
        self.assertEqual(sent["model"], "claude-opus-5-5")
        self.assertNotIn("temperature", sent)          # these models reject sampling params
        self.assertEqual(sent["fallbacks"], "default")
        self.assertEqual(got["content"], [{"text": "The groove is old."}])
        self.assertTrue(got["own_key"])
        self.assertGreater(got["spent"], 0.5)
        self.assertNotIn(KEY, repr(got))
        self.assertNotIn(KEY, out_buf.getvalue())

    def test_player_cap_stops_the_session(self):
        with llm.own_key(KEY, "sonnet", 1.0):
            self.assertEqual(llm.cap_label("paid"), "$1.00 · your key")
            with self.assertRaises(llm.CapReached):
                llm.converse(system=SYSTEM, messages=HISTORY, tier="paid", spent=1.0)
        self.assertEqual(FakeClient.sent, [])

    def test_our_cap_does_not_apply_on_their_key(self):
        with llm.own_key(KEY, "sonnet", None):
            got = llm.converse(system=SYSTEM, messages=HISTORY, tier="paid", spent=50.0)
        self.assertEqual(got["cap"], float("inf"))

    def test_errors_never_carry_the_key(self):
        import httpx2
        req = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
        FakeClient.raise_exc = self.anthropic.BadRequestError(
            message=f"bad request for {KEY}", response=httpx2.Response(400, request=req), body=None)
        with llm.own_key(KEY, "sonnet", None):
            with self.assertRaises(llm.OwnKeyError) as ctx:
                llm.converse(system=SYSTEM, messages=HISTORY, tier="paid")
        self.assertNotIn(KEY, str(ctx.exception))
        self.assertIn("[your key]", str(ctx.exception))

    def test_refusal_is_an_error_not_an_empty_turn(self):
        FakeClient.reply = reply([], stop="refusal")
        with llm.own_key(KEY, "sonnet", None):
            with self.assertRaises(llm.OwnKeyError):
                llm.converse(system=SYSTEM, messages=HISTORY, tier="paid")

    def test_no_key_means_bedrock_path(self):
        self.assertFalse(llm.using_own_key())
        self.assertEqual(llm.model_for("paid"), llm.TIERS["paid"])
        self.assertEqual(llm.cap_label("paid"), f"${llm.CAPS['paid']:.2f}")


class Allowed(unittest.TestCase):
    def test_allow_list(self):
        os.environ["SEREN_BYOK"] = "Player@Example.com, other@x.org"
        try:
            self.assertTrue(llm.own_key_allowed("player@example.com"))
            self.assertFalse(llm.own_key_allowed("someone@else.com"))
            self.assertFalse(llm.own_key_allowed(""))
        finally:
            os.environ.pop("SEREN_BYOK")
        self.assertFalse(llm.own_key_allowed("player@example.com"))


class NeverLogged(unittest.TestCase):
    def test_no_print_or_write_of_the_key_in_source(self):
        """Nothing in the server code prints, logs or writes a header value or the own-key dict."""
        here = Path(__file__).resolve().parent
        for name in ("llm.py", "server.py"):
            src = (here / name).read_text(encoding="utf-8")
            for line in src.splitlines():
                if "X-Seren-Key" in line or 'own["key"]' in line or "own['key']" in line:
                    self.assertNotRegex(line, r"print\(|logging|\.write\(|json\.dump")


if __name__ == "__main__":
    unittest.main(verbosity=2)

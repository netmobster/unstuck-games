"""The DM's mouth. Bedrock Converse, with tools, a spend cap, and no authority.

Lifted from elsewhere/web/ai.py — same client discovery, same inference-profile retry,
same "estimate the cost of every call" habit — and changed in one important way: this
model gets **tools**, because SEREN's rule is that the DM owns narration and owns nothing
about what is true. It cannot roll in prose. It calls `roll`, and the server rolls.

Tiers (Jay, 2026-09-17): free players get Sonnet, paid players get Opus.
"""
from __future__ import annotations

import contextlib
import contextvars
import json
import os

# Approximate on-demand US prices, USD per 1K tokens. Dev planning only — the real number
# for a session is whatever the usage blocks add up to, which is what we actually record.
# Matched by substring in order, so the exact Anthropic ids come before the family names.
PRICE = {
    "claude-sonnet-5-5": (0.002, 0.010),
    "claude-opus-5-5": (0.004, 0.020),
    "nova-micro": (0.000035, 0.00014),
    "nova-lite": (0.00006, 0.00024),
    "nova-pro": (0.0008, 0.0032),
    "claude-opus": (0.015, 0.075),
    "claude-sonnet": (0.003, 0.015),
    "claude-haiku": (0.0008, 0.004),
}

# Nova for now, because it is the family this account can already invoke — Elsewhere has
# been narrating on Nova Pro for a week. Claude needs the Anthropic use-case form
# submitted in the Bedrock console, and Opus needs account access on top of that.
# Model choice is one env var, so swapping back is not a blocker.
# Probed 2026-09-17: Sonnet 4.5 and Haiku 4.5 list and refuse; Opus 5 / Sonnet 5 / Opus 4.8 refuse.
# Opus 5, Sonnet 5 and Opus 4.8 are listed by the API and refused on Converse with
# "not available for this account" — model access has to be granted in the Bedrock console
# (or, for Opus, through AWS). Jay's decision stands: free gets the cheap one, paid gets
# the best one available. Raise PAID to Opus the day it is enabled.
TIERS = {
    "free": os.environ.get("SEREN_MODEL_FREE", "us.amazon.nova-lite-v1:0"),
    "paid": os.environ.get("SEREN_MODEL_PAID", "us.amazon.nova-pro-v1:0"),
}

# Per-session ceilings in USD. The paid one is Jay's ~$3; free is a tenth of that.
CAPS = {
    "free": float(os.environ.get("SEREN_CAP_FREE", "0.30")),
    "paid": float(os.environ.get("SEREN_CAP_PAID", "3.00")),
}

# A cached read costs a tenth of a fresh input token on Nova.
CACHE_READ = 0.1

MAX_TOKENS = int(os.environ.get("SEREN_MAX_TOKENS", "1400"))


# Claude 5 models think before answering, and the thinking counts toward maxTokens (SRN-1.5-02).
THINK_TOKENS = int(os.environ.get("SEREN_THINK_TOKENS", "16000"))


def thinks(model: str) -> bool:
    """Claude on Bedrock: no temperature, room to think."""
    return "anthropic" in model or "claude" in model


class CapReached(RuntimeError):
    """Raised instead of spending past a session's ceiling."""


class OwnKeyError(RuntimeError):
    """The player's own Anthropic key was refused or failed. Never carries the key."""


# ── the player's own Anthropic key (DECISIONS.md, 19 Nov 2026) ───────────────
# The key lives in the player's browser and rides each request in a header. It is held
# here for that one request, in a context variable, and never written anywhere: not to
# disk, not to the session, not to a log. SEREN_BYOK is the list of emails allowed to use
# it, so turning on the next player is a setting, not a deploy.
OWN_MODELS = {"sonnet": "claude-sonnet-5-5", "opus": "claude-opus-5-5"}
OWN_MAX_TOKENS = int(os.environ.get("SEREN_OWN_MAX_TOKENS", "16000"))   # thinking counts toward it
OWN_EFFORT = os.environ.get("SEREN_OWN_EFFORT", "medium")
_own = contextvars.ContextVar("seren_own_key", default=None)


def own_key_allowed(email: str) -> bool:
    allow = {e.strip().lower() for e in os.environ.get("SEREN_BYOK", "").split(",") if e.strip()}
    return bool(email) and email.strip().lower() in allow


@contextlib.contextmanager
def own_key(key: str, model: str = "sonnet", cap: float | None = None):
    """Every converse() inside this block runs on the player's key."""
    token = _own.set({"key": key, "model": OWN_MODELS.get(model, OWN_MODELS["sonnet"]),
                      "cap": cap if cap and cap > 0 else None})
    try:
        yield
    finally:
        _own.reset(token)


def using_own_key() -> bool:
    return _own.get() is not None


def model_for(tier: str) -> str:
    own = _own.get()
    if own:
        return own["model"]
    return TIERS.get(tier, TIERS["free"])


def cap_for(tier: str) -> float:
    own = _own.get()
    if own:
        # Their key, their bill: our cap does not apply, theirs does if they set one.
        return own["cap"] if own["cap"] else float("inf")
    return CAPS.get(tier, CAPS["free"])


def cap_label(tier: str) -> str:
    """The cap as the table shows it."""
    own = _own.get()
    if own:
        return f"${own['cap']:.2f} · your key" if own["cap"] else "no cap · your key"
    return f"${cap_for(tier):.2f}"


def _price_for(model: str) -> tuple[float, float]:
    for key, pair in PRICE.items():
        if key in model:
            return pair
    return (0.003, 0.015)


def cache_blocks(static: str, volatile: str) -> list:
    """The static half, a cache point, then the half that changes every turn."""
    return [{"text": static}, {"cachePoint": {"type": "default"}}, {"text": volatile}]


def estimate_usd(model: str, in_tok: int, out_tok: int) -> float:
    pin, pout = _price_for(model)
    return (in_tok / 1000.0) * pin + (out_tok / 1000.0) * pout


def _client():
    try:
        import boto3
    except ImportError:
        return None
    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-2"
    try:
        return boto3.client("bedrock-runtime", region_name=region)
    except Exception:
        return None


def ready() -> bool:
    mode = os.environ.get("SEREN_AI", "").lower()
    if mode in ("mock", "local"):
        return True          # the loop runs; nothing is spent
    if mode == "off":
        return False
    if _own.get():
        try:
            import anthropic  # noqa: F401
        except ImportError:
            return False
        return True
    return _client() is not None


def converse(
    *,
    system: str,
    messages: list[dict],
    tools: list[dict] | None = None,
    tier: str = "free",
    spent: float = 0.0,
    temperature: float = 0.6,
) -> dict:
    """One turn of DM. Returns the raw content blocks plus what the call cost.

    `messages` and the returned `content` are Converse shapes, so tool results can be
    appended and handed straight back for the next leg of the same turn.
    """
    if os.environ.get("SEREN_AI", "").lower() in ("mock", "local"):
        return _mock(messages, tier, spent)

    cap = cap_for(tier)
    if spent >= cap:
        raise CapReached(f"session cap reached: ${spent:.2f} of ${cap:.2f}")

    own = _own.get()
    if own:
        return _converse_own(own, system=system, messages=messages, tools=tools,
                             spent=spent, cap=cap)

    client = _client()
    if client is None:
        raise RuntimeError("no bedrock client")

    model = model_for(tier)
    # `system` may be a string, or a list of blocks with a cache point in it.
    blocks = system if isinstance(system, list) else [{"text": system}]
    kwargs: dict = {
        "modelId": model,
        "messages": messages,
        "system": blocks,
        "inferenceConfig": {"maxTokens": MAX_TOKENS, "temperature": temperature},
    }
    if thinks(model):
        # SRN-1.5-01/02: Claude 5 on Bedrock refuses `temperature`, and its thinking counts toward
        # maxTokens, so a 4,000 cap ran out mid-answer. No temperature, and a floor of THINK_TOKENS.
        kwargs["inferenceConfig"] = {"maxTokens": max(MAX_TOKENS, THINK_TOKENS)}
    if tools:
        kwargs["toolConfig"] = {"tools": tools}

    try:
        try:
            resp = client.converse(**kwargs)
        except Exception:
            # A cache point the model will not take must not cost us the turn.
            if any("cachePoint" in b for b in kwargs["system"]):
                kwargs["system"] = [b for b in kwargs["system"] if "text" in b]
                resp = client.converse(**kwargs)
            else:
                raise
    except Exception as exc:
        # Same lesson as Elsewhere: some models are only reachable through a regional
        # inference profile, and the error says so rather than the model being missing.
        text = str(exc).lower()
        if ("on-demand" in text or "inference profile" in text) and not model.startswith(("us.", "global.")):
            kwargs["modelId"] = model = "us." + model
            resp = client.converse(**kwargs)
        else:
            raise

    out = resp.get("output", {}).get("message", {})
    usage = resp.get("usage") or {}
    inn, outt = int(usage.get("inputTokens") or 0), int(usage.get("outputTokens") or 0)
    # Tokens read back from the cache are billed at a tenth; tokens written to it at the
    # ordinary input rate. Counting them as plain input would overstate a session by 4x.
    cached = int(usage.get("cacheReadInputTokens") or 0)
    written = int(usage.get("cacheWriteInputTokens") or 0)
    usd = round(estimate_usd(model, inn + written, outt) + estimate_usd(model, cached, 0) * CACHE_READ, 6)
    return {
        "role": out.get("role", "assistant"),
        "content": out.get("content", []),
        "stop_reason": resp.get("stopReason"),
        "model": model,
        "input_tokens": inn,
        "cached_tokens": cached,
        "output_tokens": outt,
        "usd": usd,
        "spent": round(spent + usd, 6),
        "cap": cap,
    }


# ── Converse shapes ↔ Anthropic Messages ─────────────────────────────────────
# SEREN's history is kept in Bedrock Converse shapes. The own-key path translates on the
# way out and back, so the same history can move between our key and theirs mid-campaign.
# Thinking blocks are not kept: the history is Converse, and dm.trim() edits it.

def to_anthropic_system(system) -> list[dict]:
    blocks = system if isinstance(system, list) else [{"text": system}]
    out: list[dict] = []
    for b in blocks:
        if b.get("text"):
            out.append({"type": "text", "text": b["text"]})
        elif "cachePoint" in b and out:
            out[-1]["cache_control"] = {"type": "ephemeral"}
    return out


def to_anthropic_tools(tools: list[dict] | None) -> list[dict]:
    out = []
    for t in tools or []:
        spec = t.get("toolSpec")
        if spec:
            out.append({"name": spec["name"], "description": spec.get("description", ""),
                        "input_schema": (spec.get("inputSchema") or {}).get("json") or {"type": "object"}})
    return out


def _result_text(parts: list[dict]) -> str:
    bits = []
    for p in parts or []:
        if "text" in p:
            bits.append(p["text"])
        elif "json" in p:
            bits.append(json.dumps(p["json"], ensure_ascii=False))
    return "\n".join(bits) or "(no output)"


def to_anthropic_messages(messages: list[dict]) -> list[dict]:
    out = []
    for m in messages:
        content = m.get("content")
        if isinstance(content, str):
            blocks = [{"type": "text", "text": content}] if content else []
        else:
            blocks = []
            for b in content or []:
                if b.get("text"):
                    blocks.append({"type": "text", "text": b["text"]})
                elif "toolUse" in b:
                    u = b["toolUse"]
                    blocks.append({"type": "tool_use", "id": u["toolUseId"], "name": u["name"],
                                   "input": u.get("input") or {}})
                elif "toolResult" in b:
                    r = b["toolResult"]
                    blk = {"type": "tool_result", "tool_use_id": r["toolUseId"],
                           "content": _result_text(r.get("content"))}
                    if r.get("status") == "error":
                        blk["is_error"] = True
                    blocks.append(blk)
        if blocks:
            out.append({"role": m["role"], "content": blocks})
    return out


def from_anthropic_content(blocks) -> list[dict]:
    out = []
    for b in blocks or []:
        kind = getattr(b, "type", None)
        if kind == "text" and b.text:
            out.append({"text": b.text})
        elif kind == "tool_use":
            out.append({"toolUse": {"toolUseId": b.id, "name": b.name, "input": b.input or {}}})
    return out


def _converse_own(own: dict, *, system, messages, tools, spent: float, cap: float) -> dict:
    """One leg on the player's own Anthropic key."""
    try:
        import anthropic
    except ImportError:
        raise OwnKeyError("the server can't use your key yet (the anthropic package is missing)")

    key = own["key"]

    def clean(exc: Exception) -> str:
        # Belt and braces: an error message must never carry the key back out.
        return str(getattr(exc, "message", None) or exc).replace(key, "[your key]")[:300]

    kwargs: dict = {
        "model": own["model"],
        "max_tokens": OWN_MAX_TOKENS,
        "system": to_anthropic_system(system),
        "messages": to_anthropic_messages(messages),
        "output_config": {"effort": OWN_EFFORT},
        # A refused turn is re-run on a fallback model inside the same call.
        "betas": ["server-side-fallback-2026-07-01"],
        "fallbacks": "default",
    }
    if tools:
        kwargs["tools"] = to_anthropic_tools(tools)

    client = anthropic.Anthropic(api_key=key, max_retries=2, timeout=180.0)
    try:
        resp = client.beta.messages.create(**kwargs)
    except anthropic.AuthenticationError:
        raise OwnKeyError("Anthropic refused your key. Check it on your account page.")
    except anthropic.PermissionDeniedError as exc:
        raise OwnKeyError(f"your key can't use {own['model']}: {clean(exc)}")
    except anthropic.RateLimitError:
        raise OwnKeyError("your key is rate limited right now. Try again in a minute.")
    except anthropic.APIStatusError as exc:
        raise OwnKeyError(f"Anthropic answered {exc.status_code}: {clean(exc)}")
    except anthropic.APIConnectionError:
        raise OwnKeyError("couldn't reach Anthropic. Try again.")

    if resp.stop_reason == "refusal":
        raise OwnKeyError("the model declined this turn. Try saying it another way.")
    content = from_anthropic_content(resp.content)
    if not content:
        raise OwnKeyError("the model sent back nothing. Try again.")

    model = getattr(resp, "model", None) or own["model"]
    usage = resp.usage
    inn = int(getattr(usage, "input_tokens", 0) or 0)
    outt = int(getattr(usage, "output_tokens", 0) or 0)
    cached = int(getattr(usage, "cache_read_input_tokens", 0) or 0)
    written = int(getattr(usage, "cache_creation_input_tokens", 0) or 0)
    # Cache writes bill at 1.25x input, cache reads at 0.1x.
    usd = round(estimate_usd(model, inn, outt) + estimate_usd(model, written, 0) * 1.25
                + estimate_usd(model, cached, 0) * CACHE_READ, 6)
    return {
        "role": "assistant",
        "content": content,
        "stop_reason": resp.stop_reason,
        "model": model,
        "input_tokens": inn,
        "cached_tokens": cached,
        "output_tokens": outt,
        "usd": usd,
        "spent": round(spent + usd, 6),
        "cap": cap,
        "own_key": True,
    }


def text_of(content: list[dict]) -> str:
    return "".join(b.get("text", "") for b in content if "text" in b).strip()


def tool_calls(content: list[dict]) -> list[dict]:
    return [b["toolUse"] for b in content if "toolUse" in b]


def _mock(messages: list[dict], tier: str, spent: float) -> dict:
    """A DM with no model behind it, for proving the loop without spending anything.

    It behaves like the real one in the only ways that matter here: it asks for a roll
    before it narrates, it never supplies an outcome, and it writes a fact. Set
    SEREN_AI=mock.
    """
    already = any("toolResult" in b for m in messages if isinstance(m.get("content"), list)
                  for b in m["content"] if isinstance(b, dict))
    if not already:
        return {
            "role": "assistant", "content": [
                {"text": "You crouch. The buckle is crusted and the light is going."},
                {"toolUse": {"toolUseId": "mock-1", "name": "roll", "input": {
                    "dice": "1d20", "t": "check", "who": "seren", "skill": "investigation",
                    "ability": "int", "dc": 13, "mods": [["int", 2], ["prof", 2]],
                    "note": "Reading a maker's mark on a buckle in failing light, without touching it. "
                            "DC 13 off the object, not chosen for drama.",
                }}},
            ],
            "stop_reason": "tool_use", "model": "mock", "input_tokens": 0, "output_tokens": 0,
            "usd": 0.0, "spent": spent, "cap": cap_for(tier),
        }
    return {
        "role": "assistant", "content": [{"text":
            "The buckle is plain, and it has been mended once — a second pin, driven through "
            "and filed flat by someone in a hurry. There is no mark. What there is, under the "
            "crust, is a groove worn all the way round the leather, the kind a thing makes when "
            "it has pulled against a collar for a very long time."}],
        "stop_reason": "end_turn", "model": "mock", "input_tokens": 0, "output_tokens": 0,
        "usd": 0.0, "spent": spent, "cap": cap_for(tier),
    }

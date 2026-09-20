"""The DM's mouth. Bedrock Converse, with tools, a spend cap, and no authority.

Lifted from elsewhere/web/ai.py — same client discovery, same inference-profile retry,
same "estimate the cost of every call" habit — and changed in one important way: this
model gets **tools**, because SEREN's rule is that the DM owns narration and owns nothing
about what is true. It cannot roll in prose. It calls `roll`, and the server rolls.

Tiers (Jay, 2026-09-17): free players get Sonnet, paid players get Opus.
"""
from __future__ import annotations

import os

# Approximate on-demand US prices, USD per 1K tokens. Dev planning only — the real number
# for a session is whatever the usage blocks add up to, which is what we actually record.
PRICE = {
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


class CapReached(RuntimeError):
    """Raised instead of spending past a session's ceiling."""


def model_for(tier: str) -> str:
    return TIERS.get(tier, TIERS["free"])


def cap_for(tier: str) -> float:
    return CAPS.get(tier, CAPS["free"])


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

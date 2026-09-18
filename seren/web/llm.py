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
    "claude-opus": (0.015, 0.075),
    "claude-sonnet": (0.003, 0.015),
    "claude-haiku": (0.0008, 0.004),
}

TIERS = {
    "free": os.environ.get("SEREN_MODEL_FREE", "us.anthropic.claude-sonnet-5"),
    "paid": os.environ.get("SEREN_MODEL_PAID", "us.anthropic.claude-opus-5"),
}

# Per-session ceilings in USD. The paid one is Jay's ~$3; free is a tenth of that.
CAPS = {
    "free": float(os.environ.get("SEREN_CAP_FREE", "0.30")),
    "paid": float(os.environ.get("SEREN_CAP_PAID", "3.00")),
}

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
    if os.environ.get("SEREN_AI", "").lower() in ("off", "mock", "local"):
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
    cap = cap_for(tier)
    if spent >= cap:
        raise CapReached(f"session cap reached: ${spent:.2f} of ${cap:.2f}")

    client = _client()
    if client is None:
        raise RuntimeError("no bedrock client")

    model = model_for(tier)
    kwargs: dict = {
        "modelId": model,
        "messages": messages,
        "system": [{"text": system}],
        "inferenceConfig": {"maxTokens": MAX_TOKENS, "temperature": temperature},
    }
    if tools:
        kwargs["toolConfig"] = {"tools": tools}

    try:
        resp = client.converse(**kwargs)
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
    usd = round(estimate_usd(model, inn, outt), 6)
    return {
        "role": out.get("role", "assistant"),
        "content": out.get("content", []),
        "stop_reason": resp.get("stopReason"),
        "model": model,
        "input_tokens": inn,
        "output_tokens": outt,
        "usd": usd,
        "spent": round(spent + usd, 6),
        "cap": cap,
    }


def text_of(content: list[dict]) -> str:
    return "".join(b.get("text", "") for b in content if "text" in b).strip()


def tool_calls(content: list[dict]) -> list[dict]:
    return [b["toolUse"] for b in content if "toolUse" in b]

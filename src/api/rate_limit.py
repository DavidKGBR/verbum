"""
In-memory rate limiter for AI endpoints — caps Gemini cost.

Single-instance friendly (Cloud Run serves N concurrent requests on one
container; multi-replica deployments would need Redis-backed limits, but
for v1 a single Cloud Run instance with low traffic is fine).

Sliding window: keep timestamps of recent calls per IP, prune older than
WINDOW_SECONDS, reject when count >= MAX_CALLS.

Usage:
    from src.api.rate_limit import check_ai_rate_limit
    @router.post("/ai/explain")
    def explain_passage(req: ExplainRequest, request: Request) -> dict:
        check_ai_rate_limit(request)  # raises 429 if over limit
        ...
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

# 20 AI calls per 10 minutes per IP.
# Generous for a human reader; brutal on bots.
MAX_CALLS = 20
WINDOW_SECONDS = 10 * 60

_calls: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    """Best-effort client IP. Honors X-Forwarded-For (Cloud Run, Firebase rewrites)."""
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_ai_rate_limit(request: Request) -> None:
    """Raise HTTP 429 if the caller has exceeded the AI rate limit."""
    ip = _client_ip(request)
    now = time.monotonic()
    cutoff = now - WINDOW_SECONDS

    bucket = _calls[ip]
    while bucket and bucket[0] < cutoff:
        bucket.popleft()

    if len(bucket) >= MAX_CALLS:
        retry_after = int(bucket[0] + WINDOW_SECONDS - now) + 1
        raise HTTPException(
            status_code=429,
            detail=f"AI rate limit exceeded. Retry in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)


def reset_ai_rate_limit() -> None:
    """Clear all buckets — for tests."""
    _calls.clear()

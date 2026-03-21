import uuid

import httpx

from app.config import settings


async def charge_amount(amount_cents: int, metadata: dict) -> str:
    """One-time charge. Stub returns fake tx when no real API."""
    if not settings.kemispay_secret_key or settings.kemispay_secret_key.startswith(
        "sk_test_stub"
    ):
        return f"kpay_stub_{uuid.uuid4().hex[:16]}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{settings.kemispay_api_url.rstrip('/')}/charge",
            headers={"Authorization": f"Bearer {settings.kemispay_secret_key}"},
            json={"amount_cents": amount_cents, "metadata": metadata},
        )
        r.raise_for_status()
        data = r.json()
        return data.get("id", f"kpay_{uuid.uuid4().hex[:12]}")


async def create_subscription_recurring(
    customer_ref: str, amount: float, creator_id: str
) -> str:
    if settings.kemispay_secret_key.startswith("sk_test_stub"):
        return f"kpay_sub_{uuid.uuid4().hex[:12]}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{settings.kemispay_api_url.rstrip('/')}/subscription",
            headers={"Authorization": f"Bearer {settings.kemispay_secret_key}"},
            json={
                "customer_ref": customer_ref,
                "amount": amount,
                "creator_id": creator_id,
            },
        )
        r.raise_for_status()
        return r.json().get("id", f"kpay_sub_{uuid.uuid4().hex[:12]}")

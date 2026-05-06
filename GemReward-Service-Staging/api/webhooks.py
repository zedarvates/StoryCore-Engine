from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hmac
import hashlib
import logging
from db.session import get_db
from models import AppRegistration
from engine import GemEngineStandalone

router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_signature(request: Request, secret: str, signature: str):
    """Verify GitHub webhook signature."""
    if not signature:
        return False

    body = await request.body()
    expected_signature = (
        "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    )

    return hmac.compare_digest(expected_signature, signature)


@router.post("/github/{app_id}")
async def github_webhook(
    app_id: str,
    request: Request,
    x_hub_signature_256: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle GitHub webhooks to trigger rewards.
    1. Verify App
    2. Verify Signature
    3. Parse Event (e.g., labeled issue)
    4. Call GemEngine
    """
    # 1. Verify App
    stmt = select(AppRegistration).where(AppRegistration.id == app_id)
    result = await db.execute(stmt)
    app = result.scalar_one_or_none()

    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # 2. Verify Signature
    if app.webhook_secret and not await verify_signature(
        request, app.webhook_secret, x_hub_signature_256
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature"
        )

    # 3. Parse Payload
    payload = await request.json()
    event_type = request.headers.get("X-GitHub-Event")

    trigger_keys = []
    user_id = None
    source_id = None

    if event_type == "issues" and payload.get("action") == "labeled":
        label = payload.get("label", {}).get("name")
        if label:
            trigger_keys.append(label)

        user_id = payload.get("issue", {}).get("user", {}).get("login")
        source_id = payload.get("issue", {}).get("html_url")

    elif (
        event_type == "pull_request"
        and payload.get("action") == "closed"
        and payload.get("pull_request", {}).get("merged")
    ):
        trigger_keys.append("pr_merged")
        user_id = payload.get("pull_request", {}).get("user", {}).get("login")
        source_id = payload.get("pull_request", {}).get("html_url")

    if not trigger_keys or not user_id:
        return {"status": "ignored", "reason": "No relevant trigger found"}

    # 4. Process Reward
    engine = GemEngineStandalone(db)
    amount = await engine.calculate_reward(app_id, trigger_keys)

    if amount > 0:
        transaction = await engine.process_transaction(
            app_id=app_id,
            user_id=f"github:{user_id}",
            amount=amount,
            transaction_type="reward",
            source_platform="github",
            source_id=source_id,
            metadata={"github_user": user_id, "event": event_type},
        )
        return {
            "status": "processed",
            "amount": amount,
            "transaction_id": transaction.id if transaction else None,
        }

    return {"status": "no_reward", "amount": 0}

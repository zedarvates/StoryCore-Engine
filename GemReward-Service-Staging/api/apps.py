from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel, Field, validator
from db.session import get_db
from models import AppRegistration, AppRewardRule

router = APIRouter()


class RuleSchema(BaseModel):
    event_type: str = Field(..., example="github_label")
    trigger_key: str = Field(..., example="severity:critical")
    gem_amount: int = Field(..., ge=0, example=5)

    @validator("gem_amount")
    def must_be_positive_or_zero(cls, v):
        if v < 0:
            raise ValueError("Gem amount must be positive or zero")
        return v


class AppCreateSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    rules: List[RuleSchema]


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_app(app_data: AppCreateSchema, db: AsyncSession = Depends(get_db)):
    """
    Register a new application with its reward rules.
    This is where rule validation happens via Pydantic and logic.
    """
    # Check if app name already exists
    stmt = select(AppRegistration).where(AppRegistration.name == app_data.name)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400, detail="Application name already registered"
        )

    import secrets
    import uuid

    app_id = str(uuid.uuid4())
    api_key = f"gr_{secrets.token_urlsafe(32)}"
    webhook_secret = secrets.token_hex(32)

    new_app = AppRegistration(
        id=app_id,
        name=app_data.name,
        api_key=api_key,
        webhook_secret=webhook_secret,
        is_active=True,
    )
    db.add(new_app)

    # Add rules
    for rule_data in app_data.rules:
        rule = AppRewardRule(
            app_id=app_id,
            event_type=rule_data.event_type,
            trigger_key=rule_data.trigger_key,
            gem_amount=rule_data.gem_amount,
        )
        db.add(rule)

    await db.commit()

    return {
        "app_id": app_id,
        "api_key": api_key,
        "webhook_secret": webhook_secret,
        "rules_count": len(app_data.rules),
    }


@router.get("/{app_id}/rules")
async def get_app_rules(app_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(AppRewardRule).where(AppRewardRule.app_id == app_id)
    result = await db.execute(stmt)
    rules = result.scalars().all()
    return rules

"""
GemReward-Service — Application Setup Utility
=============================================
Helper script to register apps and seed default reward rules.
"""

import uuid
import secrets
from .models import AppRegistration, AppRewardRule
from .db.session import AsyncSessionLocal


async def register_new_app(name: str, webhook_secret: str = None):
    """Registers a new client application and returns its credentials."""
    api_key = f"gr_{secrets.token_urlsafe(32)}"
    app_id = str(uuid.uuid4())

    async with AsyncSessionLocal() as db:
        new_app = AppRegistration(
            id=app_id,
            name=name,
            api_key=api_key,
            webhook_secret=webhook_secret or secrets.token_hex(32),
            is_active=True,
        )
        db.add(new_app)

        # Seed default rules (StoryCore style)
        default_rules = [
            ("github_label", "severity:critical", 3),
            ("github_label", "severity:major", 2),
            ("github_label", "severity:minor", 1),
            ("github_label", "roadmap", 3),
            ("github_label", "accepted", 2),
            ("github_label", "__default__", 1),
        ]

        for event, trigger, amount in default_rules:
            rule = AppRewardRule(
                app_id=app_id, event_type=event, trigger_key=trigger, gem_amount=amount
            )
            db.add(rule)

        await db.commit()

    print(f"✅ Application '{name}' registered successfully!")
    print(f"👉 APP_ID:  {app_id}")
    print(f"👉 API_KEY: {api_key}")
    print(f"👉 WEBHOOK_SECRET: {new_app.webhook_secret}")
    return app_id, api_key


if __name__ == "__main__":
    # Example usage
    # asyncio.run(register_new_app("StoryCore-Engine"))
    pass

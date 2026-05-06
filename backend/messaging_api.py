from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from backend.messaging_service import get_messaging_service, MessagingService

router = APIRouter(
    prefix="/messaging",
    tags=["messaging-management"],
    responses={404: {"description": "Not found"}},
)


class MessagePayload(BaseModel):
    message: str
    target_id: Optional[str] = None  # chat_id for telegram, webhook_url for discord


@router.get("/status")
async def get_status(service: MessagingService = Depends(get_messaging_service)):
    """
    Check connection status for Telegram and Discord services.
    """
    return await service.get_status()


@router.post("/telegram/send")
async def send_telegram(
    payload: MessagePayload, service: MessagingService = Depends(get_messaging_service)
):
    """
    Send a message to a Telegram chat.
    """
    result = await service.send_telegram_message(payload.message, payload.target_id)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/discord/send")
async def send_discord(
    payload: MessagePayload, service: MessagingService = Depends(get_messaging_service)
):
    """
    Send a message to a Discord channel via webhook.
    """
    result = await service.send_discord_message(payload.message, payload.target_id)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

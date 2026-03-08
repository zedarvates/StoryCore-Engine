from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from db.session import get_db
from models import UserWallet, GemTransaction

from pydantic import BaseModel, Field
from engine import GemEngineStandalone
from typing import Optional, List, Dict, Any
import hashlib
import hmac
import time
import math

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory rate limiter for agent contributions (MVP — use Redis in prod)
# ---------------------------------------------------------------------------
_agent_rate_log: Dict[str, List[float]] = {}
_RATE_LIMIT_PER_HOUR = 50

def _check_rate_limit(agent_id: str) -> bool:
    """Returns True if allowed, False if rate limit exceeded."""
    now = time.time()
    window = 3600  # 1 hour
    calls = _agent_rate_log.get(agent_id, [])
    # Keep only calls within the last hour
    calls = [t for t in calls if now - t < window]
    if len(calls) >= _RATE_LIMIT_PER_HOUR:
        _agent_rate_log[agent_id] = calls
        return False
    calls.append(now)
    _agent_rate_log[agent_id] = calls
    return True

def _verify_hmac_signature(body: str, secret: str, signature: str) -> bool:
    """Verify HMAC-SHA256 signature sent by the agent platform."""
    expected = hmac.new(
        secret.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# ---------------------------------------------------------------------------
# In-memory agent registry & reputation store (MVP — persist to DB in prod)
# ---------------------------------------------------------------------------
_agent_registry: Dict[str, Dict[str, Any]] = {}
_agent_reputation: Dict[str, Dict[str, Any]] = {}


class AnalysisRequest(BaseModel):
    app_id: str
    contributor_id: str
    contribution_text: str
    contribution_type: str = "bug_report" # "bug_fix", "feature", "doc"
    source_url: Optional[str] = None

@router.post("/ai/analyze-contribution")
async def analyze_contribution(req: AnalysisRequest, db: AsyncSession = Depends(get_db)):
    """
    Experimental: Use AI scoring to determine gem reward.
    Quantifies Effort vs Impact.
    """
    engine = GemEngineStandalone(db)
    
    # In a real production scenario, we would call an LLM (Gemini/Grok) here
    # to analyze 'contribution_text' and assign a score.
    # For MVP, we use a scoring heuristic based on length and keywords.
    
    effort_score = min(10, len(req.contribution_text) // 100)
    impact_multiplier = 1.0
    
    if "fix" in req.contribution_text.lower() or "resolves" in req.contribution_text.lower():
        impact_multiplier = 2.0
    if "critical" in req.contribution_text.lower() or "security" in req.contribution_text.lower():
        impact_multiplier = 5.0
        
    final_gems = int(effort_score * impact_multiplier)
    
    # Cap at 100 gems per AI-analyzed contribution for safety
    final_gems = min(100, max(1, final_gems))
    
    transaction = await engine.process_transaction(
        app_id=req.app_id,
        user_id=req.contributor_id,
        amount=final_gems,
        transaction_type="ai_reward",
        source_platform="ai_discovery_lab",
        source_id=req.source_url or "discovery_lab",
        metadata={
            "effort": effort_score,
            "impact_multiplier": impact_multiplier,
            "contribution_type": req.contribution_type,
            "analysis_agent": "Discovery-Lab-v1"
        }
    )
    
    if not transaction:
        raise HTTPException(status_code=400, detail="Transaction failed")
        
    return {
        "status": "success",
        "gems_awarded": final_gems,
        "analysis": {
            "effort": effort_score,
            "impact_multiplier": impact_multiplier,
            "agent": "Discovery-Lab-v1"
        }
    }

# ===========================================================================
# 🤖 AGENT ECONOMY — 4th Pillar of the Gem Protocol
# ===========================================================================

class AgentRegisterRequest(BaseModel):
    operator_id: str = Field(..., description="Wallet ID of the human operator who owns the agent")
    agent_name: str = Field(..., description="Human-readable name for this agent")
    platform: str = Field(default="custom", description="Platform: 'openclaw', 'langchain', 'autogpt', 'custom'")
    model: str = Field(default="unknown", description="LLM model used by the agent")
    webhook_endpoint: Optional[str] = Field(None, description="Optional callback URL for async notifications")
    shared_secret: Optional[str] = Field(
        None,
        description="Pre-shared secret for HMAC-SHA256 verification. Leave empty for open/dev mode (no signature required)."
    )

class AgentContributionRequest(BaseModel):
    agent_id: str = Field(..., description="Registered agent ID")
    operator_id: str = Field(..., description="Wallet ID of the operator receiving the Gems")
    app_id: str = Field(default="storycore")
    output_text: str = Field(..., min_length=10, description="The agent's output / contribution")
    task_type: str = Field(
        default="research",
        description="Type: 'research', 'code', 'creative', 'summarization', 'orchestration'"
    )
    context_prompt: Optional[str] = Field(None, description="The task/prompt the agent was given")
    source_url: Optional[str] = Field(None, description="Source URL or reference")


@router.post("/ai/agent/register")
async def register_agent(req: AgentRegisterRequest):
    """
    Register an AI agent (OpenClaw, LangChain, etc.) with the Gem Protocol.
    Returns an agent_id and shared secret for HMAC-signed contributions.
    """
    import uuid
    agent_id = f"{req.platform}-{uuid.uuid4().hex[:12]}"
    # Only store secret if explicitly provided — None means open/dev mode (no signature required)
    secret = req.shared_secret if req.shared_secret else None

    _agent_registry[agent_id] = {
        "agent_id": agent_id,
        "operator_id": req.operator_id,
        "agent_name": req.agent_name,
        "platform": req.platform,
        "model": req.model,
        "webhook_endpoint": req.webhook_endpoint,
        "shared_secret": secret,
        "registered_at": time.time(),
    }
    _agent_reputation[agent_id] = {
        "total_contributions": 0,
        "total_gems_earned": 0,
        "avg_quality_score": 0.0,
        "reputation_factor": 1.0,
        "seen_hashes": set(),
    }

    return {
        "status": "registered",
        "agent_id": agent_id,
        "shared_secret": secret,
        "hmac_required": secret is not None,
        "message": (
            f"Agent '{req.agent_name}' registered on platform '{req.platform}'. "
            + ("HMAC signature required for contributions. Store the shared_secret securely."
               if secret else "Running in open mode — no signature required (dev/demo only).")
        )
    }


@router.post("/ai/agent-contribution")
async def agent_contribution(
    req: AgentContributionRequest,
    db: AsyncSession = Depends(get_db),
    x_agent_signature: Optional[str] = Header(None),
):
    """
    🤖 Submit an AI agent output for Gem valuation.
    Formula: Gems = base_value × quality_score × novelty_multiplier × reputation_factor
    """
    # 1. Verify agent is registered
    agent_info = _agent_registry.get(req.agent_id)
    if not agent_info:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{req.agent_id}' not registered. Use POST /v1/gems/ai/agent/register"
        )

    # 2. Verify operator matches
    if agent_info["operator_id"] != req.operator_id:
        raise HTTPException(status_code=403, detail="operator_id does not match agent registration.")

    # 3. HMAC signature check
    secret = agent_info.get("shared_secret")
    if secret and x_agent_signature:
        if not _verify_hmac_signature(req.output_text, secret, x_agent_signature):
            raise HTTPException(status_code=401, detail="Invalid HMAC signature. Contribution rejected.")
    elif secret and not x_agent_signature:
        raise HTTPException(status_code=401, detail="This agent requires X-Agent-Signature header (HMAC-SHA256).")

    # 4. Rate limiting
    if not _check_rate_limit(req.agent_id):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for agent '{req.agent_id}'. Max {_RATE_LIMIT_PER_HOUR}/hour."
        )

    # 5. Scoring
    text = req.output_text
    base_values = {
        "research": 15, "code": 25, "creative": 12,
        "summarization": 10, "orchestration": 30,
    }
    base_value = base_values.get(req.task_type, 10)

    # Quality score heuristic (MVP — swap for LLM call in prod)
    quality_score = min(1.0, len(text) / 1000)
    if any(m in text for m in ["1.", "- ", "##", "```", "\n\n"]):
        quality_score = min(1.0, quality_score * 1.2)
    if any(kw in text.lower() for kw in ["result", "finding", "solution", "patch", "fix"]):
        quality_score = min(1.0, quality_score * 1.3)

    # Novelty check via content hash
    content_hash = hashlib.sha256(text.encode()).hexdigest()
    rep = _agent_reputation.get(req.agent_id, {})
    past_hashes = rep.get("seen_hashes", set())
    if content_hash in past_hashes:
        novelty_multiplier = 0.1  # Duplicate penalty
    else:
        novelty_multiplier = min(2.0, 1.0 + len(text) / 2000)
        past_hashes.add(content_hash)
        rep["seen_hashes"] = past_hashes

    # Reputation factor (grows logarithmically with track record)
    total_done = rep.get("total_contributions", 0)
    reputation_factor = min(3.0, 0.5 + (math.log1p(total_done) * 0.4))

    raw_gems = base_value * quality_score * novelty_multiplier * reputation_factor
    final_gems = int(round(raw_gems))
    requires_review = final_gems > 50
    final_gems = min(150, max(1, final_gems))

    # 6. Process transaction
    engine = GemEngineStandalone(db)
    transaction = await engine.process_transaction(
        app_id=req.app_id,
        user_id=req.operator_id,
        amount=final_gems,
        transaction_type="agent_reward",
        source_platform=agent_info.get("platform", "agent"),
        source_id=req.agent_id,
        metadata={
            "agent_id": req.agent_id,
            "agent_name": agent_info.get("agent_name"),
            "platform": agent_info.get("platform"),
            "model": agent_info.get("model"),
            "task_type": req.task_type,
            "quality_score": round(quality_score, 3),
            "novelty_multiplier": round(novelty_multiplier, 3),
            "reputation_factor": round(reputation_factor, 3),
            "base_value": base_value,
            "requires_review": requires_review,
        }
    )

    if not transaction:
        raise HTTPException(status_code=400, detail="Transaction failed.")

    # 7. Update reputation
    rep["total_contributions"] = total_done + 1
    rep["total_gems_earned"] = rep.get("total_gems_earned", 0) + final_gems
    rep["avg_quality_score"] = (
        (rep.get("avg_quality_score", 0.0) * total_done + quality_score) / (total_done + 1)
    )
    rep["reputation_factor"] = min(3.0, 0.5 + (math.log1p(rep["total_contributions"]) * 0.4))
    _agent_reputation[req.agent_id] = rep

    return {
        "status": "success",
        "gems_awarded": final_gems,
        "requires_human_review": requires_review,
        "scoring": {
            "base_value": base_value,
            "quality_score": round(quality_score, 3),
            "novelty_multiplier": round(novelty_multiplier, 3),
            "reputation_factor": round(reputation_factor, 3),
            "raw_gems": round(raw_gems, 2),
        },
        "agent": {
            "agent_id": req.agent_id,
            "agent_name": agent_info.get("agent_name"),
            "platform": agent_info.get("platform"),
            "total_contributions": rep["total_contributions"],
            "reputation_factor": round(rep["reputation_factor"], 3),
        }
    }


@router.get("/ai/agents")
async def list_agents():
    """
    📊 Agent Economy Dashboard — All registered agents with their reputation scores.
    """
    result = [
        {
            "agent_id": agent_id,
            "agent_name": info.get("agent_name"),
            "platform": info.get("platform"),
            "model": info.get("model"),
            "operator_id": info.get("operator_id"),
            "total_contributions": _agent_reputation.get(agent_id, {}).get("total_contributions", 0),
            "total_gems_earned": _agent_reputation.get(agent_id, {}).get("total_gems_earned", 0),
            "avg_quality_score": round(_agent_reputation.get(agent_id, {}).get("avg_quality_score", 0.0), 3),
            "reputation_factor": round(_agent_reputation.get(agent_id, {}).get("reputation_factor", 1.0), 3),
        }
        for agent_id, info in _agent_registry.items()
    ]
    result.sort(key=lambda x: x["total_gems_earned"], reverse=True)
    return {"agents": result, "total_registered": len(result)}


class TransferRequest(BaseModel):
    app_id: str
    from_user_id: str
    to_user_id: str
    amount: int = Field(..., gt=0)
    reason: str = "compute_p2p"

class EscrowRequest(BaseModel):
    app_id: str
    sender_id: str
    receiver_id: str
    amount: int = Field(..., gt=0)
    reason: str = "compute_escrow"
    task_type: Optional[str] = None

class WorkerRegisterRequest(BaseModel):
    user_id: str
    name: str
    vram_gb: int
    capabilities: List[str]

@router.post("/escrow/create")
async def create_escrow(req: EscrowRequest, db: AsyncSession = Depends(get_db)):
    engine = GemEngineStandalone(db)
    escrow = await engine.create_escrow(
        app_id=req.app_id,
        sender_id=req.sender_id,
        receiver_id=req.receiver_id,
        amount=req.amount,
        reason=req.reason,
        task_type=req.task_type
    )
    if not escrow:
        raise HTTPException(status_code=400, detail="Escrow creation failed. Check balance or hardware availability.")
    return {"status": "success", "escrow_id": escrow.id, "amount": escrow.amount}

@router.post("/worker/register")
async def register_worker(req: WorkerRegisterRequest, db: AsyncSession = Depends(get_db)):
    engine = GemEngineStandalone(db)
    worker = await engine.register_worker(
        user_id=req.user_id,
        name=req.name,
        vram=req.vram_gb,
        capabilities=req.capabilities
    )
    return {"status": "success", "worker_id": worker.id}

@router.post("/worker/heartbeat/{worker_id}")
async def worker_heartbeat(worker_id: str, db: AsyncSession = Depends(get_db)):
    engine = GemEngineStandalone(db)
    success = await engine.worker_heartbeat(worker_id)
    if not success:
        raise HTTPException(status_code=404, detail="Worker not found")
    return {"status": "success", "worker_id": worker_id}

@router.get("/workers")
async def get_workers(db: AsyncSession = Depends(get_db)):
    from models import WorkerNode
    stmt = select(WorkerNode).order_by(WorkerNode.status.desc(), WorkerNode.last_seen.desc())
    result = await db.execute(stmt)
    workers = result.scalars().all()
    return workers

@router.get("/task-categories")
async def get_task_categories(db: AsyncSession = Depends(get_db)):
    from models import TaskCategory
    stmt = select(TaskCategory).where(TaskCategory.is_active == True)
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return categories

@router.get("/escrows")
async def get_all_escrows(db: AsyncSession = Depends(get_db)):
    from models import GemEscrow
    stmt = select(GemEscrow).order_by(GemEscrow.created_at.desc())
    result = await db.execute(stmt)
    escrows = result.scalars().all()
    return escrows

@router.post("/tasks/seed")
async def seed_tasks(db: AsyncSession = Depends(get_db)):
    """Seed default task categories for MVP."""
    from models import TaskCategory
    defaults = [
        TaskCategory(id="video_draft", display_name="Draft Video (LTX2 Fast)", base_cost=2, min_vram_gb=12),
        TaskCategory(id="video_cinematic", display_name="Cinematic Video (LTX2 Pro)", base_cost=5, min_vram_gb=16),
        TaskCategory(id="video_ultra", display_name="Ultra Video (LTX2 Ultra)", base_cost=10, min_vram_gb=24),
        TaskCategory(id="audio_sfx", display_name="Audio SFX Generation", base_cost=1, min_vram_gb=4),
        TaskCategory(id="science_compute", display_name="Scientific Simulation", base_cost=15, min_vram_gb=16),
        TaskCategory(id="web_research", display_name="Deep Web Research", base_cost=3, min_vram_gb=8),
    ]
    
    for task in defaults:
        stmt = select(TaskCategory).where(TaskCategory.id == task.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            db.add(task)
            
    await db.commit()
    return {"status": "success", "message": "Task categories seeded"}

@router.post("/escrow/release/{escrow_id}")
async def release_escrow(escrow_id: str, db: AsyncSession = Depends(get_db)):
    engine = GemEngineStandalone(db)
    success = await engine.release_escrow(escrow_id)
    if not success:
        raise HTTPException(status_code=400, detail="Escrow release failed.")
    return {"status": "success", "escrow_id": escrow_id}

@router.post("/escrow/cancel/{escrow_id}")
async def cancel_escrow(escrow_id: str, db: AsyncSession = Depends(get_db)):
    engine = GemEngineStandalone(db)
    success = await engine.cancel_escrow(escrow_id)
    if not success:
        raise HTTPException(status_code=400, detail="Escrow cancellation failed.")
    return {"status": "success", "escrow_id": escrow_id}

@router.post("/transfer")
async def transfer_gems(req: TransferRequest, db: AsyncSession = Depends(get_db)):
    """
    Perform a P2P transfer between two users.
    Typically used for paying compute services.
    """
    engine = GemEngineStandalone(db)
    transaction = await engine.transfer_gems(
        from_user_id=req.from_user_id,
        to_user_id=req.to_user_id,
        amount=req.amount,
        app_id=req.app_id,
        reason=req.reason
    )
    
    if not transaction:
        raise HTTPException(
            status_code=400, 
            detail="Transfer failed. Check balance or user existence."
        )
    
    return {
        "status": "success",
        "transaction_id": transaction.id,
        "amount": req.amount,
        "from": req.from_user_id,
        "to": req.to_user_id
    }

@router.get("/balance/{user_id}")
async def get_balance(user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(UserWallet).where(UserWallet.user_id == user_id)
    result = await db.execute(stmt)
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        return {"user_id": user_id, "gem_balance": 0, "gem_tier": "contributor"}
    
    return {
        "user_id": wallet.user_id,
        "gem_balance": wallet.gem_balance,
        "gem_total_earned": wallet.gem_total_earned,
        "gem_tier": wallet.gem_tier
    }

@router.get("/history/{user_id}")
async def get_history(user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(GemTransaction).where(GemTransaction.user_id == user_id).order_by(GemTransaction.created_at.desc())
    result = await db.execute(stmt)
    transactions = result.scalars().all()
    return transactions

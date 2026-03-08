from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON, text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class AppRegistration(Base):
    """
    Client applications registered to use the GemReward service.
    Example: 'StoryCore-Engine', 'StoryCore-Blog', etc.
    """
    __tablename__ = "gem_apps"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    api_key = Column(String(64), unique=True, nullable=False)
    webhook_secret = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    reward_rules = relationship("AppRewardRule", back_populates="app")
    transactions = relationship("GemTransaction", back_populates="app")

class AppRewardRule(Base):
    """
    Reward rules specific to an application.
    Maps platform events (e.g., GitHub labels) to gem amounts.
    """
    __tablename__ = "gem_app_reward_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(36), ForeignKey("gem_apps.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # 'github_label', 'api_trigger'
    trigger_key = Column(String(100), nullable=False) # 'severity:critical', 'roadmap'
    gem_amount = Column(Integer, nullable=False)
    description = Column(String(255))
    
    app = relationship("AppRegistration", back_populates="reward_rules")

class UserWallet(Base):
    """
    Global user wallet tracking balances across the ecosystem.
    Users are identified by a global ID (linked to SSO or Email).
    """
    __tablename__ = "gem_user_wallets"

    user_id = Column(String(100), primary_key=True) # Global ID
    email = Column(String(255), unique=True, nullable=True)
    github_username = Column(String(100), unique=True, nullable=True)
    gem_balance = Column(Integer, default=0)
    gem_total_earned = Column(Integer, default=0)
    gem_tier = Column(String(20), default="contributor")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GemTransaction(Base):
    """
    Audit log of all gem transactions across all apps.
    """
    __tablename__ = "gem_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(36), ForeignKey("gem_apps.id"), nullable=False)
    user_id = Column(String(100), ForeignKey("gem_user_wallets.user_id"), nullable=False)
    amount = Column(Integer, nullable=False)
    transaction_type = Column(String(50), nullable=False) # 'reward', 'usage', 'transfer'
    source_platform = Column(String(50)) # 'github', 'manual'
    source_id = Column(String(255)) # GitHub Issue URL/ID
    status = Column(String(20), default="confirmed")
    metadata_json = Column(JSON) # Additional context
    created_at = Column(DateTime, default=datetime.utcnow)

    app = relationship("AppRegistration", back_populates="transactions")

class AgentApiKey(Base):
    """
    API keys granted to automated agents (LLMs/Scripts) per application.
    """
    __tablename__ = "gem_agent_api_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(36), ForeignKey("gem_apps.id"), nullable=False)
    owner_user_id = Column(String(100), ForeignKey("gem_user_wallets.user_id"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    api_key_hash = Column(String(128), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Stats for abuse detection
    total_reports = Column(Integer, default=0)
    total_duplicates = Column(Integer, default=0)
    total_gems_earned = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class GemEscrow(Base):
    """
    Temporary holding for P2P transactions (Escrow).
    Gems are deducted from sender but not yet credited to receiver.
    """
    __tablename__ = "gem_escrows"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(36), ForeignKey("gem_apps.id"), nullable=False)
    sender_id = Column(String(100), ForeignKey("gem_user_wallets.user_id"), nullable=False)
    receiver_id = Column(String(100), ForeignKey("gem_user_wallets.user_id"), nullable=False)
    amount = Column(Integer, nullable=False)
    status = Column(String(20), default="pending") # 'pending', 'released', 'cancelled'
    reason = Column(String(255))
    task_type = Column(String(50), nullable=True)
    metadata_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True) # Optional auto-cancel

class WorkerNode(Base):
    """
    Registry of hardware providers (Computers).
    """
    __tablename__ = "gem_worker_nodes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(100), ForeignKey("gem_user_wallets.user_id"), nullable=False)
    name = Column(String(100)) # e.g. "Workstation-RTX4090"
    vram_gb = Column(Integer, default=0)
    compute_score = Column(Float, default=1.0) # Benchmark score
    status = Column(String(20), default="offline") # 'online', 'busy', 'offline'
    capabilities = Column(JSON) # e.g. ["comfyui", "web_search", "science_compute"]
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class TaskCategory(Base):
    """
    Defines the value and requirements for different types of work.
    """
    __tablename__ = "gem_task_categories"

    id = Column(String(50), primary_key=True) # e.g. 'video_ultra', 'audio_sfx', 'science_sim'
    display_name = Column(String(100))
    base_cost = Column(Integer, nullable=False)
    min_vram_gb = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    metadata_json = Column(JSON)

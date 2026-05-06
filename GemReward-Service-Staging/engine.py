import logging
from datetime import datetime
from typing import Optional, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models import (
    AppRewardRule,
    UserWallet,
    GemTransaction,
    GemEscrow,
    WorkerNode,
    TaskCategory,
)

logger = logging.getLogger(__name__)


class GemEngineStandalone:
    """
    Decoupled GemEngine for multi-tenant rewards.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_app_rules(self, app_id: str) -> Dict[str, int]:
        """Fetch all reward rules for a specific application."""
        stmt = select(AppRewardRule).where(AppRewardRule.app_id == app_id)
        result = await self.db.execute(stmt)
        rules = result.scalars().all()

        # Convert to dictionary for easy lookup
        return {rule.trigger_key: rule.gem_amount for rule in rules}

    async def calculate_reward(self, app_id: str, trigger_keys: List[str]) -> int:
        """
        Calculate gem amount based on application-specific rules.
        Takes the maximum value found among trigger keys.
        """
        rules = await self.get_app_rules(app_id)
        # Ensure default is never negative
        max_gems = max(0, rules.get("__default__", 1))

        found = False
        for key in trigger_keys:
            if key in rules:
                # Take the higher reward, but ensure it's not negative
                max_gems = max(max_gems, rules[key])
                found = True

        reward = max_gems if found or "__default__" in rules else 0
        return max(0, reward)

    async def process_transaction(
        self,
        app_id: str,
        user_id: str,
        amount: int,
        transaction_type: str,
        source_platform: str,
        source_id: str,
        metadata: Optional[Dict] = None,
    ) -> Optional[GemTransaction]:
        """
        Atomically process a gem transaction:
        1. Update/Create User Wallet
        2. Record Transaction
        3. Update Tier (Optional global logic)
        """
        if amount < 0:
            logger.error(
                f"Rejected negative gem transaction: {amount} for user {user_id}"
            )
            return None

        try:
            # 1. Get or Create User Wallet
            stmt = (
                select(UserWallet)
                .where(UserWallet.user_id == user_id)
                .with_for_update()
            )
            result = await self.db.execute(stmt)
            wallet = result.scalar_one_or_none()

            if not wallet:
                wallet = UserWallet(user_id=user_id, gem_balance=0, gem_total_earned=0)
                self.db.add(wallet)
                await self.db.flush()

            # 2. Update Balance
            wallet.gem_balance += amount
            if amount > 0:
                wallet.gem_total_earned += amount

            # 3. Create Transaction Record
            transaction = GemTransaction(
                app_id=app_id,
                user_id=user_id,
                amount=amount,
                transaction_type=transaction_type,
                source_platform=source_platform,
                source_id=source_id,
                metadata_json=metadata or {},
                status="confirmed",
            )
            self.db.add(transaction)

            # 4. Tier Update Logic (Simplified)
            wallet.gem_tier = self._calculate_tier(wallet.gem_total_earned)

            await self.db.commit()
            return transaction

        except Exception as e:
            logger.error(f"Failed to process gem transaction: {e}")
            await self.db.rollback()
            return None

    async def transfer_gems(
        self,
        from_user_id: str,
        to_user_id: str,
        amount: int,
        app_id: str,
        reason: str = "p2p_transfer",
        metadata: Optional[Dict] = None,
    ) -> Optional[GemTransaction]:
        """
        Atomically transfer gems from one user to another.
        """
        if amount <= 0:
            logger.error(f"Transfer failed: Amount must be positive (got {amount})")
            return None

        try:
            # 1. Lock both wallets to prevent race conditions
            # Lock sender
            stmt_from = (
                select(UserWallet)
                .where(UserWallet.user_id == from_user_id)
                .with_for_update()
            )
            res_from = await self.db.execute(stmt_from)
            sender = res_from.scalar_one_or_none()

            if not sender or sender.gem_balance < amount:
                logger.error(
                    f"Transfer failed: Insufficient balance for {from_user_id}"
                )
                return None

            # Lock receiver
            stmt_to = (
                select(UserWallet)
                .where(UserWallet.user_id == to_user_id)
                .with_for_update()
            )
            res_to = await self.db.execute(stmt_to)
            receiver = res_to.scalar_one_or_none()

            if not receiver:
                # Create receiver if they don't exist
                receiver = UserWallet(
                    user_id=to_user_id, gem_balance=0, gem_total_earned=0
                )
                self.db.add(receiver)
                await self.db.flush()

            # 2. Update balances
            sender.gem_balance -= amount
            receiver.gem_balance += amount
            receiver.gem_total_earned += (
                amount  # Transfers count towards tier progression for the receiver
            )

            # 3. Create Audit Trail (Two sides of the same transaction)
            # Transaction for sender (negative)
            tx_sender = GemTransaction(
                app_id=app_id,
                user_id=from_user_id,
                amount=-amount,  # Internally we record negative for the sender's history
                transaction_type="transfer_sent",
                source_platform="p2p",
                source_id=to_user_id,
                metadata_json=metadata or {"reason": reason, "peer": to_user_id},
                status="confirmed",
            )

            # Transaction for receiver (positive)
            tx_receiver = GemTransaction(
                app_id=app_id,
                user_id=to_user_id,
                amount=amount,
                transaction_type="transfer_received",
                source_platform="p2p",
                source_id=from_user_id,
                metadata_json=metadata or {"reason": reason, "peer": from_user_id},
                status="confirmed",
            )

            self.db.add(tx_sender)
            self.db.add(tx_receiver)

            # 4. Update Tiers
            sender.gem_tier = self._calculate_tier(sender.gem_total_earned)
            receiver.gem_tier = self._calculate_tier(receiver.gem_total_earned)

            await self.db.commit()
            return tx_receiver  # Return the credit transaction as confirmation

        except Exception as e:
            logger.error(f"Failed to process P2P transfer: {e}")
            await self.db.rollback()
            return None

    async def validate_task_feasibility(self, task_type: str) -> bool:
        """
        Checks if there is at least one online worker capable of handling the task.
        """
        try:
            # 1. Get task requirements
            stmt_task = select(TaskCategory).where(
                TaskCategory.id == task_type, TaskCategory.is_active
            )
            res_task = await self.db.execute(stmt_task)
            task = res_task.scalar_one_or_none()

            if not task:
                # If task category doesn't exist, we fallback to allowing it (legacy)
                # or we can be strict. For MVP Secure, let's be strict.
                logger.warning(f"Task type {task_type} is not defined in TaskCategory.")
                return False

            # 2. Find online workers with enough VRAM and the right capability
            # We look for workers where task_type is in their capabilities JSON array
            # Note: specialized JSON filtering depends on DB (SQLite vs Postgres)
            # For SQLite (local), we'll do a simple check.
            stmt_worker = select(WorkerNode).where(
                WorkerNode.status == "online", WorkerNode.vram_gb >= task.min_vram_gb
            )
            res_worker = await self.db.execute(stmt_worker)
            workers = res_worker.scalars().all()

            # Filter by capability in python for maximum compatibility across DBs
            suitable_workers = [
                w
                for w in workers
                if task_type
                in (w.capabilities if isinstance(w.capabilities, list) else [])
            ]

            if not suitable_workers:
                logger.error(
                    f"Feasibility failed: No online worker for {task_type} (Req: {task.min_vram_gb}GB VRAM)"
                )
                return False

            return True
        except Exception as e:
            logger.error(f"Error validating task feasibility: {e}")
            return False

    async def register_worker(
        self, user_id: str, name: str, vram: int, capabilities: List[str]
    ) -> WorkerNode:
        """Join the compute mesh. If worker already exists for this user/name, update it."""
        try:
            stmt = select(WorkerNode).where(
                WorkerNode.user_id == user_id, WorkerNode.name == name
            )
            res = await self.db.execute(stmt)
            worker = res.scalar_one_or_none()

            if worker:
                worker.vram_gb = vram
                worker.capabilities = capabilities
                worker.status = "online"
                worker.last_seen = datetime.utcnow()
            else:
                worker = WorkerNode(
                    user_id=user_id,
                    name=name,
                    vram_gb=vram,
                    capabilities=capabilities,
                    status="online",
                    last_seen=datetime.utcnow(),
                )
                self.db.add(worker)

            await self.db.commit()
            return worker
        except Exception as e:
            logger.error(f"Error registering worker: {e}")
            await self.db.rollback()
            raise e

    async def worker_heartbeat(self, worker_id: str) -> bool:
        """Update last_seen for a worker and set status to online if it was offline."""
        try:
            stmt = select(WorkerNode).where(WorkerNode.id == worker_id)
            res = await self.db.execute(stmt)
            worker = res.scalar_one_or_none()

            if not worker:
                return False

            worker.last_seen = datetime.utcnow()
            if worker.status == "offline":
                worker.status = "online"

            await self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error in worker heartbeat: {e}")
            await self.db.rollback()
            return False

    async def cleanup_offline_workers(self, threshold_seconds: int = 300) -> int:
        """Mark workers as offline if they haven't sent a heartbeat recently."""
        try:
            from sqlalchemy import and_
            from datetime import timedelta

            cutoff = datetime.utcnow() - timedelta(seconds=threshold_seconds)

            stmt = (
                update(WorkerNode)
                .where(
                    and_(WorkerNode.status == "online", WorkerNode.last_seen < cutoff)
                )
                .values(status="offline")
            )

            result = await self.db.execute(stmt)
            await self.db.commit()
            return result.rowcount
        except Exception as e:
            logger.error(f"Error cleaning up offline workers: {e}")
            await self.db.rollback()
            return 0

    async def create_escrow(
        self,
        app_id: str,
        sender_id: str,
        receiver_id: str,
        amount: int,
        reason: str,
        task_type: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Optional[GemEscrow]:
        """
        Step 1: Dedut gems from sender and put them in Escrow.
        Now Hardware-Aware: checks if task is feasible before locking gems.
        """
        if amount <= 0:
            return None

        # Hardware Check
        if task_type:
            feasible = await self.validate_task_feasibility(task_type)
            if not feasible:
                logger.error(f"Escrow rejected: No hardware available for {task_type}")
                return None

        try:
            # 1. Lock sender wallet
            stmt = (
                select(UserWallet)
                .where(UserWallet.user_id == sender_id)
                .with_for_update()
            )
            res = await self.db.execute(stmt)
            sender = res.scalar_one_or_none()

            if not sender or sender.gem_balance < amount:
                logger.error(f"Escrow failed: Insufficient balance for {sender_id}")
                return None

            # 2. Subtract from sender
            sender.gem_balance -= amount

            # 3. Create Escrow record
            escrow = GemEscrow(
                app_id=app_id,
                sender_id=sender_id,
                receiver_id=receiver_id,
                amount=amount,
                reason=reason,
                task_type=task_type,
                metadata_json=metadata or {},
                status="pending",
            )
            self.db.add(escrow)

            # 4. Audit Transaction for sender
            tx = GemTransaction(
                app_id=app_id,
                user_id=sender_id,
                amount=-amount,
                transaction_type="escrow_lock",
                source_platform="p2p",
                source_id=receiver_id,
                metadata_json={"escrow_reason": reason},
                status="pending",
            )
            self.db.add(tx)

            await self.db.commit()
            return escrow

        except Exception as e:
            logger.error(f"Failed to create escrow: {e}")
            await self.db.rollback()
            return None

    async def release_escrow(self, escrow_id: str) -> bool:
        """
        Step 2 (Positive): Release escrowed gems to the receiver.
        Used when the work is validated.
        """
        try:
            # 1. Lock escrow record
            stmt = select(GemEscrow).where(GemEscrow.id == escrow_id).with_for_update()
            res = await self.db.execute(stmt)
            escrow = res.scalar_one_or_none()

            if not escrow or escrow.status != "pending":
                return False

            # 2. Lock receiver wallet
            stmt_recv = (
                select(UserWallet)
                .where(UserWallet.user_id == escrow.receiver_id)
                .with_for_update()
            )
            res_recv = await self.db.execute(stmt_recv)
            receiver = res_recv.scalar_one_or_none()

            if not receiver:
                receiver = UserWallet(
                    user_id=escrow.receiver_id, gem_balance=0, gem_total_earned=0
                )
                self.db.add(receiver)
                await self.db.flush()

            # 3. Credit receiver
            receiver.gem_balance += escrow.amount
            receiver.gem_total_earned += escrow.amount

            # 4. Update status
            escrow.status = "released"

            # 5. Audit Transaction for receiver
            tx = GemTransaction(
                app_id=escrow.app_id,
                user_id=escrow.receiver_id,
                amount=escrow.amount,
                transaction_type="escrow_release",
                source_platform="p2p",
                source_id=escrow.sender_id,
                metadata_json={"escrow_id": escrow_id},
                status="confirmed",
            )
            self.db.add(tx)

            # 6. Update Tier
            receiver.gem_tier = self._calculate_tier(receiver.gem_total_earned)

            await self.db.commit()
            return True

        except Exception as e:
            logger.error(f"Failed to release escrow: {e}")
            await self.db.rollback()
            return False

    async def cancel_escrow(self, escrow_id: str) -> bool:
        """
        Step 2 (Negative): Return escrowed gems to the sender.
        Used when work failed or cancelled.
        """
        try:
            stmt = select(GemEscrow).where(GemEscrow.id == escrow_id).with_for_update()
            res = await self.db.execute(stmt)
            escrow = res.scalar_one_or_none()

            if not escrow or escrow.status != "pending":
                return False

            # 1. Lock sender wallet
            stmt_send = (
                select(UserWallet)
                .where(UserWallet.user_id == escrow.sender_id)
                .with_for_update()
            )
            res_send = await self.db.execute(stmt_send)
            sender = res_send.scalar_one_or_none()

            if sender:
                sender.gem_balance += escrow.amount

            # 2. Update status
            escrow.status = "cancelled"

            # 3. Audit Transaction (Credit back)
            tx = GemTransaction(
                app_id=escrow.app_id,
                user_id=escrow.sender_id,
                amount=escrow.amount,
                transaction_type="escrow_refund",
                source_platform="p2p",
                source_id=escrow.receiver_id,
                metadata_json={"escrow_id": escrow_id},
                status="confirmed",
            )
            self.db.add(tx)

            await self.db.commit()
            return True

        except Exception as e:
            logger.error(f"Failed to cancel escrow: {e}")
            await self.db.rollback()
            return False

    def _calculate_tier(self, total_gems: int) -> str:
        """Global tier thresholds."""
        if total_gems >= 100:
            return "legend"
        if total_gems >= 30:
            return "gold"
        if total_gems >= 10:
            return "silver"
        return "contributor"

import asyncio
from db.session import AsyncSessionLocal
from models import UserWallet, AppRegistration, TaskCategory, WorkerNode


async def seed_test_data():
    async with AsyncSessionLocal() as db:
        # 1. Create a Test App
        app_id = "storycore-engine-main"
        test_app = AppRegistration(
            id=app_id, name="TestApp", api_key="gr_test_key", is_active=True
        )
        db.add(test_app)

        # 2. Create Task Categories
        tasks = [
            TaskCategory(
                id="video_ultra",
                display_name="Ultra Video Render",
                base_cost=50,
                min_vram_gb=16,
            ),
            TaskCategory(
                id="audio_sfx",
                display_name="Sound Effects Gen",
                base_cost=1,
                min_vram_gb=4,
            ),
            TaskCategory(
                id="science_sim",
                display_name="Scientific Simulation",
                base_cost=10,
                min_vram_gb=8,
            ),
        ]
        for t in tasks:
            db.add(t)

        # 3. Create users
        user_a = UserWallet(
            user_id="user_rich", gem_balance=100, gem_total_earned=100, gem_tier="gold"
        )
        user_b = UserWallet(
            user_id="user_worker",
            gem_balance=0,
            gem_total_earned=0,
            gem_tier="contributor",
        )
        user_c = UserWallet(
            user_id="system_shared_compute",
            gem_balance=0,
            gem_total_earned=0,
            gem_tier="contributor",
        )

        db.add(user_a)
        db.add(user_b)
        db.add(user_c)

        # 4. Create a Worker for user_worker
        worker = WorkerNode(
            user_id="user_worker",
            name="RTX-4090-Station",
            vram_gb=24,
            status="online",
            capabilities=["video_ultra", "audio_sfx", "science_sim"],
        )
        db.add(worker)

        await db.commit()
        print(f"✅ Users created. User A: 100 Gems, User B: 0 Gems. App ID: {app_id}")


if __name__ == "__main__":
    asyncio.run(seed_test_data())

import asyncio
import uuid
import logging
import httpx
from backend.cine_production_service import CineProductionService, CineProductionRequest, CineChainType, ProductionQuality
from backend.gem_service_client import gem_client

# Setup logging to see what's happening
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Simulation")

# Mock User and App Config
USER_ID = "user_rich"
WORKER_ID = "system_shared_compute" 
GEM_SERVICE_URL = "http://localhost:8001/v1/gems"

async def check_balances():
    res_sender = await gem_client.get_balance(USER_ID)
    res_receiver = await gem_client.get_balance(WORKER_ID)
    print(f"\n💰 [BALANCE CHECK]")
    print(f"   - {USER_ID}: {res_sender.get('gem_balance')} Gems ({res_sender.get('gem_tier')})")
    print(f"   - {WORKER_ID}: {res_receiver.get('gem_balance')} Gems")
    print("-" * 40)

async def simulate():
    print("🚀 Starting Cinematic Production Simulation with Gem Escrow...")
    
    # 0. Initial Balances
    await check_balances()

    # 1. Initialize Service
    # We use a mock or standard service, but since we want to see the GEM flow, 
    # we'll allow it to run up to the point of ComfyUI call.
    service = CineProductionService()
    
    # 2. Create a high-quality request
    req = CineProductionRequest(
        chain_type=CineChainType.LTX_VIDEO_GENERATION,
        project_id="test_project_simulation",
        quality=ProductionQuality.ULTRA, # 5x cost!
        video_prompt="A futuristic cyberpunk city at night with neon lights"
    )

    print(f"\n💎 Action: Launching ULTRA Production (Cost: 25 Gems)")
    job_id = await service.start_production_job(req, user_id=USER_ID)
    
    # 3. Check balance immediately (should be locked in escrow)
    print(f"   Job {job_id} started. Checking escrow status...")
    await asyncio.sleep(1) # Give it a second to process the start phase
    await check_balances()

    # 4. Wait for the job to finish 
    # (Since we might not have a real ComfyUI running, it might fail or we can wait)
    # To ensure it "finishes" correctly for simulation, let's look at the job status
    print(f"⏳ Waiting for job {job_id} to progress...")
    
    max_wait = 30
    while max_wait > 0:
        job = await service.get_job_status(job_id)
        print(f"   [JOB STATUS]: {job.status.value} - {job.current_step} ({job.progress}%)")
        
        if job.status.value in ["completed", "failed", "cancelled"]:
            break
            
        await asyncio.sleep(2)
        max_wait -= 2

    print(f"\n🏁 Simulation Result: {job.status.value}")
    if job.error:
        print(f"   ❌ Error: {job.error}")

    # 5. Final Balance check
    await check_balances()

if __name__ == "__main__":
    asyncio.run(simulate())

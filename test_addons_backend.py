
import asyncio
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from src.addon_manager import AddonManager, AddonType

async def test_addon_discovery():
    manager = AddonManager()
    print("Discovering addons...")
    paths = await manager.discover_addons()
    for path in paths:
        print(f"Found addon at: {path}")
        
    print("\nInitialising all addons...")
    await manager.initialize_all_addons()
    
    print(f"\nStats: {manager.stats}")
    print("\nList of all addons:")
    for name, info in manager.addons.items():
        print(f"- {name} ({info.manifest.type.value}): {info.state.value}")
        if info.error_message:
            print(f"  Error: {info.error_message}")

    # Try to enable Grok Imagine
    if "Grok Imagine" in manager.addons:
        print("\nEnabling Grok Imagine...")
        success = await manager.enable_addon("Grok Imagine")
        print(f"Success: {success}")
        
    print("\nEnabled addons:", manager.get_enabled_addons())

if __name__ == "__main__":
    asyncio.run(test_addon_discovery())

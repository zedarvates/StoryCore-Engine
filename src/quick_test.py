import asyncio
import aiohttp

async def test():
    async with aiohttp.ClientSession() as s:
        print("Testing http://127.0.0.1:8000...")
        try:
            r = await s.get('http://127.0.0.1:8000/', timeout=10)
            print('Status:', r.status)
            data = await r.json()
            print('Response:', data)
        except Exception as e:
            print('Error:', e)

asyncio.run(test())


import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text(
            "SELECT username, role, is_active FROM users ORDER BY created_at LIMIT 15"
        ))
        rows = result.fetchall()
        print(f"{'아이디':<20} {'role':<10} {'active'}")
        print("-" * 40)
        for row in rows:
            print(f"{row[0]:<20} {row[1]:<10} {row[2]}")

asyncio.run(check())

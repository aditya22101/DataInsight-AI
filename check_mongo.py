import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi

async def check_logs():
    load_dotenv()
    MONGODB_URL = os.getenv("MONGODB_URL")
    if not MONGODB_URL:
        print("MONGODB_URL not found in .env")
        return
    
    if "mongodb+srv" in MONGODB_URL:
        client = AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where())
    else:
        client = AsyncIOMotorClient(MONGODB_URL)
        
    db = client["dataforge"]
    collection = db["audit_logs"]
    count = await collection.count_documents({})
    print(f"Total logs in audit_logs: {count}")

if __name__ == "__main__":
    asyncio.run(check_logs())

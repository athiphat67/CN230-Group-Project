"""
config.py (ผู้จัดการหลังร้าน): ทำหน้าที่เดินไปเปิดตู้เซฟ (ไฟล์ .env) เพื่อหยิบ "กุญแจ" หรือ "ที่อยู่โกดัง" (DATABASE_URL) 
มาเตรียมไว้ให้พนักงานคนอื่นใช้งาน โดยที่คนนอกจะไม่เห็นว่ารหัสผ่านคืออะไร
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SECRET_KEY = os.getenv("SECRET_KEY")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import requests

app = FastAPI(title="Nuran Store Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# BotFather-dan olgan Tokeningizni shu yerga qo'ying:
BOT_TOKEN = ""  # <-- O'zingizning Tokeningizni joylang

otp_store = {}

class TelegramAuthRequest(BaseModel):
    telegram_id: str
    username: str

class OTPVerifyRequest(BaseModel):
    telegram_id: str
    code: str

# Telegram Bot orqali real xabar yuborish funksiyasi
def send_telegram_otp(chat_id: str, code: str):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": f"🔒 **Nuran Store**\n\nSizning tasdiqlash kodingiz: **{code}**\n\nKodni hech kimga bermang!",
        "parse_mode": "Markdown"
    }
    response = requests.post(url, json=payload)
    return response.json()

@app.post("/api/send-otp")
def send_otp(data: TelegramAuthRequest):
    otp_code = str(random.randint(1000, 9999))
    otp_store[data.telegram_id] = otp_code
    
    # Telegram Bot-ga so'rov yuboramiz
    result = send_telegram_otp(data.telegram_id, otp_code)
    
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail="Telegram ID noto'g'ri yoki botga /start bosilmagan!")
    
    return {"success": True, "message": "Tasdiqlash kodi Telegram botingizga yuborildi!"}

@app.post("/api/verify-otp")
def verify_otp(data: OTPVerifyRequest):
    saved_code = otp_store.get(data.telegram_id)
    
    if not saved_code:
        raise HTTPException(status_code=400, detail="Kod yuborilmagan yoki muddati o'tgan!")
    
    if saved_code == data.code:
        del otp_store[data.telegram_id]
        return {"success": True, "message": "Muvaffaqiyatli tasdiqlandi"}
    else:
        raise HTTPException(status_code=400, detail="Kiritilgan kod xato!")
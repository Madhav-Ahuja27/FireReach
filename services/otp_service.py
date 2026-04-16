import random
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple
from config import settings


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def otp_expiry() -> datetime:
    return datetime.utcnow() + timedelta(minutes=settings.demo_otp_ttl_minutes)


def is_otp_valid(stored_otp: str, submitted_otp: str, expires: datetime) -> bool:
    if datetime.utcnow() > expires:
        return False
    return stored_otp == submitted_otp.strip()


async def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via Twilio if configured, returns True if sent."""
    if not all(
        [settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_from_number]
    ):
        return False

    try:
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=f"Your FireReach verification code is: {otp}",
            from_=settings.twilio_from_number,
            to=phone,
        )
        return True
    except Exception:
        return False

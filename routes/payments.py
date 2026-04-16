import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models import Credits, Payment, User
from schemas import PaymentCreate, PaymentResponse, PaymentSubmit
from services.otp_service import generate_otp, is_otp_valid, otp_expiry, send_otp_sms

router = APIRouter(prefix="/api/payments", tags=["payments"])

PLANS = {
    "STARTER":    {"price": 9.00,  "credits": 50},
    "GROWTH":     {"price": 29.00, "credits": 200},
    "SCALE":      {"price": 79.00, "credits": 600},
    "PRO":        {"price": 149.00,"credits": 1500},
    "ENTERPRISE": {"price": 299.00,"credits": 5000},
}


@router.post("/demo/create", response_model=PaymentResponse)
async def create_payment(
    data: PaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = data.plan.upper()
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan. Valid: {list(PLANS.keys())}")

    info = PLANS[plan]
    otp = generate_otp()
    payment_id = str(uuid.uuid4())

    sms_sent = False
    if data.phone:
        sms_sent = await send_otp_sms(data.phone, otp)

    payment = Payment(
        id=payment_id,
        user_id=user.id,
        plan=plan,
        amount=info["price"],
        credits_to_add=info["credits"],
        otp=otp,
        otp_expires=otp_expiry(),
        status="pending",
        debug_otp=otp if settings.demo_otp_debug else None,
    )
    db.add(payment)
    db.commit()

    return PaymentResponse(
        payment_id=payment_id,
        plan=plan,
        amount=info["price"],
        credits_to_add=info["credits"],
        status="pending",
        debug_otp=otp if settings.demo_otp_debug and not sms_sent else None,
    )


@router.get("/demo/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Payment).filter(Payment.id == payment_id, Payment.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return PaymentResponse(
        payment_id=p.id,
        plan=p.plan,
        amount=p.amount,
        credits_to_add=p.credits_to_add,
        status=p.status,
        debug_otp=p.debug_otp if settings.demo_otp_debug else None,
    )


@router.post("/demo/{payment_id}/submit", response_model=PaymentResponse)
def submit_otp(
    payment_id: str,
    data: PaymentSubmit,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Payment).filter(Payment.id == payment_id, Payment.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    if p.status != "pending":
        raise HTTPException(status_code=400, detail=f"Payment already {p.status}")
    if not is_otp_valid(p.otp, data.otp, p.otp_expires):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Credit user
    cr = user.credits
    if not cr:
        cr = Credits(user_id=user.id, balance=0)
        db.add(cr)
    cr.balance += p.credits_to_add
    p.status = "completed"
    db.commit()

    return PaymentResponse(
        payment_id=p.id,
        plan=p.plan,
        amount=p.amount,
        credits_to_add=p.credits_to_add,
        status="completed",
    )


@router.get("/demo/{payment_id}/status")
def payment_status(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Payment).filter(Payment.id == payment_id, Payment.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"payment_id": p.id, "status": p.status}

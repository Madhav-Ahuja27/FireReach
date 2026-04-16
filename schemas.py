from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Credits ───────────────────────────────────────────────────────────
class CreditResponse(BaseModel):
    balance: int
    user_id: int


class ConsumeCredits(BaseModel):
    amount: int


# ── Payments ──────────────────────────────────────────────────────────
class PaymentCreate(BaseModel):
    plan: str
    phone: Optional[str] = None


class PaymentSubmit(BaseModel):
    otp: str


class PaymentResponse(BaseModel):
    payment_id: str
    plan: str
    amount: float
    credits_to_add: int
    status: str
    debug_otp: Optional[str] = None


# ── Campaign ──────────────────────────────────────────────────────────
class CampaignRequest(BaseModel):
    icp: str
    mode: str = "manual"
    target_email: Optional[str] = None
    test_recipient: Optional[str] = None


class SelectCompanyRequest(BaseModel):
    icp: str
    company: Dict[str, Any]


class SendEmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    history_id: Optional[str] = None


# ── History ───────────────────────────────────────────────────────────
class HistoryCreate(BaseModel):
    icp: str
    mode: str
    target_email: Optional[str] = None
    test_recipient: Optional[str] = None
    result: Dict[str, Any]


class HistoryUpdate(BaseModel):
    result: Optional[Dict[str, Any]] = None


class HistoryResponse(BaseModel):
    id: str
    icp: str
    mode: str
    result: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Credits, User
from schemas import ConsumeCredits, CreditResponse

router = APIRouter(prefix="/api/credits", tags=["credits"])


def _ensure_credits(user: User, db: Session) -> Credits:
    if not user.credits:
        cr = Credits(user_id=user.id, balance=0)
        db.add(cr)
        db.commit()
        db.refresh(cr)
        return cr
    return user.credits


@router.get("", response_model=CreditResponse)
def get_credits(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cr = _ensure_credits(user, db)
    return {"balance": cr.balance, "user_id": user.id}


@router.post("/consume", response_model=CreditResponse)
def consume_credits(
    data: ConsumeCredits,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cr = _ensure_credits(user, db)
    if cr.balance < data.amount:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    cr.balance -= data.amount
    db.commit()
    db.refresh(cr)
    return {"balance": cr.balance, "user_id": user.id}

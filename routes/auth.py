from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models import Credits, User
from schemas import TokenResponse, UserCreate, UserLogin, UserResponse, UserUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": exp},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


@router.post("/signup", response_model=TokenResponse)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    try:
        # Log what we received
        logger.info(f"Signup attempt: email={data.email}, name={data.name}, password_len={len(data.password)}, password_bytes={len(data.password.encode('utf-8'))}")
        
        # Validate input lengths
        if len(data.email) > 255:
            raise HTTPException(status_code=400, detail="Email too long (max 255 characters)")
        if len(data.name) > 255:
            raise HTTPException(status_code=400, detail="Name too long (max 255 characters)")
        
        password_bytes = data.password.encode('utf-8')
        logger.info(f"Password bytes: {len(password_bytes)}, repr: {repr(data.password)}")
        if len(password_bytes) > 72:
            logger.warning(f"Password too long: {len(password_bytes)} bytes")
            raise HTTPException(status_code=400, detail=f"Password too long ({len(password_bytes)} bytes, max 72 bytes)")

        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            email=data.email,
            name=data.name,
            password_hash=pwd.hash(data.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        db.add(Credits(user_id=user.id, balance=20))
        db.commit()
        db.refresh(user)

        return {"access_token": _create_token(user.id), "user": user}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Signup failed: {type(exc).__name__}: {exc}", exc_info=exc)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Signup failed: {exc}")


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not pwd.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": _create_token(user.id), "user": user}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.name:
        user.name = data.name
    if data.email:
        if db.query(User).filter(User.email == data.email, User.id != user.id).first():
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email
    db.commit()
    db.refresh(user)
    return user

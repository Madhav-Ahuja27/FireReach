from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    credits = relationship("Credits", back_populates="user", uselist=False, cascade="all, delete-orphan")
    histories = relationship("History", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")


class Credits(Base):
    __tablename__ = "credits"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Integer, default=20, nullable=False)

    user = relationship("User", back_populates="credits")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    credits_to_add = Column(Integer, nullable=False)
    otp = Column(String, nullable=True)
    otp_expires = Column(DateTime, nullable=True)
    status = Column(String, default="pending")
    debug_otp = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="payments")


class History(Base):
    __tablename__ = "histories"

    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    icp = Column(Text, nullable=False)
    mode = Column(String, nullable=False)
    target_email = Column(String, nullable=True)
    test_recipient = Column(String, nullable=True)
    result = Column(Text, nullable=False)  # JSON blob
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="histories")

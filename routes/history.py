import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import History, User
from schemas import HistoryCreate, HistoryResponse, HistoryUpdate

router = APIRouter(prefix="/api/history", tags=["history"])


@router.post("", response_model=HistoryResponse)
def create_history(
    data: HistoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    h = History(
        id=str(uuid.uuid4()),
        user_id=user.id,
        icp=data.icp,
        mode=data.mode,
        target_email=data.target_email,
        test_recipient=data.test_recipient,
        result=json.dumps(data.result),
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return _to_resp(h)


@router.get("", response_model=list[HistoryResponse])
def list_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(History)
        .filter(History.user_id == user.id)
        .order_by(History.created_at.desc())
        .all()
    )
    print(f"User {user.id} has {len(items)} history items")
    return [_to_resp(h) for h in items]


@router.get("/{history_id}", response_model=HistoryResponse)
def get_history(
    history_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    h = _get_or_404(history_id, user.id, db)
    return _to_resp(h)


@router.patch("/{history_id}", response_model=HistoryResponse)
def update_history(
    history_id: str,
    data: HistoryUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    h = _get_or_404(history_id, user.id, db)
    if data.result is not None:
        h.result = json.dumps(data.result)
    db.commit()
    db.refresh(h)
    return _to_resp(h)


@router.delete("/{history_id}")
def delete_history(
    history_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    h = _get_or_404(history_id, user.id, db)
    db.delete(h)
    db.commit()
    return {"deleted": history_id}


# ── Helpers ───────────────────────────────────────────────────────────

def _get_or_404(history_id: str, user_id: int, db: Session) -> History:
    h = db.query(History).filter(History.id == history_id, History.user_id == user_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="History entry not found")
    return h


def _to_resp(h: History) -> HistoryResponse:
    return HistoryResponse(
        id=h.id,
        icp=h.icp,
        mode=h.mode,
        result=json.loads(h.result),
        created_at=h.created_at,
    )

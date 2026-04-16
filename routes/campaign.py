import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from agent import run_agent
from config import settings
from database import get_db, SessionLocal
from dependencies import get_current_user
from models import Credits, History, User
from schemas import CampaignRequest, SelectCompanyRequest, SendEmailRequest
from services.email_service import send_email

router = APIRouter(prefix="/api", tags=["campaign"])

CREDIT_COST = {"manual": 5, "auto": 10}


@router.post("/run-agent")
async def run_agent_endpoint(
    data: CampaignRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mode = data.mode if data.mode in ("manual", "auto") else "manual"
    cost = CREDIT_COST[mode]

    cr: Credits = user.credits
    if not cr or cr.balance < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. Need {cost}, have {cr.balance if cr else 0}.",
        )

    # Deduct credits up-front
    cr.balance -= cost
    db.commit()

    user_id = user.id  # Get id before async

    async def stream():
        result_data = None
        try:
            async for line in run_agent(
                icp=data.icp,
                mode=mode,
                target_email=data.target_email,
                test_recipient=data.test_recipient,
            ):
                yield line
                parsed = json.loads(line.strip())
                if parsed.get("type") == "result":
                    result_data = parsed.get("data", {})
        except Exception as e:
            # Refund credits on failure
            cr.balance += cost
            db.commit()
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"
            return

        # Persist history
        if result_data:
            with SessionLocal() as db_save:
                h = History(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    icp=data.icp,
                    mode=mode,
                    target_email=data.target_email,
                    test_recipient=data.test_recipient,
                    result=json.dumps(result_data),
                )
                db_save.add(h)
                db_save.commit()
                yield json.dumps({"type": "history_saved", "history_id": h.id}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@router.post("/select-company")
async def select_company(
    data: SelectCompanyRequest,
    user: User = Depends(get_current_user),
):
    """
    Manual mode: user selects a company from rankings.
    Returns contacts + outreach draft for that company.
    """
    from agent import _serper, _llm, _safe_json, _snippets

    company = data.company
    name = company.get("name", "")
    domain = company.get("domain", "company.com")
    brief = company.get("brief", "")
    signals = company.get("verified_signals", [])

    # Contact discovery
    contact_results = await _serper(
        f"site:linkedin.com {name} VP OR Director OR Head OR CRO", num=5
    )
    contacts_parsed = _safe_json(await _llm(
        system='Extract or infer realistic contacts. Return ONLY valid JSON: {"contacts": [{"name":"...","title":"...","email":"...","linkedin":"..."}]}',
        user=f"Company: {name}\nDomain: {domain}\nSearch:\n{_snippets(contact_results)}",
        json_mode=True,
    ))
    contacts = contacts_parsed.get("contacts", []) or [
        {"name": "Jordan Lee", "title": "VP of Sales", "email": f"jordan.lee@{domain}", "linkedin": ""},
        {"name": "Morgan Chen", "title": "Head of Revenue", "email": f"morgan.chen@{domain}", "linkedin": ""},
    ]

    primary = contacts[0]

    # Outreach generation
    outreach_raw = _safe_json(await _llm(
        system='Write a compelling B2B cold email. Always include a greeting and a closing in the body. Return ONLY valid JSON: {"subject":"...","body":"..."}',
        user=(
            f"Seller ICP: {data.icp}\n"
            f"Target: {name}\nBrief: {brief}\n"
            f"Signals: {json.dumps(signals)}\n"
            f"Contact: {primary.get('name', '')} — {primary.get('title', '')}"
        ),
        json_mode=True,
        max_tokens=600,
    ))

    return {
        "company": company,
        "contacts": contacts,
        "outreach": {
            "subject": outreach_raw.get("subject") or f"Quick idea for {name}",
            "body": outreach_raw.get("body") or "Hi there,\n\nI wanted to reach out...",
        },
    }


@router.post("/send-email")
async def send_email_endpoint(
    data: SendEmailRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.sender_email or not settings.sender_email_app_password:
        raise HTTPException(
            status_code=503,
            detail="SMTP not configured. Set SENDER_EMAIL and SENDER_EMAIL_APP_PASSWORD.",
        )
    try:
        await send_email(
            to_email=data.to_email,
            subject=data.subject,
            body=data.body,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Send failed: {exc}")

    # Update history if provided
    if data.history_id:
        h = db.query(History).filter(
            History.id == data.history_id, History.user_id == user.id
        ).first()
        if h:
            result = json.loads(h.result)
            result["send_outcome"] = "sent"
            result["send_to"] = data.to_email
            h.result = json.dumps(result)
            db.commit()

    return {"status": "sent", "to": data.to_email}

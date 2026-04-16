"""
FireReach 7-Agent Pipeline
Streams NDJSON step events → result to frontend.
"""

import asyncio
import json
import re
from typing import AsyncGenerator, Any, Dict, List, Optional

import httpx
from openai import AsyncOpenAI

from config import settings

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )
    return _client


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _event(type_: str, **kwargs) -> str:
    return json.dumps({"type": type_, **kwargs}) + "\n"


def _safe_json(text: str) -> Any:
    """Best-effort JSON extraction from LLM output."""
    if not text:
        return {}
    # Direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Strip markdown fences
    fenced = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except Exception:
            pass
    # Extract first {...} or [...]
    bracket = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if bracket:
        try:
            return json.loads(bracket.group(1))
        except Exception:
            pass
    return {}


async def _serper(query: str, num: int = 5) -> List[Dict]:
    if not settings.serper_api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=12) as http:
            resp = await http.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": settings.serper_api_key, "Content-Type": "application/json"},
                json={"q": query, "num": num},
            )
            return resp.json().get("organic", [])
    except Exception:
        return []


async def _llm(system: str, user: str, json_mode: bool = False, max_tokens: int = 1000) -> str:
    if not settings.groq_api_key:
        return "{}"
    client = _get_client()
    kwargs: Dict[str, Any] = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        resp = await client.chat.completions.create(
            model=settings.groq_model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            **kwargs,
        )
        return resp.choices[0].message.content or "{}"
    except Exception as e:
        return json.dumps({"error": str(e)})


def _snippets(results: List[Dict]) -> str:
    return "\n".join(
        f"- {r.get('title', '')} | {r.get('snippet', '')} | {r.get('link', '')}"
        for r in results
    )


# ─────────────────────────────────────────────────────────────────────────────
# Main Agent
# ─────────────────────────────────────────────────────────────────────────────

async def run_agent(
    icp: str,
    mode: str = "manual",
    target_email: Optional[str] = None,
    test_recipient: Optional[str] = None,
) -> AsyncGenerator[str, None]:

    companies: List[Dict] = []
    raw_signals: Dict[str, List] = {}
    verified_signals: Dict[str, Dict] = {}
    briefs: Dict[str, str] = {}
    rankings: List[Dict] = []
    contacts: List[Dict] = []
    outreach: Dict[str, str] = {}

    # ── Step 1: Company Discovery ─────────────────────────────────────
    yield _event("step", step="step1", status="in-progress",
                 message="Scanning market for companies matching your ICP...")

    raw1 = await _serper(f"companies {icp}", num=8)
    raw1 += await _serper(f"top {icp} companies funding OR growth", num=4)

    parsed_cos = _safe_json(await _llm(
        system=(
            "Extract 5-8 distinct target company names from the provided search results. "
            "For each, infer or guess a plausible domain and write one sentence about them. "
            'Return ONLY valid JSON: {"companies": [{"name":"...","domain":"...","description":"..."}]}'
        ),
        user=f"ICP: {icp}\n\nSearch results:\n{_snippets(raw1[:10])}",
        json_mode=True,
    ))

    companies = parsed_cos.get("companies", [])

    # Fallback if LLM or search didn't yield results
    if not companies or len(companies) < 3:
        synth = _safe_json(await _llm(
            system=(
                "Generate 6 realistic company names that would be strong buyers for this ICP. "
                'Return ONLY valid JSON: {"companies": [{"name":"...","domain":"...","description":"..."}]}'
            ),
            user=f"ICP: {icp}",
            json_mode=True,
        ))
        companies = synth.get("companies", [
            {"name": "Acme Corp", "domain": "acmecorp.com", "description": "Fast-growing tech company"},
            {"name": "NexaVentures", "domain": "nexaventures.io", "description": "Series B startup"},
        ])

    companies = companies[:6]
    yield _event("step", step="step1", status="done",
                 message=f"Discovered {len(companies)} target companies.")

    # ── Step 2: Signal Harvesting ─────────────────────────────────────
    yield _event("step", step="step2", status="in-progress",
                 message="Harvesting buying signals — funding, hiring, expansion...")

    for co in companies:
        name = co.get("name", "")
        results = await _serper(f"{name} funding OR hiring OR expansion OR product launch 2024 2025", num=4)
        raw_signals[name] = results
        await asyncio.sleep(0.1)  # avoid rate-limits in tight loops

    yield _event("step", step="step2", status="done",
                 message=f"Signal harvest complete for {len(raw_signals)} companies.")

    # ── Step 3: Signal Verification ───────────────────────────────────
    yield _event("step", step="step3", status="in-progress",
                 message="Verifying and scoring signal quality...")

    for co in companies:
        name = co.get("name", "")
        snips = _snippets(raw_signals.get(name, []))
        verified = _safe_json(await _llm(
            system=(
                "Analyse the buying signals for a B2B company. "
                "Score signal strength 0-100. List only credible signals. "
                'Return ONLY valid JSON: {"signal_score": <int>, "verified_signals": ["..."], "signal_categories": ["funding","hiring","expansion","product"]}'
            ),
            user=f"Company: {name}\nSignals:\n{snips or 'No results found.'}",
            json_mode=True,
        ))

        # Ensure non-zero score
        score = int(verified.get("signal_score", 0))
        if score == 0:
            score = 35  # deterministic baseline

        verified_signals[name] = {
            "signal_score": score,
            "verified_signals": verified.get("verified_signals", []),
            "signal_categories": verified.get("signal_categories", []),
        }

    yield _event("step", step="step3", status="done",
                 message="Signal verification complete.")

    # ── Step 4: Research Brief Generation ────────────────────────────
    yield _event("step", step="step4", status="in-progress",
                 message="Generating account intelligence briefs...")

    for co in companies:
        name = co.get("name", "")
        sig = verified_signals.get(name, {})
        brief = await _llm(
            system="Write a 3-sentence account intelligence brief for a B2B sales rep. Be specific and insight-driven.",
            user=(
                f"Company: {name}\n"
                f"Description: {co.get('description', '')}\n"
                f"Signals: {json.dumps(sig.get('verified_signals', []))}\n"
                f"Seller ICP: {icp}"
            ),
            max_tokens=300,
        )
        briefs[name] = brief.strip()

    yield _event("step", step="step4", status="done",
                 message="Account briefs generated.")

    # ── Step 5: ICP + Signal Scoring & Ranking ────────────────────────
    yield _event("step", step="step5", status="in-progress",
                 message="Scoring ICP fit and ranking opportunities...")

    cos_payload = json.dumps([
        {
            "name": co.get("name"),
            "description": co.get("description", ""),
            "brief": briefs.get(co.get("name", ""), ""),
            "signal_score": verified_signals.get(co.get("name", ""), {}).get("signal_score", 35),
        }
        for co in companies
    ])

    scoring = _safe_json(await _llm(
        system=(
            "Score each company's ICP fit 0-100 against the seller profile. "
            "Be discriminating — vary scores meaningfully. "
            'Return ONLY valid JSON: {"scores": [{"name":"...","icp_score":<int>,"reasoning":"..."}]}'
        ),
        user=f"Seller ICP: {icp}\n\nCompanies:\n{cos_payload}",
        json_mode=True,
    ))

    icp_scores: Dict[str, int] = {}
    icp_reasoning: Dict[str, str] = {}
    for item in scoring.get("scores", []):
        n = item.get("name", "")
        s = int(item.get("icp_score", 50))
        icp_scores[n] = max(1, s)
        icp_reasoning[n] = item.get("reasoning", "")

    ranked = []
    for co in companies:
        name = co.get("name", "")
        sig_s = verified_signals.get(name, {}).get("signal_score", 35)
        icp_s = icp_scores.get(name, 50)
        final_s = round(0.4 * sig_s + 0.6 * icp_s)
        ranked.append({
            **co,
            "signal_score": sig_s,
            "icp_score": icp_s,
            "final_score": final_s,
            "avg_score": final_s,       # UI card key
            "brief": briefs.get(name, ""),
            "icp_reasoning": icp_reasoning.get(name, ""),
            "verified_signals": verified_signals.get(name, {}).get("verified_signals", []),
            "signal_categories": verified_signals.get(name, {}).get("signal_categories", []),
        })

    ranked.sort(key=lambda x: x["final_score"], reverse=True)
    for i, r in enumerate(ranked):
        r["rank"] = i + 1

    rankings = ranked

    top = rankings[0] if rankings else None
    yield _event("step", step="step5", status="done",
                 message=f"Ranked {len(rankings)} companies. Top: {top['name'] if top else 'N/A'} ({top['final_score'] if top else 0}%)")

    # ── Step 6: Contact Discovery ─────────────────────────────────────
    yield _event("step", step="step6", status="in-progress",
                 message=f"Finding decision-maker contacts at {top['name'] if top else 'top company'}...")

    if top:
        domain = top.get("domain", "company.com")
        contact_raw = await _serper(
            f"site:linkedin.com {top['name']} VP OR Director OR Head OR CRO OR CMO", num=5
        )
        contacts_parsed = _safe_json(await _llm(
            system=(
                "Extract or infer realistic B2B contact candidates for this company. "
                "Use the domain for email patterns (firstname.lastname@domain). "
                'Return ONLY valid JSON: {"contacts": [{"name":"...","title":"...","email":"...","linkedin":"..."}]}'
            ),
            user=(
                f"Company: {top['name']}\nDomain: {domain}\n"
                f"Search results:\n{_snippets(contact_raw)}"
            ),
            json_mode=True,
        ))

        contacts = contacts_parsed.get("contacts", [])

    # Deterministic fallback
    if not contacts and top:
        domain = top.get("domain", "company.com")
        contacts = [
            {"name": "Jordan Lee", "title": "VP of Sales", "email": f"jordan.lee@{domain}", "linkedin": ""},
            {"name": "Morgan Chen", "title": "Head of Revenue", "email": f"morgan.chen@{domain}", "linkedin": ""},
            {"name": "Alex Rivera", "title": "Chief Revenue Officer", "email": f"a.rivera@{domain}", "linkedin": ""},
        ]

    yield _event("step", step="step6", status="done",
                 message=f"Found {len(contacts)} contact candidates.")

    # ── Step 7: Outreach Generation + Send ───────────────────────────
    yield _event("step", step="step7", status="in-progress",
                 message="Generating personalised outreach email...")

    primary = contacts[0] if contacts else {"name": "there", "title": "Decision Maker", "email": ""}

    outreach_raw = _safe_json(await _llm(
        system=(
            "Write a compelling, personalised B2B cold email (3-4 short paragraphs). "
            "Reference specific signals. Be direct, value-first, no fluff. "
            'Return ONLY valid JSON: {"subject": "...", "body": "..."}'
        ),
        user=(
            f"Seller ICP: {icp}\n"
            f"Target company: {top['name'] if top else 'Company'}\n"
            f"Company brief: {top.get('brief', '') if top else ''}\n"
            f"Buying signals: {json.dumps(top.get('verified_signals', []) if top else [])}\n"
            f"Contact: {primary.get('name', 'there')} — {primary.get('title', '')}"
        ),
        json_mode=True,
        max_tokens=600,
    ))

    outreach = {
        "subject": outreach_raw.get("subject") or f"Quick idea for {top['name'] if top else 'your team'}",
        "body": outreach_raw.get("body") or "Hi there,\n\nI wanted to reach out about...",
    }

    send_outcome = "draft"
    send_to = test_recipient or target_email or primary.get("email", "")

    if mode == "auto" and send_to:
        if settings.sender_email and settings.sender_email_app_password:
            try:
                from services.email_service import send_email
                await send_email(
                    to_email=send_to,
                    subject=outreach["subject"],
                    body=outreach["body"],
                )
                send_outcome = "sent"
            except Exception as exc:
                send_outcome = f"send_failed: {exc}"
        else:
            send_outcome = "skipped_no_smtp"

    yield _event("step", step="step7", status="done",
                 message=f"Outreach {'sent to ' + send_to if send_outcome == 'sent' else 'draft ready'}.")

    # ── Final Result ──────────────────────────────────────────────────
    selected_company_data = (
        {**top, "contacts": contacts} if top else None
    )

    yield _event("result", data={
        "status": "completed",
        "send_mode": mode,
        "send_outcome": send_outcome,
        "send_to": send_to,
        "companies": companies,
        "rankings": rankings,
        "selected_company": selected_company_data,
        "selected_company_name": top["name"] if top else "",
        "contacts": contacts,
        "outreach": outreach,
        "summary": {
            "total_companies": len(rankings),
            "top_company": top["name"] if top else "",
            "top_score": top["final_score"] if top else 0,
            "signals_found": sum(
                len(v.get("verified_signals", [])) for v in verified_signals.values()
            ),
        },
    })

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings


async def send_email(to_email: str, subject: str, body: str) -> None:
    """Send email via SMTP (Gmail app password)."""
    if not settings.sender_email or not settings.sender_email_app_password:
        raise ValueError("SMTP credentials not configured (SENDER_EMAIL / SENDER_EMAIL_APP_PASSWORD)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.sender_email
    msg["To"] = to_email

    # Plain-text part
    plain = MIMEText(body, "plain")
    # Simple HTML wrapper
    html_body = body.replace("\n", "<br>")
    html = MIMEText(
        f"""<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
{html_body}
</body></html>""",
        "html",
    )
    msg.attach(plain)
    msg.attach(html)

    await aiosmtplib.send(
        msg,
        hostname="smtp.gmail.com",
        port=587,
        start_tls=True,
        username=settings.sender_email,
        password=settings.sender_email_app_password,
    )

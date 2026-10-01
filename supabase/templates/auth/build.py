#!/usr/bin/env python3
"""Branded Supabase Auth emails (CLAUDE.md §10).

Renders one HTML file per Auth email type next to this script. Push them to
production with `apply.py`; the Go-template placeholders ({{ .ConfirmationURL }},
{{ .Token }}, {{ .Email }}, {{ .NewEmail }}) are filled in by Supabase.

Email-client constraints: table layout, inline styles only, no web fonts,
bulletproof <a> button, logo on an explicit white cell so dark-mode clients
that recolour backgrounds still show the black wordmark.
"""

from pathlib import Path

HERE = Path(__file__).parent
LOGO = "https://bachwears.com/logo-bach.png"  # 1070x220 black wordmark, transparent
FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif"
INK = "#111111"
BODY = "#45423e"
MUTED = "#86817a"
PAPER = "#f4f2ee"
RULE = "#e6e2dc"

SUBJECTS = {
    "confirmation": "Confirm your BACH Wears account",
    "recovery": "Reset your BACH Wears password",
    "magic_link": "Your BACH Wears sign-in link",
    "email_change": "Confirm your new email for BACH Wears",
    "invite": "You're invited to BACH Wears",
    "reauthentication": "{{ .Token }} is your BACH Wears code",
    "password_changed_notification": "Your BACH Wears password was changed",
}

# Security notices carry no one-time link; their button points at a fixed page.
NOTICE_URLS = {
    "password_changed_notification": "https://bachwears.com/account/forgot",
}

# Notices Supabase only sends when switched on (apply.py enables these).
NOTICES = {"password_changed_notification": "mailer_notifications_password_changed_enabled"}

# eyebrow, title, body (HTML), button label (None = code email), preheader, ignore note
CONTENT = {
    "confirmation": (
        "Welcome",
        "Confirm your email.",
        "One step left. Confirm this address to activate your BACH Wears account — "
        "your orders, wishlist and birthday gift, in one place.",
        "Confirm email",
        "Activate your BACH Wears account.",
        "Didn't create an account? Ignore this email and nothing will be set up.",
    ),
    "recovery": (
        "Your account",
        "Reset your password.",
        "We received a request to reset the password on your BACH Wears account. "
        "Choose a new one below — open the link on the device you used to request it.",
        "Choose a new password",
        "Choose a new password for your BACH Wears account.",
        "Didn't ask for this? Ignore this email — your password stays as it is.",
    ),
    "magic_link": (
        "Sign in",
        "Your sign-in link.",
        "Use the button below to sign in to BACH Wears. The link works once.",
        "Sign in",
        "Sign in to BACH Wears with one tap.",
        "Didn't try to sign in? You can safely ignore this email.",
    ),
    "email_change": (
        "Your account",
        "Confirm your new email.",
        'Confirm that <strong style="color:%s;font-weight:600;">{{ .NewEmail }}</strong> should replace '
        "{{ .Email }} on your BACH Wears account." % INK,
        "Confirm new email",
        "Confirm the new email on your BACH Wears account.",
        "Didn't request this change? Ignore this email and write to care@bachwears.com.",
    ),
    "invite": (
        "Invitation",
        "You're invited.",
        "You've been invited to join BACH Wears. Accept below to set up your account and choose a password.",
        "Accept invitation",
        "Your BACH Wears invitation.",
        "Not expecting this? You can safely ignore this email.",
    ),
    "reauthentication": (
        "Security",
        "Your verification code.",
        "Enter this code to confirm it's you:",
        None,
        "Your BACH Wears verification code.",
        "Didn't request a code? Change your password from your account.",
    ),
    "password_changed_notification": (
        "Security",
        "Your password was changed.",
        'The password on your BACH Wears account <strong style="color:%s;font-weight:600;">{{ .Email }}</strong> '
        "was just changed. If that was you, there's nothing else to do." % INK,
        "Reset your password",
        "The password on your BACH Wears account was changed.",
        "Wasn't you? Reset your password right away, then write to care@bachwears.com "
        "or WhatsApp +961 71 566 296 so we can secure your account.",
    ),
}


def page(subject, eyebrow, title, body, button, preheader, ignore, url=None):
    if button and url:
        action = f"""
          <tr><td style="padding:32px 40px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td bgcolor="{INK}" style="background:{INK};">
                <a href="{url}" target="_blank"
                   style="display:inline-block;padding:16px 34px;font-family:{FONT};font-size:14px;font-weight:600;letter-spacing:0.04em;color:#ffffff;text-decoration:none;">{button}</a>
              </td>
            </tr></table>
          </td></tr>"""
    elif button:
        action = f"""
          <tr><td style="padding:32px 40px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td bgcolor="{INK}" style="background:{INK};">
                <a href="{{{{ .ConfirmationURL }}}}" target="_blank"
                   style="display:inline-block;padding:16px 34px;font-family:{FONT};font-size:14px;font-weight:600;letter-spacing:0.04em;color:#ffffff;text-decoration:none;">{button}</a>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:28px 40px 0;font-family:{FONT};font-size:12px;line-height:1.6;color:{MUTED};">
            The link expires in 1 hour. If the button doesn't work, paste this address into your browser:<br>
            <a href="{{{{ .ConfirmationURL }}}}" target="_blank" style="color:{MUTED};word-break:break-all;">{{{{ .ConfirmationURL }}}}</a>
          </td></tr>"""
    else:
        action = f"""
          <tr><td style="padding:24px 40px 0;">
            <div style="display:inline-block;padding:16px 24px;border:1px solid {RULE};font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:30px;font-weight:600;letter-spacing:0.3em;color:{INK};">{{{{ .Token }}}}</div>
          </td></tr>
          <tr><td style="padding:20px 40px 0;font-family:{FONT};font-size:12px;line-height:1.6;color:{MUTED};">The code expires in 1 hour.</td></tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:{PAPER};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{PAPER}" style="background:{PAPER};">
  <tr><td align="center" style="padding:40px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:560px;background:#ffffff;">
      <tr><td bgcolor="#ffffff" style="padding:40px 40px 0;background:#ffffff;">
        <a href="https://bachwears.com" target="_blank" style="text-decoration:none;">
          <img src="{LOGO}" width="104" height="21" alt="BACH" style="display:block;border:0;outline:none;width:104px;height:21px;font-family:{FONT};font-size:20px;font-weight:700;letter-spacing:0.1em;color:{INK};">
        </a>
      </td></tr>
      <tr><td style="padding:44px 40px 0;font-family:{FONT};">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:{MUTED};">{eyebrow}</p>
        <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-0.01em;color:{INK};">{title}</h1>
        <p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:{BODY};">{body}</p>
      </td></tr>{action}
      <tr><td style="padding:24px 40px 0;font-family:{FONT};font-size:12px;line-height:1.6;color:{MUTED};">{ignore}</td></tr>
      <tr><td style="padding:40px 40px 0;"><div style="height:1px;line-height:1px;font-size:1px;background:{RULE};">&nbsp;</div></td></tr>
      <tr><td style="padding:24px 40px 40px;font-family:{FONT};font-size:12px;line-height:1.7;color:{MUTED};">
        <span style="color:{INK};font-weight:600;letter-spacing:0.08em;">BACH WEARS</span> &nbsp;·&nbsp; Menswear, Lebanon<br>
        <a href="https://bachwears.com" target="_blank" style="color:{MUTED};text-decoration:none;white-space:nowrap;">bachwears.com</a>
        &nbsp;·&nbsp; <a href="mailto:care@bachwears.com" style="color:{MUTED};text-decoration:none;white-space:nowrap;">care@bachwears.com</a>
        &nbsp;·&nbsp; <a href="https://wa.me/96171566296" target="_blank" style="color:{MUTED};text-decoration:none;white-space:nowrap;">+961&nbsp;71&nbsp;566&nbsp;296</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""


if __name__ == "__main__":
    for kind, parts in CONTENT.items():
        (HERE / f"{kind}.html").write_text(page(SUBJECTS[kind], *parts, url=NOTICE_URLS.get(kind)))
    print("rendered:", ", ".join(CONTENT))

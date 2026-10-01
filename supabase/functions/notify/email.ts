// Branded HTML for notification emails — the same layout as the Auth emails
// in supabase/templates/auth (CLAUDE.md §10). The template body stays plain
// text (editable in MGMT, also sent as the text/plain part); this wraps it
// with a per-event headline, order details, a call to action and the footer.
// Pure TS, no Deno APIs, so it can be previewed with plain `node`.

type Payload = Record<string, unknown>;
type Lang = "en" | "ar";

const SITE = "https://bachwears.com";
// served from the storage CDN: mail image proxies fetch it reliably (the site host can rate-limit them)
const LOGO = "https://hrosyuaehkhzhnvefhts.supabase.co/storage/v1/object/public/product-media/site/email-logo.png";
const INK = "#111111";
const BODY = "#45423e";
const MUTED = "#86817a";
const PAPER = "#f4f2ee";
const RULE = "#e6e2dc";
const FONT_EN = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const FONT_AR = "Tahoma,'Segoe UI',Arial,sans-serif";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const firstName = (p: Payload) => String(p.customer_name ?? "").trim().split(/\s+/)[0] ?? "";
const track = (p: Payload) => `${SITE}/track?n=${encodeURIComponent(String(p.order_number ?? ""))}`;

interface EventDesign {
  eyebrow: (p: Payload, lang: Lang) => string;
  title: (p: Payload, lang: Lang) => string;
  details?: (p: Payload) => Array<[string, string]>;
  code?: (p: Payload) => { code: string; note: string };
  cta?: (p: Payload, lang: Lang) => { label: string; url: string };
}

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  whish: "Whish",
  stripe: "Card",
  cash: "Cash",
};
const paymentLabel = (p: Payload) => PAYMENT_LABEL[String(p.payment ?? "cod")] ?? "Cash on delivery";
const isCod = (p: Payload) => String(p.payment ?? "cod") === "cod";

const EVENTS: Record<string, EventDesign> = {
  online_order_placed: {
    eyebrow: (p) => `Order #${p.order_number}`,
    title: (p) => (firstName(p) ? `Thank you, ${firstName(p)}.` : "Thank you for your order."),
    details: (p) => [
      ["Order", `#${p.order_number}`],
      ["Total", p.total_lbp ? `${p.total_usd}  ·  ≈ ${p.total_lbp} LBP` : String(p.total_usd ?? "")],
      ["Payment", paymentLabel(p)],
      ...(p.city ? ([["Delivery to", String(p.city)]] as Array<[string, string]>) : []),
    ],
    cta: (p) => ({ label: "Track your order", url: track(p) }),
  },
  order_shipped: {
    eyebrow: (p) => `Order #${p.order_number}`,
    title: () => "Your order is on its way.",
    details: (p) => [
      ["Order", `#${p.order_number}`],
      // only cash-on-delivery orders have anything to pay at the door
      isCod(p) ? ["Due on delivery", String(p.total_usd ?? "")] : ["Payment", `${paymentLabel(p)} — paid`],
    ],
    cta: (p) => ({ label: "Track your order", url: track(p) }),
  },
  order_delivered: {
    eyebrow: (p) => `Order #${p.order_number}`,
    title: (p) => (firstName(p) ? `Delivered — enjoy it, ${firstName(p)}.` : "Your order has arrived."),
    details: (p) => [
      ["Order", `#${p.order_number}`],
      ["Need anything?", String(p.care_phone ?? "+961 71 566 296")],
    ],
    cta: (p) => ({ label: "View your order", url: track(p) }),
  },
  order_cancelled: {
    eyebrow: (p) => `Order #${p.order_number}`,
    title: () => "Your order was cancelled.",
    details: (p) => [
      ["Order", `#${p.order_number}`],
      ["Questions?", String(p.care_phone ?? "+961 71 566 296")],
    ],
    cta: () => ({ label: "Continue shopping", url: `${SITE}/shop` }),
  },
  return_requested: {
    eyebrow: (p) => `Order #${p.order_number}`,
    title: () => "Request received.",
    cta: (p) => ({ label: "View your order", url: track(p) }),
  },
  back_in_stock: {
    eyebrow: () => "Back in stock",
    title: (p) => `${p.product} is back.`,
    details: (p) => [
      ["Size", String(p.size ?? "")],
      ["Colour", String(p.color ?? "")],
    ],
    cta: (p) => ({ label: "Shop now", url: String(p.link ?? `${SITE}/shop`) }),
  },
  birthday_today: {
    eyebrow: () => "Happy birthday",
    title: (p) => (firstName(p) ? `Happy birthday, ${firstName(p)}.` : "Happy birthday."),
    code: (p) => ({ code: String(p.code ?? ""), note: `${p.percent}% off everything — valid for a few days around your day.` }),
    cta: () => ({ label: "Shop the collection", url: `${SITE}/shop` }),
  },
  newsletter_welcome: {
    eyebrow: (_p, lang) => (lang === "ar" ? "النشرة الإخبارية" : "Newsletter"),
    title: (_p, lang) => (lang === "ar" ? "صرت عاللائحة." : "You're on the list."),
    cta: (_p, lang) => ({ label: lang === "ar" ? "اكتشف التشكيلة" : "Explore the collection", url: `${SITE}/shop` }),
  },
};

/** Plain template text → safe HTML: drop the "— BACH Wears" sign-off (the footer carries it), link URLs, keep line breaks. */
function bodyHtml(text: string): string {
  return esc(text.replace(/\s*[—–-]\s*BACH Wears\s*$/u, "").trim())
    .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="color:${INK};">${u.replace(/^https?:\/\//, "")}</a>`)
    .replace(/\n/g, "<br>");
}

export function renderEmailHtml(event: string, lang: string, subject: string, text: string, p: Payload): string {
  const l: Lang = lang === "ar" ? "ar" : "en";
  const rtl = l === "ar";
  const font = rtl ? FONT_AR : FONT_EN;
  const align = rtl ? "right" : "left";
  const d: EventDesign = EVENTS[event] ?? { eyebrow: () => "BACH Wears", title: () => subject };

  const details = d.details?.(p).filter(([, v]) => v.trim()) ?? [];
  const detailsHtml = details.length
    ? `
      <tr><td style="padding:28px 40px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${RULE};">
          ${details
            .map(
              ([k, v]) => `<tr>
            <td style="padding:12px 0;border-bottom:1px solid ${RULE};font-family:${font};font-size:13px;color:${MUTED};text-align:${align};">${esc(k)}</td>
            <td style="padding:12px 0;border-bottom:1px solid ${RULE};font-family:${font};font-size:13px;color:${INK};font-weight:600;text-align:${rtl ? "left" : "right"};" dir="ltr">${esc(v)}</td>
          </tr>`,
            )
            .join("")}
        </table>
      </td></tr>`
    : "";

  const code = d.code?.(p);
  const codeHtml = code?.code
    ? `
      <tr><td style="padding:28px 40px 0;text-align:${align};">
        <div style="display:inline-block;padding:16px 24px;border:1px solid ${RULE};font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:24px;font-weight:600;letter-spacing:0.2em;color:${INK};" dir="ltr">${esc(code.code)}</div>
        <p style="margin:12px 0 0;font-family:${font};font-size:13px;line-height:1.6;color:${BODY};">${esc(code.note)}</p>
      </td></tr>`
    : "";

  const cta = d.cta?.(p, l);
  const ctaHtml = cta
    ? `
      <tr><td style="padding:32px 40px 0;" align="${align}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td bgcolor="${INK}" style="background:${INK};">
            <a href="${esc(cta.url)}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${font};font-size:14px;font-weight:600;letter-spacing:${rtl ? "0" : "0.04em"};color:#ffffff;text-decoration:none;">${esc(cta.label)}</a>
          </td>
        </tr></table>
      </td></tr>`
    : "";

  const unsubscribe =
    event === "newsletter_welcome"
      ? `<br><a href="${SITE}/newsletter/unsubscribe" style="color:${MUTED};">${rtl ? "إلغاء الاشتراك" : "Unsubscribe"}</a>`
      : "";

  return `<!DOCTYPE html>
<html lang="${l}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(text.replace(/\s*[—–-]\s*BACH Wears\s*$/u, "")).slice(0, 140)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="background:${PAPER};">
  <tr><td align="center" style="padding:40px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:560px;background:#ffffff;" dir="${rtl ? "rtl" : "ltr"}">
      <tr><td bgcolor="#ffffff" style="padding:40px 40px 0;background:#ffffff;text-align:${align};">
        <a href="${SITE}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${LOGO}" width="104" height="21" alt="BACH" style="display:block;border:0;outline:none;width:104px;height:21px;font-family:${FONT_EN};font-size:20px;font-weight:700;letter-spacing:0.1em;color:${INK};">
        </a>
      </td></tr>
      <tr><td style="padding:44px 40px 0;font-family:${font};text-align:${align};">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:${rtl ? "0" : "0.25em"};text-transform:uppercase;color:${MUTED};">${esc(d.eyebrow(p, l))}</p>
        <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:600;letter-spacing:${rtl ? "0" : "-0.01em"};color:${INK};">${esc(d.title(p, l))}</h1>
        <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:${BODY};">${bodyHtml(text)}</p>
      </td></tr>${detailsHtml}${codeHtml}${ctaHtml}
      <tr><td style="padding:40px 40px 0;"><div style="height:1px;line-height:1px;font-size:1px;background:${RULE};">&nbsp;</div></td></tr>
      <tr><td style="padding:24px 40px 40px;font-family:${FONT_EN};font-size:12px;line-height:1.7;color:${MUTED};text-align:${align};" dir="ltr">
        <span style="color:${INK};font-weight:600;letter-spacing:0.08em;">BACH WEARS</span> &nbsp;·&nbsp; Menswear, Lebanon<br>
        <a href="${SITE}" target="_blank" style="color:${MUTED};text-decoration:none;white-space:nowrap;">bachwears.com</a>
        &nbsp;·&nbsp; <a href="mailto:care@bachwears.com" style="color:${MUTED};text-decoration:none;white-space:nowrap;">care@bachwears.com</a>
        &nbsp;·&nbsp; <a href="https://wa.me/96171566296" target="_blank" style="color:${MUTED};text-decoration:none;white-space:nowrap;">+961&nbsp;71&nbsp;566&nbsp;296</a>${unsubscribe}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
`;
}

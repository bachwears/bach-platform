// Notification sender (§10). Drains queued notification_log rows, renders
// the template for (event, channel, lang), and delivers via:
//   - WhatsApp: Twilio (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM)
//   - Email:    Resend (RESEND_API_KEY, EMAIL_FROM)
// Recipient "shop" routes to NOTIFY_WHATSAPP_TO (the founder's number until
// the official Meta-verified number lands — swapping is a secrets change).
// Missing secrets → rows are marked 'skipped', never lost.
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SHOP_WHATSAPP = Deno.env.get("NOTIFY_WHATSAPP_TO") ?? "+96171566296";

function render(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(payload[k] ?? ""));
}

async function sendWhatsapp(to: string, body: string): Promise<"sent" | "skipped"> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_WHATSAPP_FROM");
  if (!sid || !token || !from) return "skipped";
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${from}`,
      To: `whatsapp:${to}`,
      Body: body,
    }),
  });
  if (!res.ok) throw new Error(`twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return "sent";
}

async function sendEmail(to: string, subject: string, body: string): Promise<"sent" | "skipped"> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "BACH Wears <noreply@bachwears.com>";
  if (!key) return "skipped";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text: body }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return "sent";
}

Deno.serve(async () => {
  const { data: rows } = await supabase
    .from("notification_log")
    .select("id, event, channel, recipient, lang, payload")
    .eq("status", "queued")
    .order("created_at")
    .limit(25);

  let sent = 0, skipped = 0, failed = 0;
  for (const row of rows ?? []) {
    try {
      const { data: tpl } = await supabase
        .from("notification_templates")
        .select("subject, body, is_enabled")
        .eq("event", row.event)
        .eq("channel", row.channel)
        .eq("lang", row.lang)
        .maybeSingle();
      if (!tpl || !tpl.is_enabled) {
        await supabase.from("notification_log").update({ status: "skipped", error: "no enabled template" }).eq("id", row.id);
        skipped++;
        continue;
      }
      const body = render(tpl.body, row.payload);
      let result: "sent" | "skipped";
      if (row.channel === "whatsapp") {
        const to = row.recipient === "shop" ? SHOP_WHATSAPP : row.recipient;
        result = await sendWhatsapp(to, body);
      } else {
        result = await sendEmail(row.recipient, render(tpl.subject ?? "BACH Wears", row.payload), body);
      }
      await supabase
        .from("notification_log")
        .update({ status: result, sent_at: result === "sent" ? new Date().toISOString() : null, error: result === "skipped" ? "provider not configured" : null })
        .eq("id", row.id);
      result === "sent" ? sent++ : skipped++;
    } catch (e) {
      await supabase
        .from("notification_log")
        .update({ status: "failed", error: String(e).slice(0, 400) })
        .eq("id", row.id);
      failed++;
    }
  }
  return Response.json({ processed: (rows ?? []).length, sent, skipped, failed });
});

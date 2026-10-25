// MGMT → الأخطاء: labels and small helpers shared by the list and the detail page.

export const APP_LABEL: Record<string, string> = {
  storefront: "الموقع",
  pos: "الـPOS",
  mgmt: "الإدارة",
  server: "السيرفر",
  db: "الداتابيز",
};

export const KIND_LABEL: Record<string, string> = {
  client: "خطأ بالصفحة",
  unhandled: "خطأ بالصفحة",
  boundary: "الصفحة وقعت",
  server: "خطأ بالسيرفر",
  db: "عملية فشلت",
};

export const STATUS_LABEL: Record<string, string> = { open: "مفتوح", resolved: "انحلّ", ignored: "متجاهَل" };

/** "iPhone · Instagram" — enough to tell where it happened, not a fingerprint. */
export function deviceOf(ua: string | null | undefined): string {
  if (!ua) return "—";
  // reported by the web server itself while it built the page
  if (/^node|undici/i.test(ua)) return "السيرفر";
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "جهاز";
  const browser = /Instagram/.test(ua)
    ? "Instagram"
    : /FBAN|FBAV|FB_IAB/.test(ua)
      ? "Facebook"
      : /WhatsApp/.test(ua)
        ? "WhatsApp"
        : /Edg\//.test(ua)
          ? "Edge"
          : /CriOS|Chrome\//.test(ua)
            ? "Chrome"
            : /Firefox|FxiOS/.test(ua)
              ? "Firefox"
              : /Safari\//.test(ua)
                ? "Safari"
                : "متصفح";
  return `${device} · ${browser}`;
}

/** "3 د" / "5 س" / "2 ي" since an instant. */
export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "هلّق";
  if (s < 3600) return `${Math.floor(s / 60)} د`;
  if (s < 86400) return `${Math.floor(s / 3600)} س`;
  return `${Math.floor(s / 86400)} ي`;
}

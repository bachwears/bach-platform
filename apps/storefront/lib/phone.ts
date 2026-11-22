/**
 * Is this a Lebanese phone number? +961 / 00961 / 961… with the international
 * prefix, or a local 7–8 digit number (03 123 456, 71 566 296, 01 234 567).
 * Anything else — another country code, or a longer local number such as a
 * Gulf 05… mobile — is from abroad. Used while delivery is Lebanon-only.
 */
export function isLebanesePhone(raw: string): boolean {
  const s = raw.trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) return digits.startsWith("961");
  if (digits.startsWith("00")) return digits.startsWith("00961");
  if (digits.startsWith("961") && digits.length >= 10) return true;
  return digits.length >= 7 && digits.length <= 8;
}

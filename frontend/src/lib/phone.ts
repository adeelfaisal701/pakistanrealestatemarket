export function normalizeInternationalPhone(phone: string): string | undefined {
  let digits = phone.replace(/\D/g, "");
  const internationalPrefix = phone.trim().startsWith("+");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = `92${digits.slice(1)}`;
  } else if (!internationalPrefix && !digits.startsWith("92") && digits.length === 10) {
    digits = `92${digits}`;
  }

  return /^[1-9]\d{6,14}$/.test(digits) ? digits : undefined;
}

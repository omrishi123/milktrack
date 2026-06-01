import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a YYYY-MM-DD string into DD/MM/YYYY for UI display.
 */
export function formatDate(dateStr: string) {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Sanitizes a phone number to strict E.164 format (+91XXXXXXXXXX for India).
 * This is CRITICAL for matching Owner entries with Customer logins.
 */
export function sanitizePhoneNumber(phone: string, defaultCountryCode = "+91"): string {
  if (!phone) return "";
  
  // Remove all non-numeric characters except the leading '+'
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // Handle double zero '00' prefix
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  
  // Handle single '0' prefix (common in India)
  if (cleaned.startsWith("0") && !cleaned.startsWith("00")) {
    cleaned = cleaned.slice(1);
  }
  
  // If it doesn't have an international '+' prefix, prepend default (India +91)
  if (!cleaned.startsWith("+")) {
    // If user typed 10 digits, add +91
    if (cleaned.length === 10) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    } else {
      // If they typed something else, just add the +
      cleaned = `+${cleaned}`;
    }
  }
  
  return cleaned;
}

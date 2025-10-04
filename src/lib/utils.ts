
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Ugandan phone numbers (256XXXXXXXXX or 0XXXXXXXXX)
  if (cleaned.startsWith('256') && cleaned.length === 12) {
    // Format: +256 XXX XXX XXX
    return `+256 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Format: 0XXX XXX XXX
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  // Return cleaned number for other formats
  return cleaned;
}

export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Convert to string first
  let phoneStr = String(phone);
  
  // Handle scientific notation without losing precision
  if (phoneStr.includes('E') || phoneStr.includes('e')) {
    // Parse scientific notation manually to preserve all digits
    const [mantissa, exponent] = phoneStr.toUpperCase().split('E');
    const exp = parseInt(exponent, 10);
    const [intPart, decPart = ''] = mantissa.split('.');
    
    // Reconstruct the number as a string
    if (exp >= 0) {
      const zerosNeeded = exp - decPart.length;
      phoneStr = intPart + decPart + '0'.repeat(Math.max(0, zerosNeeded));
    } else {
      phoneStr = '0.' + '0'.repeat(Math.abs(exp) - 1) + intPart + decPart;
    }
  }
  
  // Remove all non-digit characters
  const cleaned = phoneStr.replace(/\D/g, '');
  
  // Normalize to 0XXXXXXXXX format for Uganda
  if (cleaned.startsWith('256') && cleaned.length === 12) {
    return '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    return cleaned;
  } else if (cleaned.length === 9) {
    // Missing leading 0
    return '0' + cleaned;
  }
  
  return cleaned;
}

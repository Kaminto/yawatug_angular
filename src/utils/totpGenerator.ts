// Utility for generating TOTP codes - DEMO/TESTING PURPOSES ONLY
// In production, users should only use Google Authenticator app

import { authenticator } from 'otplib';

export const generateTOTPCode = (secret: string): string => {
  try {
    return authenticator.generate(secret);
  } catch (error) {
    console.error('Error generating TOTP code:', error);
    return '';
  }
};

export const verifyTOTPCode = (token: string, secret: string): boolean => {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('Error verifying TOTP code:', error);
    return false;
  }
};

export const generateQRCodeUrl = (email: string, secret: string, issuer: string = 'Yawatu'): string => {
  const label = `${issuer}:${email}`;
  const otpauth = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
};

export const generateSecretKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
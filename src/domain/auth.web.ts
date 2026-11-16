import * as Crypto from 'expo-crypto';

import { setSetting } from '@/src/db/queries';

const ACCOUNT_EMAIL_KEY = 'wifeapp_auth_email';
const ACCOUNT_HASH_KEY = 'wifeapp_auth_password_hash';

export type AuthMode = 'none' | 'guest' | 'account';

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `wifeapp-auth:${password}`
  );
}

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  globalThis.localStorage?.setItem(key, value);
}

export async function hasLocalAccount(): Promise<boolean> {
  return Boolean(read(ACCOUNT_EMAIL_KEY) && read(ACCOUNT_HASH_KEY));
}

export async function getLocalAccountEmail(): Promise<string | null> {
  return read(ACCOUNT_EMAIL_KEY);
}

export async function registerLocalAccount(
  email: string,
  password: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Escribe un correo válido.');
  }
  if (password.trim().length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
  const hash = await hashPassword(password.trim());
  write(ACCOUNT_EMAIL_KEY, normalized);
  write(ACCOUNT_HASH_KEY, hash);
  await setSetting('authMode', 'account');
  await setSetting('authEmail', normalized);
}

export async function loginLocalAccount(
  email: string,
  password: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const storedEmail = read(ACCOUNT_EMAIL_KEY);
  const storedHash = read(ACCOUNT_HASH_KEY);
  if (!storedEmail || !storedHash) {
    throw new Error('No hay una cuenta guardada. Crea una primero.');
  }
  if (storedEmail !== normalized) {
    throw new Error('Correo o contraseña incorrectos.');
  }
  const hash = await hashPassword(password.trim());
  if (hash !== storedHash) {
    throw new Error('Correo o contraseña incorrectos.');
  }
  await setSetting('authMode', 'account');
  await setSetting('authEmail', normalized);
}

export async function continueAsGuest(): Promise<void> {
  await setSetting('authMode', 'guest');
  await setSetting('authEmail', '');
}

export async function clearAuthSession(): Promise<void> {
  await setSetting('authMode', 'none');
  await setSetting('authEmail', '');
}

export function parseAuthMode(value: string | null | undefined): AuthMode {
  if (value === 'guest' || value === 'account') return value;
  return 'none';
}

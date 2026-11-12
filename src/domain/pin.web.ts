import * as Crypto from 'expo-crypto';

import { setSetting } from '@/src/db/queries';

const PIN_KEY = 'wifeapp_emergency_pin_hash';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `wifeapp:${pin}`
  );
}

function readSecret(): string | null {
  try {
    return globalThis.localStorage?.getItem(PIN_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeSecret(value: string) {
  globalThis.localStorage?.setItem(PIN_KEY, value);
}

function deleteSecret() {
  globalThis.localStorage?.removeItem(PIN_KEY);
}

export async function isPinSet(): Promise<boolean> {
  return Boolean(readSecret());
}

export async function setEmergencyPin(pin: string): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('El código debe tener entre 4 y 6 dígitos');
  }
  writeSecret(await hashPin(pin));
  await setSetting('emergencyPinSet', '1');
}

export async function verifyEmergencyPin(pin: string): Promise<boolean> {
  const stored = readSecret();
  if (!stored) return false;
  return stored === (await hashPin(pin));
}

export async function clearEmergencyPin(): Promise<void> {
  deleteSecret();
  await setSetting('emergencyPinSet', '0');
}

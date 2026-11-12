import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { setSetting } from '@/src/db/queries';

const PIN_KEY = 'wifeapp_emergency_pin_hash';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `wifeapp:${pin}`
  );
}

export async function isPinSet(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(PIN_KEY);
    return Boolean(value);
  } catch {
    return false;
  }
}

export async function setEmergencyPin(pin: string): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('El código debe tener entre 4 y 6 dígitos');
  }
  const hash = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_KEY, hash);
  await setSetting('emergencyPinSet', '1');
}

export async function verifyEmergencyPin(pin: string): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    if (!stored) return false;
    return stored === (await hashPin(pin));
  } catch {
    return false;
  }
}

export async function clearEmergencyPin(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PIN_KEY);
  } catch {
    // ignore
  }
  await setSetting('emergencyPinSet', '0');
}

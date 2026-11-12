import { Platform } from 'react-native';

import AppGateModule from './src/AppGateModule';

export type GatePermissions = {
  accessibilityEnabled: boolean;
  overlayAllowed: boolean;
};

export type InstalledApp = {
  label: string;
  androidPackage: string;
};

export type LastDetected = {
  packageName: string | null;
  at: number;
};

const noopPermissions: GatePermissions = {
  accessibilityEnabled: false,
  overlayAllowed: false,
};

export async function syncWatchedAppsToNative(packages: string[]): Promise<void> {
  if (Platform.OS !== 'android' || !AppGateModule) return;
  await AppGateModule.setWatchedPackages(packages);
}

export async function getNativeWatchedPackages(): Promise<string[]> {
  if (Platform.OS !== 'android' || !AppGateModule) return [];
  return AppGateModule.getWatchedPackages();
}

export async function getGatePermissions(): Promise<GatePermissions> {
  if (Platform.OS !== 'android' || !AppGateModule) return noopPermissions;
  return AppGateModule.getPermissions();
}

export async function openAccessibilitySettings(): Promise<void> {
  if (Platform.OS !== 'android' || !AppGateModule) return;
  await AppGateModule.openAccessibilitySettings();
}

export async function openOverlaySettings(): Promise<void> {
  if (Platform.OS !== 'android' || !AppGateModule) return;
  await AppGateModule.openOverlaySettings();
}

export async function grantAccess(packageName: string, graceSeconds = 120): Promise<void> {
  if (Platform.OS !== 'android' || !AppGateModule) return;
  await AppGateModule.grantAccess(packageName, graceSeconds);
}

export async function denyAndGoHome(): Promise<void> {
  if (Platform.OS !== 'android' || !AppGateModule) return;
  await AppGateModule.denyAndGoHome();
}

export async function getPendingGatePackage(): Promise<string | null> {
  if (Platform.OS !== 'android' || !AppGateModule) return null;
  return AppGateModule.getPendingPackage();
}

export async function clearPendingGatePackage(): Promise<void> {
  if (Platform.OS !== 'android' || !AppGateModule) return;
  await AppGateModule.clearPendingPackage();
}

export async function getLastDetectedPackage(): Promise<LastDetected> {
  if (Platform.OS !== 'android' || !AppGateModule) {
    return { packageName: null, at: 0 };
  }
  const raw = await AppGateModule.getLastDetectedPackage();
  return {
    packageName: (raw?.packageName as string | null) ?? null,
    at: Number(raw?.at ?? 0),
  };
}

export async function listInstalledApps(): Promise<InstalledApp[]> {
  if (Platform.OS !== 'android' || !AppGateModule) return [];
  return AppGateModule.listInstalledApps();
}

export function isAppGateAvailable(): boolean {
  return Platform.OS === 'android' && AppGateModule != null;
}

import { NativeModule, requireNativeModule } from 'expo-modules-core';

type AppGateNativeModule = NativeModule & {
  setWatchedPackages(packages: string[]): Promise<void>;
  getWatchedPackages(): Promise<string[]>;
  getPermissions(): Promise<{
    accessibilityEnabled: boolean;
    overlayAllowed: boolean;
  }>;
  openAccessibilitySettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  grantAccess(packageName: string, graceSeconds: number): Promise<void>;
  denyAndGoHome(): Promise<void>;
  getPendingPackage(): Promise<string | null>;
  clearPendingPackage(): Promise<void>;
  getLastDetectedPackage(): Promise<{ packageName?: string | null; at?: number }>;
  listInstalledApps(): Promise<Array<{ label: string; androidPackage: string }>>;
};

let nativeModule: AppGateNativeModule | null = null;

try {
  nativeModule = requireNativeModule<AppGateNativeModule>('AppGate');
} catch {
  nativeModule = null;
}

export default nativeModule;

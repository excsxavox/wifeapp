const {
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

/**
 * Overlay permission + package visibility so we can list installed launcher apps.
 */
function withAppGate(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.REORDER_TASKS',
      'android.permission.QUERY_ALL_PACKAGES',
    ]);

    // Ensure <queries> can see launcher apps (Android 11+).
    if (!manifest.manifest.queries) {
      manifest.manifest.queries = [{}];
    }
    const queries = manifest.manifest.queries[0];
    if (!queries.intent) {
      queries.intent = [];
    }

    const hasLauncherQuery = queries.intent.some((intent) => {
      const actions = intent.action ?? [];
      const categories = intent.category ?? [];
      const hasMain = actions.some(
        (a) => a.$?.['android:name'] === 'android.intent.action.MAIN'
      );
      const hasLauncher = categories.some(
        (c) => c.$?.['android:name'] === 'android.intent.category.LAUNCHER'
      );
      return hasMain && hasLauncher;
    });

    if (!hasLauncherQuery) {
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
        ],
      });
    }

    return config;
  });
}

module.exports = withAppGate;

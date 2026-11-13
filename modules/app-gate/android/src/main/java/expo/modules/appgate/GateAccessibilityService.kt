package expo.modules.appgate

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class GateAccessibilityService : AccessibilityService() {
  private var lastHandledPackage: String? = null
  private var lastHandledAt: Long = 0L
  private var lastSettleAt: Long = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    if (
      event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
      event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
    ) {
      return
    }

    val packageName = event.packageName?.toString() ?: return
    if (packageName == applicationContext.packageName) return
    if (isIgnoredSystemPackage(packageName)) return

    GateStore.setLastDetected(this, packageName)

    val session = GateStore.getSession(this)
    val sessionPackage = session?.get("packageName") as? String
    val browseOnly = session?.get("browseOnly") as? Boolean ?: false
    val needsSettle = session?.get("needsSettle") as? Boolean ?: false

    // Active visit inside a watched app.
    if (sessionPackage != null) {
      if (packageName == sessionPackage) {
        // Still inside the allowed app.
        return
      }

      // Left the watched app for another real app / launcher.
      if (browseOnly) {
        GateStore.clearSession(this)
        return
      }

      if (needsSettle) {
        // Already waiting for amount; avoid spam.
        maybeOpenSettle(sessionPackage)
        return
      }

      GateStore.markNeedsSettle(this)
      maybeOpenSettle(sessionPackage)
      return
    }

    val watched = GateStore.getWatchedPackages(this)
    if (watched.isEmpty() || !watched.contains(packageName)) return
    if (GateStore.isInGrace(this, packageName)) return

    // Debounce content-changed spam; still react quickly to window changes.
    val now = System.currentTimeMillis()
    val minGap = if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) 800L else 2500L
    if (packageName == lastHandledPackage && now - lastHandledAt < minGap) return
    lastHandledPackage = packageName
    lastHandledAt = now

    GateStore.setPendingGate(this, packageName, GateStore.MODE_INTENT)
    openGate(packageName, GateStore.MODE_INTENT)
  }

  private fun maybeOpenSettle(packageName: String) {
    val now = System.currentTimeMillis()
    if (now - lastSettleAt < 1500L) return
    lastSettleAt = now
    GateStore.setPendingGate(this, packageName, GateStore.MODE_SETTLE)
    openGate(packageName, GateStore.MODE_SETTLE)
  }

  private fun openGate(packageName: String, mode: String) {
    val gateIntent = Intent(this, GateActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
      )
      putExtra(GateActivity.EXTRA_TARGET_PACKAGE, packageName)
      putExtra(GateActivity.EXTRA_MODE, mode)
    }
    startActivity(gateIntent)
  }

  private fun isIgnoredSystemPackage(packageName: String): Boolean {
    return packageName.startsWith("com.android.") ||
      packageName == "android" ||
      packageName == "com.google.android.permissioncontroller" ||
      packageName == "com.google.android.packageinstaller" ||
      packageName == "com.google.android.systemui" ||
      packageName.startsWith("com.google.android.inputmethod") ||
      packageName.startsWith("com.samsung.android.app.telephonyui") ||
      packageName.startsWith("com.miui.securitycenter")
  }

  override fun onInterrupt() {}
}

package expo.modules.appgate

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class GateAccessibilityService : AccessibilityService() {
  private var lastHandledPackage: String? = null
  private var lastHandledAt: Long = 0L

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
    if (
      packageName.startsWith("com.android.") ||
      packageName == "android" ||
      packageName == "com.google.android.permissioncontroller" ||
      packageName == "com.google.android.packageinstaller"
    ) {
      return
    }

    GateStore.setLastDetected(this, packageName)

    val watched = GateStore.getWatchedPackages(this)
    if (watched.isEmpty() || !watched.contains(packageName)) return
    if (GateStore.isInGrace(this, packageName)) return

    // Debounce content-changed spam; still react quickly to window changes.
    val now = System.currentTimeMillis()
    val minGap = if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) 800L else 2500L
    if (packageName == lastHandledPackage && now - lastHandledAt < minGap) return
    lastHandledPackage = packageName
    lastHandledAt = now

    GateStore.setPendingPackage(this, packageName)

    val gateIntent = Intent(this, GateActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
      )
      putExtra(GateActivity.EXTRA_TARGET_PACKAGE, packageName)
    }
    startActivity(gateIntent)
  }

  override fun onInterrupt() {}
}

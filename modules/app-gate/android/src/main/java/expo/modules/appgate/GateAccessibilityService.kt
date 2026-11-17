package expo.modules.appgate

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Detecta apps vigiladas y abre el portero.
 * Cualquier excepción no controlada hace que Android desactive Accesibilidad
 * ("This service isn't working properly" / "El servicio no funciona correctamente").
 */
class GateAccessibilityService : AccessibilityService() {
  private var lastHandledPackage: String? = null
  private var lastHandledAt: Long = 0L
  private var lastSettleAt: Long = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    Log.i(TAG, "Gate accessibility service connected")
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    try {
      handleEvent(event)
    } catch (error: Exception) {
      // Nunca dejar que un fallo tumbe el servicio: Android lo desactiva.
      Log.e(TAG, "Unhandled gate event error", error)
    }
  }

  private fun handleEvent(event: AccessibilityEvent?) {
    if (event == null) return
    // Solo cambios de ventana: CONTENT_CHANGED genera tormentas y ANRs.
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
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

    if (sessionPackage != null) {
      if (packageName == sessionPackage) {
        return
      }

      if (browseOnly) {
        GateStore.clearSession(this)
        return
      }

      if (needsSettle) {
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

    val now = System.currentTimeMillis()
    if (packageName == lastHandledPackage && now - lastHandledAt < 1200L) return
    lastHandledPackage = packageName
    lastHandledAt = now

    GateStore.setPendingGate(this, packageName, GateStore.MODE_INTENT)
    openGate(packageName, GateStore.MODE_INTENT)
  }

  private fun maybeOpenSettle(packageName: String) {
    val now = System.currentTimeMillis()
    if (now - lastSettleAt < 2000L) return
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
    try {
      startActivity(gateIntent)
    } catch (error: Exception) {
      Log.e(TAG, "Failed to open gate for $packageName ($mode)", error)
    }
  }

  private fun isIgnoredSystemPackage(packageName: String): Boolean {
    return packageName.startsWith("com.android.") ||
      packageName == "android" ||
      packageName == "com.google.android.permissioncontroller" ||
      packageName == "com.google.android.packageinstaller" ||
      packageName == "com.google.android.systemui" ||
      packageName.startsWith("com.google.android.apps.nexuslauncher") ||
      packageName.startsWith("com.google.android.inputmethod") ||
      packageName.startsWith("com.samsung.android.app.telephonyui") ||
      packageName.startsWith("com.samsung.android.honeyboard") ||
      packageName.startsWith("com.miui.securitycenter") ||
      packageName.startsWith("com.miui.home") ||
      packageName.startsWith("com.huawei.android.launcher") ||
      packageName.startsWith("com.oppo.launcher") ||
      packageName.startsWith("com.android.systemui")
  }

  override fun onInterrupt() {}

  companion object {
    private const val TAG = "WifeAppGate"
  }
}

package expo.modules.appgate

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.inputmethod.InputMethodManager

/**
 * Watches which app is in front and drives the floating companion bubble.
 *
 * Work is posted off [onAccessibilityEvent]. Doing window changes or disk
 * writes inside that callback is what makes Android report the service as
 * "not working" and switch it off after the first bubble.
 */
class GateAccessibilityService : AccessibilityService() {
  private var overlay: GateOverlay? = null
  private val ui = Handler(Looper.getMainLooper())
  private var imePackages: Set<String> = emptySet()
  private var imeLoadedAt = 0L
  private var lastPackage: String? = null
  private var queuedPackage: String? = null
  private var queuedWindow = false

  private val drain = Runnable {
    val packageName = queuedPackage ?: return@Runnable
    val isWindowChange = queuedWindow
    queuedPackage = null
    queuedWindow = false
    try {
      handlePackage(packageName, isWindowChange)
    } catch (_: Exception) {
      // A thrown event used to kill the service. Android then shows
      // "no funciona correctamente" and disables accessibility.
    }
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    try {
      val info = serviceInfo
      if (info != null) {
        info.eventTypes =
          AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.notificationTimeout = 200
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        serviceInfo = info
      }
    } catch (_: Exception) {
    }
    try {
      overlay = GateOverlay(this)
    } catch (_: Exception) {
      overlay = null
    }
  }

  override fun onDestroy() {
    ui.removeCallbacks(drain)
    try {
      overlay?.hide()
    } catch (_: Exception) {
    }
    overlay = null
    super.onDestroy()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    try {
      if (event == null) return
      val isWindow = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
      if (!isWindow && event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) return

      val packageName = event.packageName?.toString() ?: return
      // Content events fire dozens of times a second. Only a new package matters.
      if (!isWindow && packageName == lastPackage) return
      lastPackage = packageName

      val bubble = overlay
      if (bubble != null && SystemClock.uptimeMillis() < bubble.ignoreEventsUntil) return
      if (isTransient(packageName) || isKeyboard(packageName)) return

      val previous = queuedPackage
      queuedPackage = packageName
      queuedWindow = if (previous != null && previous != packageName) {
        isWindow
      } else {
        queuedWindow || isWindow
      }
      ui.removeCallbacks(drain)
      ui.postDelayed(drain, 80)
    } catch (_: Exception) {
    }
  }

  private fun handlePackage(packageName: String, isWindowChange: Boolean) {
    val bubble = overlay ?: GateOverlay(this).also { overlay = it }
    if (SystemClock.uptimeMillis() < bubble.ignoreEventsUntil) return

    if (packageName == applicationContext.packageName) {
      // While the bubble is up, window events from our own package are the
      // overlay itself. Only a real return to WifeApp (bubble hidden) ends
      // the visit, so the pending card can show.
      if (!bubble.isShowing && isWindowChange) finishSession(bubble, showBubble = false)
      return
    }

    GateStore.setLastDetected(this, packageName)
    val session = GateStore.getSession(this)
    val sessionPackage = session?.get("packageName") as? String

    if (sessionPackage != null && packageName != sessionPackage) {
      if (!isWindowChange) return
      finishSession(bubble, showBubble = true)
    }

    val watched = GateStore.getWatchedPackages(this)
    if (watched.contains(packageName) && !GateStore.isInGrace(this, packageName)) {
      if (sessionPackage != packageName) onEnterWatched(bubble, packageName)
      return
    }

    if (isWindowChange) maybeRemind(bubble)
  }

  private fun finishSession(bubble: GateOverlay, showBubble: Boolean) {
    val session = GateStore.getSession(this) ?: return
    val sessionPackage = session["packageName"] as? String ?: return
    bubble.hideIntentFor(sessionPackage)
    val browseOnly = session["browseOnly"] as? Boolean ?: false
    if (browseOnly) {
      GateStore.clearSession(this)
      return
    }
    val pendingId = GateStore.moveSessionToPending(this) ?: return
    if (showBubble) {
      bubble.showSettle(pendingId, isReminder = false)
      GateStore.setLastReminderAt(this, System.currentTimeMillis())
    }
  }

  private fun onEnterWatched(bubble: GateOverlay, packageName: String) {
    val config = GateStore.getOverlayConfig(this)
    val recent = GateStore.findRecentOpenPending(this, packageName, RESUME_WINDOW_MS)
    if (recent != null) {
      val id = recent.optString("id")
      GateStore.removePendingExpense(this, id)
      bubble.hideSettleFor(id)
      GateStore.startSession(
        this,
        packageName,
        recent.optInt("categoryId", config.defaultCategoryFor(packageName)),
        recent.optString("reason", ""),
        browseOnly = false,
        startedAt = recent.optLong("startedAt", System.currentTimeMillis())
      )
      return
    }

    GateStore.startSession(
      this,
      packageName,
      config.defaultCategoryFor(packageName),
      "",
      browseOnly = false
    )
    if (!bubble.isSettling) bubble.showIntent(packageName)
  }

  private fun maybeRemind(bubble: GateOverlay) {
    if (bubble.isShowing) return
    val item = GateStore.oldestOpenPending(this) ?: return
    val config = GateStore.getOverlayConfig(this)
    val now = System.currentTimeMillis()
    val interval = config.reminderMinutes * 60_000L
    if (now - GateStore.getLastReminderAt(this) < interval) return
    GateStore.setLastReminderAt(this, now)
    bubble.showSettle(item.optString("id"), isReminder = true)
  }

  private fun isKeyboard(packageName: String): Boolean {
    val now = System.currentTimeMillis()
    if (now - imeLoadedAt > 60_000L) {
      imeLoadedAt = now
      imePackages = try {
        val imm = getSystemService(InputMethodManager::class.java)
        imm?.enabledInputMethodList?.map { it.packageName }?.toSet() ?: emptySet()
      } catch (_: Exception) {
        emptySet()
      }
    }
    return imePackages.contains(packageName)
  }

  /** Shades, permission dialogs and the keyboard. The launcher is NOT here. */
  private fun isTransient(packageName: String): Boolean {
    return packageName == "android" ||
      packageName == "com.android.systemui" ||
      packageName == "com.google.android.systemui" ||
      packageName == "com.android.permissioncontroller" ||
      packageName == "com.google.android.permissioncontroller" ||
      packageName == "com.android.packageinstaller" ||
      packageName == "com.google.android.packageinstaller" ||
      packageName.startsWith("com.google.android.inputmethod") ||
      packageName.startsWith("com.samsung.android.honeyboard") ||
      packageName.startsWith("com.samsung.android.app.telephonyui") ||
      packageName.startsWith("com.miui.securitycenter") ||
      packageName.startsWith("com.android.systemui")
  }

  override fun onInterrupt() {}

  companion object {
    private const val RESUME_WINDOW_MS = 3 * 60_000L
  }
}

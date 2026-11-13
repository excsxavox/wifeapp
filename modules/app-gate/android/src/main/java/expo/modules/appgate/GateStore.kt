package expo.modules.appgate

import android.content.Context
import android.content.SharedPreferences

object GateStore {
  private const val PREFS = "wifeapp_app_gate"
  private const val KEY_PACKAGES = "watched_packages"
  private const val KEY_PENDING = "pending_package"
  private const val KEY_PENDING_MODE = "pending_mode"
  private const val KEY_GRACE_PACKAGE = "grace_package"
  private const val KEY_GRACE_UNTIL = "grace_until"
  private const val KEY_LAST_DETECTED = "last_detected_package"
  private const val KEY_LAST_DETECTED_AT = "last_detected_at"

  private const val KEY_SESSION_PACKAGE = "session_package"
  private const val KEY_SESSION_CATEGORY_ID = "session_category_id"
  private const val KEY_SESSION_REASON = "session_reason"
  private const val KEY_SESSION_BROWSE_ONLY = "session_browse_only"
  private const val KEY_SESSION_ACTIVE = "session_active"
  private const val KEY_SESSION_NEEDS_SETTLE = "session_needs_settle"

  const val MODE_INTENT = "intent"
  const val MODE_SETTLE = "settle"

  private fun prefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  }

  fun setWatchedPackages(context: Context, packages: List<String>) {
    // Copy into a new HashSet — Android SharedPreferences StringSet bug.
    prefs(context).edit()
      .putStringSet(KEY_PACKAGES, HashSet(packages))
      .commit()
  }

  fun getWatchedPackages(context: Context): Set<String> {
    val stored = prefs(context).getStringSet(KEY_PACKAGES, emptySet()) ?: emptySet()
    return HashSet(stored)
  }

  fun setPendingGate(context: Context, packageName: String?, mode: String) {
    val editor = prefs(context).edit()
    if (packageName.isNullOrBlank()) {
      editor.remove(KEY_PENDING).remove(KEY_PENDING_MODE)
    } else {
      editor.putString(KEY_PENDING, packageName).putString(KEY_PENDING_MODE, mode)
    }
    editor.commit()
  }

  fun setPendingPackage(context: Context, packageName: String?) {
    setPendingGate(context, packageName, MODE_INTENT)
  }

  fun getPendingPackage(context: Context): String? {
    return prefs(context).getString(KEY_PENDING, null)
  }

  fun getPendingMode(context: Context): String {
    return prefs(context).getString(KEY_PENDING_MODE, MODE_INTENT) ?: MODE_INTENT
  }

  fun getPendingGate(context: Context): Map<String, Any?> {
    return mapOf(
      "packageName" to getPendingPackage(context),
      "mode" to getPendingMode(context)
    )
  }

  fun clearPendingPackage(context: Context) {
    prefs(context).edit()
      .remove(KEY_PENDING)
      .remove(KEY_PENDING_MODE)
      .commit()
  }

  fun grantAccess(context: Context, packageName: String, graceSeconds: Int) {
    val until = System.currentTimeMillis() + graceSeconds * 1000L
    prefs(context).edit()
      .putString(KEY_GRACE_PACKAGE, packageName)
      .putLong(KEY_GRACE_UNTIL, until)
      .remove(KEY_PENDING)
      .remove(KEY_PENDING_MODE)
      .commit()
  }

  fun isInGrace(context: Context, packageName: String): Boolean {
    val prefs = prefs(context)
    val gracePackage = prefs.getString(KEY_GRACE_PACKAGE, null) ?: return false
    val until = prefs.getLong(KEY_GRACE_UNTIL, 0L)
    return gracePackage == packageName && System.currentTimeMillis() < until
  }

  fun startSession(
    context: Context,
    packageName: String,
    categoryId: Int,
    reason: String,
    browseOnly: Boolean
  ) {
    prefs(context).edit()
      .putString(KEY_SESSION_PACKAGE, packageName)
      .putInt(KEY_SESSION_CATEGORY_ID, categoryId)
      .putString(KEY_SESSION_REASON, reason)
      .putBoolean(KEY_SESSION_BROWSE_ONLY, browseOnly)
      .putBoolean(KEY_SESSION_ACTIVE, true)
      .putBoolean(KEY_SESSION_NEEDS_SETTLE, false)
      .remove(KEY_PENDING)
      .remove(KEY_PENDING_MODE)
      // Generous grace while inside the watched app so we don't re-ask intent.
      .putString(KEY_GRACE_PACKAGE, packageName)
      .putLong(KEY_GRACE_UNTIL, System.currentTimeMillis() + 6 * 60 * 60 * 1000L)
      .commit()
  }

  fun getSession(context: Context): Map<String, Any?>? {
    val prefs = prefs(context)
    if (!prefs.getBoolean(KEY_SESSION_ACTIVE, false)) return null
    val packageName = prefs.getString(KEY_SESSION_PACKAGE, null) ?: return null
    return mapOf(
      "packageName" to packageName,
      "categoryId" to prefs.getInt(KEY_SESSION_CATEGORY_ID, -1),
      "reason" to (prefs.getString(KEY_SESSION_REASON, "") ?: ""),
      "browseOnly" to prefs.getBoolean(KEY_SESSION_BROWSE_ONLY, false),
      "needsSettle" to prefs.getBoolean(KEY_SESSION_NEEDS_SETTLE, false)
    )
  }

  fun markNeedsSettle(context: Context) {
    prefs(context).edit()
      .putBoolean(KEY_SESSION_NEEDS_SETTLE, true)
      .commit()
  }

  fun clearSession(context: Context) {
    prefs(context).edit()
      .remove(KEY_SESSION_PACKAGE)
      .remove(KEY_SESSION_CATEGORY_ID)
      .remove(KEY_SESSION_REASON)
      .remove(KEY_SESSION_BROWSE_ONLY)
      .remove(KEY_SESSION_ACTIVE)
      .remove(KEY_SESSION_NEEDS_SETTLE)
      .remove(KEY_GRACE_PACKAGE)
      .remove(KEY_GRACE_UNTIL)
      .commit()
  }

  fun setLastDetected(context: Context, packageName: String) {
    prefs(context).edit()
      .putString(KEY_LAST_DETECTED, packageName)
      .putLong(KEY_LAST_DETECTED_AT, System.currentTimeMillis())
      .apply()
  }

  fun getLastDetected(context: Context): Map<String, Any?> {
    val prefs = prefs(context)
    return mapOf(
      "packageName" to prefs.getString(KEY_LAST_DETECTED, null),
      "at" to prefs.getLong(KEY_LAST_DETECTED_AT, 0L)
    )
  }
}

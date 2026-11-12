package expo.modules.appgate

import android.content.Context
import android.content.SharedPreferences

object GateStore {
  private const val PREFS = "wifeapp_app_gate"
  private const val KEY_PACKAGES = "watched_packages"
  private const val KEY_PENDING = "pending_package"
  private const val KEY_GRACE_PACKAGE = "grace_package"
  private const val KEY_GRACE_UNTIL = "grace_until"
  private const val KEY_LAST_DETECTED = "last_detected_package"
  private const val KEY_LAST_DETECTED_AT = "last_detected_at"

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

  fun setPendingPackage(context: Context, packageName: String?) {
    prefs(context).edit().putString(KEY_PENDING, packageName).commit()
  }

  fun getPendingPackage(context: Context): String? {
    return prefs(context).getString(KEY_PENDING, null)
  }

  fun clearPendingPackage(context: Context) {
    prefs(context).edit().remove(KEY_PENDING).commit()
  }

  fun grantAccess(context: Context, packageName: String, graceSeconds: Int) {
    val until = System.currentTimeMillis() + graceSeconds * 1000L
    prefs(context).edit()
      .putString(KEY_GRACE_PACKAGE, packageName)
      .putLong(KEY_GRACE_UNTIL, until)
      .remove(KEY_PENDING)
      .commit()
  }

  fun isInGrace(context: Context, packageName: String): Boolean {
    val prefs = prefs(context)
    val gracePackage = prefs.getString(KEY_GRACE_PACKAGE, null) ?: return false
    val until = prefs.getLong(KEY_GRACE_UNTIL, 0L)
    return gracePackage == packageName && System.currentTimeMillis() < until
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

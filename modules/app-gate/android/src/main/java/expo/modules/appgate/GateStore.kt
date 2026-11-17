package expo.modules.appgate

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

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
  private const val KEY_SESSION_STARTED_AT = "session_started_at"

  /** JSON synced from JS: companion role, currency, app labels, categories. */
  private const val KEY_OVERLAY_CONFIG = "overlay_config"

  /** JSON array of expenses the user still has to confirm / that JS must import. */
  private const val KEY_PENDING_EXPENSES = "pending_expenses"
  private const val KEY_LAST_REMINDER_AT = "last_reminder_at"

  const val MODE_INTENT = "intent"
  const val MODE_SETTLE = "settle"

  /** Waiting for the user to say how much / what it was. */
  const val STATUS_OPEN = "open"

  /** User gave an amount from the bubble; JS imports it into SQLite. */
  const val STATUS_REPORTED = "reported"

  private fun prefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  }

  fun setWatchedPackages(context: Context, packages: List<String>) {
    // Copy into a new HashSet — Android SharedPreferences StringSet bug.
    prefs(context).edit()
      .putStringSet(KEY_PACKAGES, HashSet(packages))
      .apply()
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
    editor.apply()
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
      .apply()
  }

  fun grantAccess(context: Context, packageName: String, graceSeconds: Int) {
    val until = System.currentTimeMillis() + graceSeconds * 1000L
    prefs(context).edit()
      .putString(KEY_GRACE_PACKAGE, packageName)
      .putLong(KEY_GRACE_UNTIL, until)
      .remove(KEY_PENDING)
      .remove(KEY_PENDING_MODE)
      .apply()
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
    browseOnly: Boolean,
    startedAt: Long = System.currentTimeMillis()
  ) {
    prefs(context).edit()
      .putString(KEY_SESSION_PACKAGE, packageName)
      .putInt(KEY_SESSION_CATEGORY_ID, categoryId)
      .putString(KEY_SESSION_REASON, reason)
      .putBoolean(KEY_SESSION_BROWSE_ONLY, browseOnly)
      .putBoolean(KEY_SESSION_ACTIVE, true)
      .putBoolean(KEY_SESSION_NEEDS_SETTLE, false)
      .putLong(KEY_SESSION_STARTED_AT, startedAt)
      .remove(KEY_PENDING)
      .remove(KEY_PENDING_MODE)
      .apply()
  }

  fun updateSessionIntent(context: Context, categoryId: Int, browseOnly: Boolean) {
    prefs(context).edit()
      .putInt(KEY_SESSION_CATEGORY_ID, categoryId)
      .putBoolean(KEY_SESSION_BROWSE_ONLY, browseOnly)
      .apply()
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
      "needsSettle" to prefs.getBoolean(KEY_SESSION_NEEDS_SETTLE, false),
      "startedAt" to prefs.getLong(KEY_SESSION_STARTED_AT, 0L)
    )
  }

  fun clearSession(context: Context) {
    prefs(context).edit()
      .remove(KEY_SESSION_PACKAGE)
      .remove(KEY_SESSION_CATEGORY_ID)
      .remove(KEY_SESSION_REASON)
      .remove(KEY_SESSION_BROWSE_ONLY)
      .remove(KEY_SESSION_ACTIVE)
      .remove(KEY_SESSION_NEEDS_SETTLE)
      .remove(KEY_SESSION_STARTED_AT)
      .remove(KEY_GRACE_PACKAGE)
      .remove(KEY_GRACE_UNTIL)
      .apply()
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

  // ---------------------------------------------------------------------------
  // Overlay config (synced from JS)
  // ---------------------------------------------------------------------------

  fun setOverlayConfig(context: Context, json: String) {
    prefs(context).edit().putString(KEY_OVERLAY_CONFIG, json).apply()
  }

  fun getOverlayConfig(context: Context): OverlayConfig {
    val raw = prefs(context).getString(KEY_OVERLAY_CONFIG, null)
    return OverlayConfig.parse(raw)
  }

  // ---------------------------------------------------------------------------
  // Pending expenses queue
  // ---------------------------------------------------------------------------

  @Synchronized
  private fun readPending(context: Context): JSONArray {
    val raw = prefs(context).getString(KEY_PENDING_EXPENSES, null) ?: return JSONArray()
    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      JSONArray()
    }
  }

  @Synchronized
  private fun writePending(context: Context, list: JSONArray) {
    prefs(context).edit().putString(KEY_PENDING_EXPENSES, list.toString()).apply()
  }

  /** Turns the active session into an open pending expense. Returns its id. */
  @Synchronized
  fun moveSessionToPending(context: Context): String? {
    val session = getSession(context) ?: return null
    val packageName = session["packageName"] as String
    val config = getOverlayConfig(context)
    val id = UUID.randomUUID().toString()
    val item = JSONObject().apply {
      put("id", id)
      put("packageName", packageName)
      put("label", config.labelFor(packageName))
      put("categoryId", session["categoryId"] as Int)
      put("reason", session["reason"] as String)
      put("startedAt", session["startedAt"] as Long)
      put("endedAt", System.currentTimeMillis())
      put("status", STATUS_OPEN)
    }
    val list = readPending(context)
    list.put(item)
    writePending(context, list)
    clearSession(context)
    return id
  }

  @Synchronized
  fun getPendingExpenses(context: Context): List<JSONObject> {
    val list = readPending(context)
    return (0 until list.length()).mapNotNull { list.optJSONObject(it) }
  }

  fun getPendingExpense(context: Context, id: String): JSONObject? {
    return getPendingExpenses(context).firstOrNull { it.optString("id") == id }
  }

  @Synchronized
  fun reportPendingExpense(
    context: Context,
    id: String,
    amount: Double,
    reason: String,
    categoryId: Int
  ) {
    val list = readPending(context)
    for (i in 0 until list.length()) {
      val item = list.optJSONObject(i) ?: continue
      if (item.optString("id") == id) {
        item.put("amount", amount)
        item.put("reason", reason)
        item.put("categoryId", categoryId)
        item.put("status", STATUS_REPORTED)
        item.put("reportedAt", System.currentTimeMillis())
      }
    }
    writePending(context, list)
  }

  @Synchronized
  fun removePendingExpense(context: Context, id: String) {
    val list = readPending(context)
    val next = JSONArray()
    for (i in 0 until list.length()) {
      val item = list.optJSONObject(i) ?: continue
      if (item.optString("id") != id) next.put(item)
    }
    writePending(context, next)
  }

  /** Oldest pending expense that still has no amount. */
  fun oldestOpenPending(context: Context): JSONObject? {
    return getPendingExpenses(context)
      .filter { it.optString("status") == STATUS_OPEN }
      .minByOrNull { it.optLong("endedAt") }
  }

  fun countOpenPending(context: Context): Int {
    return getPendingExpenses(context).count { it.optString("status") == STATUS_OPEN }
  }

  /**
   * If the user left [packageName] only a moment ago (e.g. to copy a code)
   * and came back, we resume that visit instead of asking again.
   */
  fun findRecentOpenPending(context: Context, packageName: String, withinMs: Long): JSONObject? {
    val now = System.currentTimeMillis()
    return getPendingExpenses(context)
      .filter {
        it.optString("status") == STATUS_OPEN &&
          it.optString("packageName") == packageName &&
          now - it.optLong("endedAt") < withinMs
      }
      .maxByOrNull { it.optLong("endedAt") }
  }

  fun getLastReminderAt(context: Context): Long {
    return prefs(context).getLong(KEY_LAST_REMINDER_AT, 0L)
  }

  fun setLastReminderAt(context: Context, at: Long) {
    prefs(context).edit().putLong(KEY_LAST_REMINDER_AT, at).apply()
  }
}

data class OverlayCategory(
  val id: Int,
  val name: String,
  val remaining: Double,
  val spent: Double = 0.0,
  val limit: Double = 0.0
)

data class OverlayConfig(
  val role: String,
  val currency: String,
  val apps: Map<String, Pair<String, Int>>,
  val categories: List<OverlayCategory>,
  val reminderMinutes: Int,
  val avatarSource: String = "pixel",
  val avatarPhotoUri: String = ""
) {
  fun labelFor(packageName: String): String = apps[packageName]?.first ?: packageName

  fun defaultCategoryFor(packageName: String): Int {
    val fromApp = apps[packageName]?.second ?: -1
    if (fromApp > 0) return fromApp
    return categories.firstOrNull()?.id ?: -1
  }

  fun categoryName(id: Int): String? = categories.firstOrNull { it.id == id }?.name

  /** 0 = plenty left, 1 = the limit, above 1 = over budget. */
  fun stressFor(categoryId: Int): Double {
    fun ratio(category: OverlayCategory): Double {
      if (category.limit <= 0.0) return 0.0
      return (category.spent / category.limit).coerceAtLeast(0.0)
    }
    val own = categories.firstOrNull { it.id == categoryId }
    if (own != null && own.limit > 0.0) return ratio(own)
    return categories.maxOfOrNull { ratio(it) } ?: 0.0
  }

  companion object {
    fun parse(raw: String?): OverlayConfig {
      val empty = OverlayConfig("esposa", "USD", emptyMap(), emptyList(), 20)
      if (raw.isNullOrBlank()) return empty
      return try {
        val json = JSONObject(raw)
        val apps = mutableMapOf<String, Pair<String, Int>>()
        json.optJSONArray("apps")?.let { arr ->
          for (i in 0 until arr.length()) {
            val a = arr.optJSONObject(i) ?: continue
            val pkg = a.optString("packageName")
            if (pkg.isBlank()) continue
            apps[pkg] = a.optString("label", pkg) to a.optInt("categoryId", -1)
          }
        }
        val categories = mutableListOf<OverlayCategory>()
        json.optJSONArray("categories")?.let { arr ->
          for (i in 0 until arr.length()) {
            val c = arr.optJSONObject(i) ?: continue
            categories.add(
              OverlayCategory(
                c.optInt("id"),
                c.optString("name"),
                c.optDouble("remaining", 0.0),
                c.optDouble("spent", 0.0),
                c.optDouble("limit", 0.0)
              )
            )
          }
        }
        OverlayConfig(
          role = if (json.optString("role") == "esposo") "esposo" else "esposa",
          currency = json.optString("currency", "USD"),
          apps = apps,
          categories = categories,
          reminderMinutes = json.optInt("reminderMinutes", 20).coerceAtLeast(5),
          avatarSource = if (json.optString("avatarSource") == "photo") "photo" else "pixel",
          avatarPhotoUri = json.optString("avatarPhotoUri", "")
        )
      } catch (_: Exception) {
        empty
      }
    }
  }
}

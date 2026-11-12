package expo.modules.appgate

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings

/**
 * Trampoline: brings WifeApp to the front on the /gate route.
 */
class GateActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val target = intent?.getStringExtra(EXTRA_TARGET_PACKAGE)
      ?: GateStore.getPendingPackage(this)

    if (target.isNullOrBlank()) {
      finish()
      return
    }

    GateStore.setPendingPackage(this, target)

    val deepLink = Uri.parse("wifeapp://gate?package=${Uri.encode(target)}")

    // Prefer deep link into Expo Router.
    val viewIntent = Intent(Intent.ACTION_VIEW, deepLink).apply {
      setPackage(packageName)
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
      )
    }

    var launched = false
    try {
      startActivity(viewIntent)
      launched = true
    } catch (_: Exception) {
      // fall through
    }

    if (!launched) {
      val main = packageManager.getLaunchIntentForPackage(packageName)
      if (main != null) {
        main.action = Intent.ACTION_VIEW
        main.data = deepLink
        main.putExtra(EXTRA_TARGET_PACKAGE, target)
        main.addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_SINGLE_TOP or
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        )
        startActivity(main)
      }
    }

    finish()
  }

  companion object {
    const val EXTRA_TARGET_PACKAGE = "target_package"

    fun openOverlaySettings(activity: Activity) {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${activity.packageName}")
      )
      activity.startActivity(intent)
    }
  }
}

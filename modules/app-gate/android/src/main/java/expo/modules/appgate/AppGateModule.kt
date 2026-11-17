package expo.modules.appgate

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.view.accessibility.AccessibilityManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AppGateModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("AppGate")

    AsyncFunction("setWatchedPackages") { packages: List<String> ->
      GateStore.setWatchedPackages(context, packages)
    }

    AsyncFunction("getWatchedPackages") {
      GateStore.getWatchedPackages(context).toList()
    }

    AsyncFunction("getPermissions") {
      mapOf(
        "accessibilityEnabled" to isAccessibilityEnabled(),
        "overlayAllowed" to Settings.canDrawOverlays(context)
      )
    }

    AsyncFunction("openAccessibilitySettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    AsyncFunction("openOverlaySettings") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    AsyncFunction("grantAccess") { packageName: String, graceSeconds: Int ->
      GateStore.grantAccess(context, packageName, graceSeconds)
      launchPackage(packageName)
    }

    AsyncFunction("startGateSession") { packageName: String, categoryId: Int, reason: String, browseOnly: Boolean ->
      GateStore.startSession(context, packageName, categoryId, reason, browseOnly)
      launchPackage(packageName)
    }

    AsyncFunction("getGateSession") {
      GateStore.getSession(context)
    }

    AsyncFunction("clearGateSession") {
      GateStore.clearSession(context)
      GateStore.clearPendingPackage(context)
    }

    AsyncFunction("denyAndGoHome") {
      GateStore.clearPendingPackage(context)
      try {
        val home = Intent(Intent.ACTION_MAIN).apply {
          addCategory(Intent.CATEGORY_HOME)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(home)
      } catch (error: Exception) {
        Log.e("WifeAppGate", "Failed to go home", error)
      }
    }

    AsyncFunction("getPendingPackage") {
      GateStore.getPendingPackage(context)
    }

    AsyncFunction("getPendingGate") {
      GateStore.getPendingGate(context)
    }

    AsyncFunction("clearPendingPackage") {
      GateStore.clearPendingPackage(context)
    }

    AsyncFunction("getLastDetectedPackage") {
      GateStore.getLastDetected(context)
    }

    AsyncFunction("listInstalledApps") {
      val pm = context.packageManager
      val intent = Intent(Intent.ACTION_MAIN, null).apply {
        addCategory(Intent.CATEGORY_LAUNCHER)
      }
      val resolveInfos = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
      resolveInfos
        .mapNotNull { info ->
          val pkg = info.activityInfo?.packageName ?: return@mapNotNull null
          if (pkg == context.packageName) return@mapNotNull null
          val label = try {
            info.loadLabel(pm)?.toString() ?: pkg
          } catch (_: Exception) {
            pkg
          }
          mapOf(
            "label" to label,
            "androidPackage" to pkg
          )
        }
        .distinctBy { it["androidPackage"] }
        .sortedBy { (it["label"] as String).lowercase() }
    }
  }

  private fun launchPackage(packageName: String) {
    try {
      val launch = context.packageManager.getLaunchIntentForPackage(packageName) ?: return
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(launch)
    } catch (error: Exception) {
      Log.e("WifeAppGate", "Failed to launch $packageName", error)
    }
  }

  private fun isAccessibilityEnabled(): Boolean {
    val expected = ComponentName(context, GateAccessibilityService::class.java)

    val am = context.getSystemService(AccessibilityManager::class.java)
    if (am != null) {
      val enabledServices =
        am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
      val fromManager = enabledServices.any { info ->
        val serviceInfo = info.resolveInfo?.serviceInfo ?: return@any false
        serviceInfo.packageName == expected.packageName &&
          (serviceInfo.name == expected.className ||
            serviceInfo.name == expected.flattenToShortString() ||
            serviceInfo.name == expected.flattenToString())
      }
      if (fromManager) return true
    }

    // Fallback: lista Secure a veces refleja el toggle antes que AccessibilityManager.
    return isEnabledInSecureSettings(expected)
  }

  private fun isEnabledInSecureSettings(expected: ComponentName): Boolean {
    val enabled = try {
      Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      )
    } catch (_: Exception) {
      null
    }
    if (enabled.isNullOrBlank()) return false

    val splitter = TextUtils.SimpleStringSplitter(':')
    splitter.setString(enabled)
    while (splitter.hasNext()) {
      val component = ComponentName.unflattenFromString(splitter.next()) ?: continue
      if (component == expected) return true
      if (
        component.packageName == expected.packageName &&
        component.className == expected.className
      ) {
        return true
      }
    }
    return false
  }
}

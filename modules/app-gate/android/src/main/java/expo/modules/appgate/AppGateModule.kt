package expo.modules.appgate

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
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
      val home = Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_HOME)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      context.startActivity(home)
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
    val launch = context.packageManager.getLaunchIntentForPackage(packageName)
    if (launch != null) {
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(launch)
    }
  }

  private fun isAccessibilityEnabled(): Boolean {
    val am = context.getSystemService(AccessibilityManager::class.java) ?: return false
    val enabledServices =
      am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
    val expectedPackage = context.packageName
    val expectedClass = GateAccessibilityService::class.java.name
    return enabledServices.any { info ->
      val serviceInfo = info.resolveInfo?.serviceInfo ?: return@any false
      serviceInfo.packageName == expectedPackage && serviceInfo.name == expectedClass
    }
  }
}

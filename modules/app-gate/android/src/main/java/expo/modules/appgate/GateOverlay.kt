package expo.modules.appgate

import android.accessibilityservice.AccessibilityService
import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.ViewTreeObserver
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.File
import kotlin.math.abs
import kotlin.math.min

/**
 * Small floating companion ("chat head") drawn by the accessibility service.
 *
 * It never takes over the screen: the card only covers its own area, touches
 * outside it go to the app underneath, and it can always be closed. Closing a
 * settle question keeps the expense in the pending queue so we can remind later.
 */
class GateOverlay(private val service: AccessibilityService) {
  private enum class Mode { NONE, INTENT, SETTLE }

  private val wm = service.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private val handler = Handler(Looper.getMainLooper())
  private val touchSlop = ViewConfiguration.get(service).scaledTouchSlop

  private var rootView: View? = null
  private var rootParams: WindowManager.LayoutParams? = null
  private var mode = Mode.NONE
  private var expanded = false
  private var reminder = false
  private var selectedCategory = -1
  private var sideRight = true
  private var avatarY = -1
  private var rendering = false
  private var renderAgain = false
  private var forceAccessibilityWindow = false
  private val bitmapCache = mutableMapOf<String, Bitmap>()
  private var floatAnim: ValueAnimator? = null
  private var shakeAnim: ObjectAnimator? = null
  private var snapAnim: ValueAnimator? = null
  private var motionHost: View? = null
  private var motionImage: ImageView? = null
  private var motionMood = "happy"
  private var motionPhoto = false
  private var openBitmap: Bitmap? = null
  private var closedBitmap: Bitmap? = null

  /** Window events caused by this overlay are ignored until this uptime. */
  var ignoreEventsUntil: Long = 0

  var targetPackage: String? = null
    private set
  var pendingId: String? = null
    private set

  val isShowing: Boolean
    get() = rootView != null

  val isSettling: Boolean
    get() = mode == Mode.SETTLE

  private val collapseRunnable = Runnable {
    if (isFocusable()) {
      scheduleCollapse(20_000L)
    } else if (expanded) {
      collapse()
    }
  }
  private val hideRunnable = Runnable { hide() }
  private val blinkBack = Runnable {
    val image = motionImage ?: return@Runnable
    openBitmap?.let { if (!it.isRecycled) image.setImageBitmap(it) }
  }
  private val blinkRunnable = object : Runnable {
    override fun run() {
      val image = motionImage
      val closed = closedBitmap
      val open = openBitmap
      if (image != null && closed != null && open != null && !closed.isRecycled) {
        image.setImageBitmap(closed)
        handler.postDelayed(blinkBack, 130)
      } else {
        motionHost?.animate()?.scaleY(0.9f)?.setDuration(80)?.withEndAction {
          motionHost?.animate()?.scaleY(1f)?.setDuration(90)?.start()
        }?.start()
      }
      handler.postDelayed(this, 3400)
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Entering a watched app: ask what the visit is for. */
  fun showIntent(packageName: String) {
    val config = GateStore.getOverlayConfig(service)
    mode = Mode.INTENT
    targetPackage = packageName
    pendingId = null
    reminder = false
    selectedCategory = config.defaultCategoryFor(packageName)
    expanded = true
    render()
    scheduleCollapse(12_000L)
  }

  /** Left a watched app (or periodic reminder): ask amount + what it was. */
  fun showSettle(id: String, isReminder: Boolean) {
    val item = GateStore.getPendingExpense(service, id) ?: return
    mode = Mode.SETTLE
    pendingId = id
    targetPackage = item.optString("packageName")
    reminder = isReminder
    selectedCategory = item.optInt("categoryId", -1).takeIf { it > 0 }
      ?: GateStore.getOverlayConfig(service).defaultCategoryFor(targetPackage ?: "")
    expanded = true
    render()
    scheduleCollapse(30_000L)
  }

  fun hideIntentFor(packageName: String) {
    if (mode == Mode.INTENT && targetPackage == packageName) hide()
  }

  fun hideSettleFor(id: String) {
    if (mode == Mode.SETTLE && pendingId == id) hide()
  }

  fun hide() {
    holdEvents(600)
    handler.removeCallbacks(collapseRunnable)
    handler.removeCallbacks(hideRunnable)
    removeRoot()
    mode = Mode.NONE
    expanded = false
    targetPackage = null
    pendingId = null
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private fun render() {
    if (rendering) {
      renderAgain = true
      return
    }
    rendering = true
    try {
      holdEvents(700)
      removeRoot()
      if (mode == Mode.NONE) return
      val (view, params) = if (expanded) buildCard() else buildHead()
      try {
        addWindow(view, params)
      } catch (_: Exception) {
        stopMotion()
        rootView = null
        rootParams = null
        return
      }
      rootView = view
      rootParams = params
      view.alpha = 0f
      view.post {
        view.pivotX = if (sideRight) view.width.toFloat() else 0f
        view.pivotY = dp(32).toFloat()
        view.scaleX = 0.86f
        view.scaleY = 0.86f
        view.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(180).start()
      }
    } finally {
      rendering = false
      if (renderAgain) {
        renderAgain = false
        handler.post { render() }
      }
    }
  }

  private fun addWindow(view: View, params: WindowManager.LayoutParams) {
    try {
      wm.addView(view, params)
    } catch (error: Exception) {
      if (params.type == WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY) throw error
      params.type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
      forceAccessibilityWindow = true
      wm.addView(view, params)
    }
  }

  private fun removeRoot() {
    stopMotion()
    val view = rootView ?: return
    try {
      wm.removeView(view)
    } catch (_: Exception) {
    }
    rootView = null
    rootParams = null
  }

  private fun collapse() {
    handler.removeCallbacks(collapseRunnable)
    expanded = false
    render()
    if (mode == Mode.SETTLE) {
      // The question stays saved; the head goes away on its own after a while.
      handler.removeCallbacks(hideRunnable)
      handler.postDelayed(hideRunnable, 120_000L)
    }
  }

  private fun expand() {
    handler.removeCallbacks(hideRunnable)
    expanded = true
    render()
    scheduleCollapse(if (mode == Mode.SETTLE) 30_000L else 12_000L)
  }

  private fun scheduleCollapse(delay: Long) {
    handler.removeCallbacks(collapseRunnable)
    handler.postDelayed(collapseRunnable, delay)
  }

  private fun baseParams(width: Int, watchOutside: Boolean): WindowManager.LayoutParams {
    var flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
      WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
      WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
    if (watchOutside) flags = flags or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
    return WindowManager.LayoutParams(
      width,
      WindowManager.LayoutParams.WRAP_CONTENT,
      chooseType(),
      flags,
      PixelFormat.TRANSLUCENT
    )
  }

  private fun chooseType(): Int {
    if (forceAccessibilityWindow || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
    }
    val allowed = try {
      Settings.canDrawOverlays(service)
    } catch (_: Exception) {
      false
    }
    return if (allowed) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
    }
  }

  private fun holdEvents(ms: Long) {
    ignoreEventsUntil = SystemClock.uptimeMillis() + ms
  }

  private fun ensureAnchor() {
    if (avatarY < 0) {
      avatarY = (service.resources.displayMetrics.heightPixels * 0.34f).toInt()
    }
  }

  private fun edgeX(windowWidth: Int): Int {
    val screenW = service.resources.displayMetrics.widthPixels
    val margin = dp(6)
    return if (sideRight) (screenW - windowWidth - margin).coerceAtLeast(margin) else margin
  }

  // --- Head (collapsed avatar) -----------------------------------------------

  @SuppressLint("ClickableViewAccessibility")
  private fun buildHead(): Pair<View, WindowManager.LayoutParams> {
    val size = dp(58)
    val full = size + dp(8)
    ensureAnchor()
    val container = FrameLayout(service).apply {
      setPadding(dp(4), dp(4), dp(4), dp(4))
      clipChildren = false
    }
    val avatar = avatarView(size, mood())
    container.addView(avatar, FrameLayout.LayoutParams(size, size))

    val badgeCount = if (mode == Mode.SETTLE) GateStore.countOpenPending(service).coerceAtLeast(1) else 0
    if (badgeCount > 0) {
      val badge = TextView(service).apply {
        text = if (badgeCount > 9) "9+" else badgeCount.toString()
        setTextColor(Color.WHITE)
        textSize = 11f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        background = oval(COLOR_DANGER, Color.WHITE, dp(2))
      }
      container.addView(
        badge,
        FrameLayout.LayoutParams(dp(22), dp(22), Gravity.TOP or Gravity.END)
      )
    } else {
      val hint = TextView(service).apply {
        text = "?"
        setTextColor(Color.WHITE)
        textSize = 12f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        background = oval(COLOR_PRIMARY, Color.WHITE, dp(2))
      }
      container.addView(
        hint,
        FrameLayout.LayoutParams(dp(22), dp(22), Gravity.TOP or Gravity.END)
      )
    }

    val params = baseParams(full, watchOutside = false).apply {
      gravity = Gravity.TOP or Gravity.START
      x = edgeX(full)
      y = avatarY
    }
    enableDrag(container, container, params, full) { expand() }
    return container to params
  }

  // --- Card (avatar + speech bubble) ----------------------------------------

  @SuppressLint("ClickableViewAccessibility")
  private fun buildCard(): Pair<View, WindowManager.LayoutParams> {
    val config = GateStore.getOverlayConfig(service)
    val pkg = targetPackage ?: ""
    val label = config.labelFor(pkg)
    val role = config.role
    val item = pendingId?.let { GateStore.getPendingExpense(service, it) }

    val metrics = service.resources.displayMetrics
    val avatarSize = dp(58)
    val tailW = dp(10)
    val bubbleW = min(dp(280), metrics.widthPixels - avatarSize - tailW - dp(28))
    val pad = dp(2)
    val windowW = bubbleW + tailW + avatarSize + pad * 2
    ensureAnchor()

    val root = object : FrameLayout(service) {
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
          if (event.action == KeyEvent.ACTION_UP) collapse()
          return true
        }
        return super.dispatchKeyEvent(event)
      }
    }
    root.setPadding(pad, pad, pad, pad)
    root.clipChildren = false
    root.setOnTouchListener { _, event ->
      if (event.actionMasked == MotionEvent.ACTION_OUTSIDE) {
        // Tapping the app underneath: drop the keyboard, then shrink to the head.
        if (isFocusable()) setFocusable(root, false) else collapse()
        true
      } else {
        false
      }
    }

    val row = LinearLayout(service).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.TOP
      clipChildren = false
    }
    root.addView(row, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

    val avatar = avatarView(avatarSize, mood())
    val tail = TailView(service, Color.WHITE, COLOR_BORDER, dp(1).toFloat(), pointRight = sideRight)
    val bubble = LinearLayout(service).apply {
      orientation = LinearLayout.VERTICAL
      background = rounded(Color.WHITE, dp(20).toFloat(), COLOR_BORDER, dp(1))
      setPadding(dp(12), dp(8), dp(10), dp(12))
      elevation = dp(8).toFloat()
    }
    val tailParams = LinearLayout.LayoutParams(tailW, dp(16)).apply {
      topMargin = avatarSize / 2 - dp(8)
    }
    val bubbleParams = LinearLayout.LayoutParams(bubbleW, ViewGroup.LayoutParams.WRAP_CONTENT)
    val avatarParams = LinearLayout.LayoutParams(avatarSize, avatarSize)
    if (sideRight) {
      row.addView(bubble, bubbleParams)
      row.addView(tail, tailParams)
      row.addView(avatar, avatarParams)
    } else {
      row.addView(avatar, avatarParams)
      row.addView(tail, tailParams)
      row.addView(bubble, bubbleParams)
    }
    // Header: name tag + close
    val header = LinearLayout(service).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val nameTag = TextView(service).apply {
      text = if (role == "esposo") "Tu esposo ♡" else "Tu esposa ♡"
      setTextColor(Color.WHITE)
      textSize = 11f
      typeface = Typeface.DEFAULT_BOLD
      background = rounded(moodColor(mood()), dp(10).toFloat())
      setPadding(dp(10), dp(3), dp(10), dp(3))
    }
    header.addView(nameTag)
    header.addView(View(service), LinearLayout.LayoutParams(0, 1, 1f))
    val close = TextView(service).apply {
      text = "✕"
      setTextColor(COLOR_MUTED)
      textSize = 16f
      gravity = Gravity.CENTER
      contentDescription = "Cerrar"
      setOnClickListener { onClose() }
    }
    header.addView(close, LinearLayout.LayoutParams(dp(32), dp(28)))
    bubble.addView(header)

    val (title, subtitle) = copy(role, label, item)
    bubble.addView(TextView(service).apply {
      text = title
      setTextColor(COLOR_PRIMARY)
      textSize = 15f
      typeface = Typeface.DEFAULT_BOLD
      setPadding(0, dp(6), 0, 0)
    })
    bubble.addView(TextView(service).apply {
      text = subtitle
      setTextColor(COLOR_MUTED)
      textSize = 12f
      setPadding(0, dp(3), 0, dp(10))
    })

    if (config.categories.isNotEmpty()) {
      bubble.addView(categoryChips(config))
    }

    when (mode) {
      Mode.INTENT -> buildIntentActions(bubble)
      Mode.SETTLE -> buildSettleForm(bubble, root, item, config)
      Mode.NONE -> {}
    }

    // Any touch inside the card counts as interaction: don't auto-collapse.
    bubble.setOnTouchListener { _, _ ->
      handler.removeCallbacks(collapseRunnable)
      false
    }

    val params = baseParams(windowW, watchOutside = true).apply {
      gravity = Gravity.TOP or Gravity.START
      x = edgeX(windowW)
      y = avatarY
      softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN or
        WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
    }
    enableDrag(avatar, root, params, windowW) { collapse() }
    root.viewTreeObserver.addOnGlobalLayoutListener(object : ViewTreeObserver.OnGlobalLayoutListener {
      override fun onGlobalLayout() {
        root.viewTreeObserver.removeOnGlobalLayoutListener(this)
        val maxY = (metrics.heightPixels - root.height - dp(8)).coerceAtLeast(dp(24))
        if (params.y > maxY) {
          params.y = maxY
          avatarY = maxY
          safeUpdate(root, params)
        }
      }
    })
    return root to params
  }

  private fun buildIntentActions(bubble: LinearLayout) {
    val actions = LinearLayout(service).apply {
      orientation = LinearLayout.HORIZONTAL
      setPadding(0, dp(10), 0, 0)
    }
    actions.addView(
      button("Solo mirar", COLOR_LIME, COLOR_PRIMARY) { answerIntent(browseOnly = true) },
      LinearLayout.LayoutParams(0, dp(40), 1f).apply { marginEnd = dp(8) }
    )
    actions.addView(
      button("Voy a gastar", COLOR_PRIMARY, Color.WHITE) { answerIntent(browseOnly = false) },
      LinearLayout.LayoutParams(0, dp(40), 1f)
    )
    bubble.addView(actions)
  }

  @SuppressLint("ClickableViewAccessibility")
  private fun buildSettleForm(
    bubble: LinearLayout,
    root: View,
    item: org.json.JSONObject?,
    config: OverlayConfig
  ) {
    val amount = input("Monto (${config.currency})", InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL)
    val reason = input("¿De qué fue? Ej. Uber al trabajo", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES)
    item?.optString("reason")?.takeIf { it.isNotBlank() && it != "Solo ver" }?.let { reason.setText(it) }

    val focusOnTouch = View.OnTouchListener { v, event ->
      if (event.actionMasked == MotionEvent.ACTION_DOWN && !isFocusable()) {
        setFocusable(root, true)
        handler.removeCallbacks(collapseRunnable)
        handler.postDelayed({
          v.requestFocus()
          val imm = service.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
          imm.showSoftInput(v, InputMethodManager.SHOW_IMPLICIT)
        }, 120)
      }
      false
    }
    amount.setOnTouchListener(focusOnTouch)
    reason.setOnTouchListener(focusOnTouch)

    bubble.addView(amount, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(44)).apply { topMargin = dp(10) })
    bubble.addView(reason, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(44)).apply { topMargin = dp(8) })

    val actions = LinearLayout(service).apply {
      orientation = LinearLayout.HORIZONTAL
      setPadding(0, dp(10), 0, 0)
    }
    actions.addView(
      button("No gasté nada", COLOR_LIME, COLOR_PRIMARY) { settleNothing() },
      LinearLayout.LayoutParams(0, dp(40), 1f).apply { marginEnd = dp(8) }
    )
    actions.addView(
      button("Guardar", COLOR_PRIMARY, Color.WHITE) {
        val value = amount.text.toString().replace(',', '.').replace(Regex("[^0-9.]"), "").toDoubleOrNull()
        if (value == null || value <= 0.0) {
          amount.error = "Escribe el monto"
          return@button
        }
        settleSave(Math.round(value * 100.0) / 100.0, reason.text.toString().trim(), config)
      },
      LinearLayout.LayoutParams(0, dp(40), 1f)
    )
    bubble.addView(actions)
  }

  private fun categoryChips(config: OverlayConfig): View {
    val scroll = HorizontalScrollView(service).apply {
      isHorizontalScrollBarEnabled = false
    }
    val strip = LinearLayout(service).apply { orientation = LinearLayout.HORIZONTAL }
    scroll.addView(strip)
    val chips = mutableListOf<Pair<Int, TextView>>()
    fun restyle() {
      chips.forEach { (id, chip) ->
        val selected = id == selectedCategory
        chip.background = rounded(
          if (selected) COLOR_PRIMARY else COLOR_SOFT,
          dp(14).toFloat(),
          if (selected) COLOR_PRIMARY else COLOR_BORDER,
          dp(1)
        )
        chip.setTextColor(if (selected) Color.WHITE else COLOR_PRIMARY)
      }
    }
    config.categories.forEach { category ->
      val chip = TextView(service).apply {
        text = category.name
        textSize = 12f
        typeface = Typeface.DEFAULT_BOLD
        setPadding(dp(12), dp(6), dp(12), dp(6))
        setOnClickListener {
          selectedCategory = category.id
          restyle()
        }
      }
      chips.add(category.id to chip)
      strip.addView(chip, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginEnd = dp(6) })
    }
    restyle()
    return scroll
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  private fun answerIntent(browseOnly: Boolean) {
    val session = GateStore.getSession(service)
    if (session != null && session["packageName"] == targetPackage) {
      GateStore.updateSessionIntent(service, selectedCategory, browseOnly)
    }
    if (!browseOnly) {
      toast("Va. Te pregunto el monto cuando salgas.")
    }
    hide()
  }

  private fun onClose() {
    when (mode) {
      Mode.INTENT -> {
        // Closed without answering: we still ask the amount when they leave.
        val session = GateStore.getSession(service)
        if (session != null && session["packageName"] == targetPackage) {
          GateStore.updateSessionIntent(service, selectedCategory, false)
        }
        hide()
      }
      Mode.SETTLE -> {
        // Stays in the pending queue; we'll remind them later.
        GateStore.setLastReminderAt(service, System.currentTimeMillis())
        toast("Lo dejo pendiente. Te lo vuelvo a preguntar más tarde.")
        hide()
      }
      Mode.NONE -> hide()
    }
  }

  private fun settleNothing() {
    pendingId?.let { GateStore.removePendingExpense(service, it) }
    toast("Perfecto, nada que anotar.")
    hide()
    showNextPendingIfAny()
  }

  private fun settleSave(amount: Double, reason: String, config: OverlayConfig) {
    val id = pendingId ?: return
    val item = GateStore.getPendingExpense(service, id)
    val label = config.labelFor(item?.optString("packageName") ?: "")
    GateStore.reportPendingExpense(
      service,
      id,
      amount,
      reason.ifBlank { "Gasto en $label" },
      selectedCategory
    )
    val remaining = config.categories.firstOrNull { it.id == selectedCategory }?.remaining
    if (remaining != null && amount > remaining) {
      toast("Anotado, pero supera el presupuesto. Confírmalo con tu código en WifeApp.")
    } else {
      toast("¡Anotado! Gracias por contarme.")
    }
    hide()
    showNextPendingIfAny()
  }

  private fun showNextPendingIfAny() {
    // Don't chain questions; the reminder loop will pick the rest up later.
    GateStore.setLastReminderAt(service, System.currentTimeMillis())
  }

  // ---------------------------------------------------------------------------
  // Copy
  // ---------------------------------------------------------------------------

  private fun copy(role: String, label: String, item: org.json.JSONObject?): Pair<String, String> {
    val wife = role != "esposo"
    val heat = mood()
    val hot = heat == "angry" || heat == "furious"
    return when {
      mode == Mode.INTENT -> if (wife) {
        (if (hot) "Amor, esa categoría ya va muy justa…" else "Amor, ¿vas a gastar en $label?") to
          "Elige la categoría. El monto te lo pregunto cuando salgas."
      } else {
        (if (hot) "Ojo, esa categoría ya va muy justa." else "¿Vas a gastar en $label?") to
          "Elige la categoría. El monto te lo pregunto cuando salgas."
      }
      reminder -> {
        val ago = item?.optLong("endedAt")?.let { timeAgo(it) } ?: "hace un rato"
        val others = GateStore.countOpenPending(service) - 1
        val extra = if (others > 0) " (y $others más pendientes)" else ""
        if (wife) {
          (if (hot) "Amor, sigo esperando y ya casi no queda." else "Amor, sigo esperando… ¿de qué fue lo de $label?") to
            "Fue $ago$extra. Confírmalo y te dejo tranquila."
        } else {
          (if (hot) "Sigo esperando, y el presupuesto ya está justo." else "Oye… todavía no me dices qué gastaste en $label.") to
            "Fue $ago$extra. Confírmalo y listo."
        }
      }
      else -> if (wife) {
        (if (heat == "furious") "Amor… te pasaste. ¿Cuánto fue en $label?" else "Amor… ¿cuánto fue en $label?") to
          "Cuéntame el monto y de qué fue. Sin rodeos."
      } else {
        (if (heat == "furious") "Te pasaste. ¿Cuánto salió en $label?" else "Bueno… ¿cuánto salió en $label?") to
          "Registra el gasto real, sin inventos."
      }
    }
  }

  private fun timeAgo(at: Long): String {
    val minutes = ((System.currentTimeMillis() - at) / 60_000L).coerceAtLeast(1)
    return when {
      minutes < 60 -> "hace $minutes min"
      minutes < 60 * 24 -> "hace ${minutes / 60} h"
      else -> "hace ${minutes / (60 * 24)} días"
    }
  }

  private fun mood(): String {
    val ratio = GateStore.getOverlayConfig(service).stressFor(selectedCategory)
    return when {
      ratio >= 1.0 -> "furious"
      ratio >= 0.85 -> "angry"
      ratio >= 0.7 -> "annoyed"
      ratio >= 0.45 -> "uneasy"
      else -> "happy"
    }
  }

  // ---------------------------------------------------------------------------
  // Focus handling (only grab the keyboard when the user taps a text field)
  // ---------------------------------------------------------------------------

  private fun isFocusable(): Boolean {
    val params = rootParams ?: return false
    return params.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE == 0
  }

  private fun setFocusable(view: View, focusable: Boolean) {
    val params = rootParams ?: return
    params.flags = if (focusable) {
      params.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE.inv()
    } else {
      params.flags or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
    }
    safeUpdate(view, params)
  }

  private fun safeUpdate(view: View, params: WindowManager.LayoutParams) {
    try {
      wm.updateViewLayout(view, params)
    } catch (_: Exception) {
    }
  }

  // ---------------------------------------------------------------------------
  // View helpers
  // ---------------------------------------------------------------------------

  private fun avatarView(size: Int, mood: String): View {
    val config = GateStore.getOverlayConfig(service)
    val role = config.role
    val photo = if (config.avatarSource == "photo") photoBitmap(config.avatarPhotoUri) else null
    val open = photo ?: loadPixel(pixelRes(role, mood, blink = false))
    val closed = if (photo == null) loadPixel(pixelRes(role, mood, blink = true)) else null
    val ringColor = moodColor(mood)
    val ring = FrameLayout(service).apply {
      background = oval(Color.WHITE, ringColor, dp(2))
      setPadding(dp(3), dp(3), dp(3), dp(3))
      elevation = dp(8).toFloat()
      clipChildren = false
    }
    val image = ImageView(service).apply {
      scaleType = ImageView.ScaleType.CENTER_CROP
      background = oval(ringColor)
      clipToOutline = true
      outlineProvider = object : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) {
          outline.setOval(0, 0, view.width, view.height)
        }
      }
      open?.let { setImageBitmap(it) }
      contentDescription = if (role == "esposo") "Tu esposo" else "Tu esposa"
    }
    ring.addView(image, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    if (photo != null) {
      val mark = TextView(service).apply {
        text = moodEmoji(mood)
        textSize = 13f
        setShadowLayer(6f, 0f, 1f, Color.WHITE)
      }
      ring.addView(
        mark,
        FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.WRAP_CONTENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
          Gravity.BOTTOM or Gravity.END
        )
      )
    }
    startMotion(ring, image, mood, photo != null, open, closed)
    return ring
  }

  private fun pixelRes(role: String, mood: String, blink: Boolean): Int {
    val wife = role != "esposo"
    return if (wife) {
      when (mood) {
        "uneasy" -> if (blink) R.drawable.companion_pixel_esposa_uneasy_blink else R.drawable.companion_pixel_esposa_uneasy
        "annoyed" -> if (blink) R.drawable.companion_pixel_esposa_annoyed_blink else R.drawable.companion_pixel_esposa_annoyed
        "angry" -> if (blink) R.drawable.companion_pixel_esposa_angry_blink else R.drawable.companion_pixel_esposa_angry
        "furious" -> if (blink) R.drawable.companion_pixel_esposa_furious_blink else R.drawable.companion_pixel_esposa_furious
        else -> if (blink) R.drawable.companion_pixel_esposa_happy_blink else R.drawable.companion_pixel_esposa_happy
      }
    } else {
      when (mood) {
        "uneasy" -> if (blink) R.drawable.companion_pixel_esposo_uneasy_blink else R.drawable.companion_pixel_esposo_uneasy
        "annoyed" -> if (blink) R.drawable.companion_pixel_esposo_annoyed_blink else R.drawable.companion_pixel_esposo_annoyed
        "angry" -> if (blink) R.drawable.companion_pixel_esposo_angry_blink else R.drawable.companion_pixel_esposo_angry
        "furious" -> if (blink) R.drawable.companion_pixel_esposo_furious_blink else R.drawable.companion_pixel_esposo_furious
        else -> if (blink) R.drawable.companion_pixel_esposo_happy_blink else R.drawable.companion_pixel_esposo_happy
      }
    }
  }

  private fun loadPixel(resId: Int): Bitmap? {
    val key = "res:$resId"
    bitmapCache[key]?.let { if (!it.isRecycled) return it }
    return try {
      val bitmap = BitmapFactory.decodeResource(service.resources, resId) ?: return null
      bitmapCache[key] = bitmap
      bitmap
    } catch (_: Exception) {
      null
    }
  }

  private fun photoBitmap(rawUri: String): Bitmap? {
    val path = try {
      val value = rawUri.trim()
      if (value.isEmpty()) return null
      if (value.startsWith("file:")) Uri.parse(value).path else value
    } catch (_: Exception) {
      null
    } ?: return null
    val file = File(path)
    if (!file.exists() || !file.canRead()) return null
    val key = "photo:${file.absolutePath}:${file.lastModified()}:${file.length()}"
    bitmapCache[key]?.let { if (!it.isRecycled) return it }
    return try {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.absolutePath, bounds)
      var sample = 1
      while (bounds.outWidth / (sample * 2) >= 256 && bounds.outHeight / (sample * 2) >= 256) sample *= 2
      val raw = BitmapFactory.decodeFile(file.absolutePath, BitmapFactory.Options().apply { inSampleSize = sample })
        ?: return null
      val side = min(raw.width, raw.height)
      if (side <= 0) return null
      val square = Bitmap.createBitmap(raw, (raw.width - side) / 2, (raw.height - side) / 2, side, side)
      if (square != raw) raw.recycle()
      if (bitmapCache.size > 28) bitmapCache.clear()
      bitmapCache[key] = square
      square
    } catch (_: Exception) {
      null
    }
  }

  private fun moodEmoji(mood: String): String = when (mood) {
    "furious" -> "😡"
    "angry" -> "😠"
    "annoyed" -> "😒"
    "uneasy" -> "😟"
    else -> "😊"
  }

  private fun moodColor(mood: String): Int = when (mood) {
    "furious" -> Color.parseColor("#A33B32")
    "angry" -> COLOR_DANGER
    "annoyed" -> Color.parseColor("#BA7544")
    "uneasy" -> Color.parseColor("#C4A35A")
    else -> COLOR_PRIMARY
  }

  private fun startMotion(
    host: View,
    image: ImageView,
    mood: String,
    photo: Boolean,
    open: Bitmap?,
    closed: Bitmap?
  ) {
    stopIdle()
    motionHost = host
    motionImage = image
    motionMood = mood
    motionPhoto = photo
    openBitmap = open
    closedBitmap = if (photo) null else closed
    val bob = if (mood == "furious" || mood == "angry") dp(2) else dp(3)
    floatAnim = ValueAnimator.ofFloat(0f, -bob.toFloat(), 0f, bob * 0.45f, 0f).apply {
      duration = if (mood == "furious") 780L else 2400L
      repeatCount = ValueAnimator.INFINITE
      interpolator = AccelerateDecelerateInterpolator()
      addUpdateListener { host.translationY = it.animatedValue as Float }
      start()
    }
    if (mood == "angry" || mood == "furious") {
      val kick = dp(2).toFloat()
      shakeAnim = ObjectAnimator.ofFloat(host, View.TRANSLATION_X, 0f, kick, -kick, kick * 0.4f, 0f).apply {
        duration = 420
        repeatCount = ValueAnimator.INFINITE
        startDelay = 700
        start()
      }
    }
    handler.postDelayed(blinkRunnable, 1500)
  }

  private fun stopIdle() {
    floatAnim?.cancel()
    floatAnim = null
    shakeAnim?.cancel()
    shakeAnim = null
    handler.removeCallbacks(blinkRunnable)
    handler.removeCallbacks(blinkBack)
    motionHost?.animate()?.cancel()
    motionHost?.translationX = 0f
    motionHost?.translationY = 0f
    motionHost?.scaleX = 1f
    motionHost?.scaleY = 1f
  }

  private fun stopMotion() {
    stopIdle()
    cancelSnap()
    motionHost = null
    motionImage = null
    openBitmap = null
    closedBitmap = null
  }

  private fun cancelSnap() {
    val running = snapAnim
    snapAnim = null
    running?.removeAllListeners()
    running?.cancel()
  }

  @SuppressLint("ClickableViewAccessibility")
  private fun enableDrag(
    handle: View,
    root: View,
    params: WindowManager.LayoutParams,
    windowWidth: Int,
    onTap: () -> Unit
  ) {
    var downX = 0f
    var downY = 0f
    var startX = 0
    var startY = 0
    var dragging = false
    handle.setOnTouchListener { v, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          stopIdle()
          cancelSnap()
          holdEvents(400)
          downX = event.rawX
          downY = event.rawY
          startX = params.x
          startY = params.y
          dragging = false
          v.animate().scaleX(0.92f).scaleY(0.92f).setDuration(80).start()
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - downX
          val dy = event.rawY - downY
          if (!dragging && (abs(dx) > touchSlop || abs(dy) > touchSlop)) dragging = true
          if (dragging) {
            holdEvents(350)
            params.x = (startX + dx).toInt()
            params.y = (startY + dy).toInt().coerceAtLeast(dp(8))
            avatarY = params.y
            safeUpdate(root, params)
          }
          true
        }
        MotionEvent.ACTION_UP -> {
          if (dragging) {
            v.animate().scaleX(1f).scaleY(1f).setDuration(80).start()
            val screenW = service.resources.displayMetrics.widthPixels
            val screenH = service.resources.displayMetrics.heightPixels
            sideRight = params.x + windowWidth / 2f >= screenW / 2f
            val maxY = (screenH - dp(80)).coerceAtLeast(dp(24))
            params.y = params.y.coerceIn(dp(24), maxY)
            avatarY = params.y
            snap(root, params, windowWidth)
          } else {
            onTap()
          }
          true
        }
        MotionEvent.ACTION_CANCEL -> {
          v.animate().scaleX(1f).scaleY(1f).setDuration(80).start()
          true
        }
        else -> false
      }
    }
  }

  private fun snap(root: View, params: WindowManager.LayoutParams, windowWidth: Int) {
    cancelSnap()
    holdEvents(500)
    val target = edgeX(windowWidth)
    val from = params.x
    if (from == target) {
      val host = motionHost
      val image = motionImage
      if (host != null && image != null) {
        startMotion(host, image, motionMood, motionPhoto, openBitmap, closedBitmap)
      }
      safeUpdate(root, params)
      return
    }
    snapAnim = ValueAnimator.ofInt(from, target).apply {
      duration = 180
      addUpdateListener {
        params.x = it.animatedValue as Int
        safeUpdate(root, params)
      }
      addListener(object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          if (snapAnim !== animation) return
          snapAnim = null
          val host = motionHost ?: return
          val image = motionImage ?: return
          startMotion(host, image, motionMood, motionPhoto, openBitmap, closedBitmap)
        }
      })
      start()
    }
  }

  private fun button(label: String, bg: Int, fg: Int, onClick: () -> Unit): TextView {
    return TextView(service).apply {
      text = label
      setTextColor(fg)
      textSize = 13f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      background = rounded(bg, dp(20).toFloat())
      setOnClickListener { onClick() }
    }
  }

  private fun input(hint: String, type: Int): EditText {
    return EditText(service).apply {
      this.hint = hint
      inputType = type
      textSize = 14f
      isSingleLine = true
      setTextColor(COLOR_INK)
      setHintTextColor(COLOR_MUTED)
      background = rounded(COLOR_BG, dp(12).toFloat(), COLOR_BORDER, dp(1))
      setPadding(dp(12), 0, dp(12), 0)
    }
  }

  private fun rounded(color: Int, radius: Float, stroke: Int? = null, strokeWidth: Int = 0) =
    GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = radius
      setColor(color)
      if (stroke != null) setStroke(strokeWidth, stroke)
    }

  private fun oval(color: Int, stroke: Int? = null, strokeWidth: Int = 0) =
    GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(color)
      if (stroke != null) setStroke(strokeWidth, stroke)
    }

  private fun toast(message: String) {
    handler.post { Toast.makeText(service, message, Toast.LENGTH_SHORT).show() }
  }

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), service.resources.displayMetrics).toInt()

  /** The little triangle that makes the card read as a speech bubble. */
  private class TailView(
    context: Context,
    private val fill: Int,
    private val stroke: Int,
    private val strokeWidth: Float,
    private val pointRight: Boolean
  ) : View(context) {
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = fill; style = Paint.Style.FILL }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = stroke
      style = Paint.Style.STROKE
      this.strokeWidth = this@TailView.strokeWidth
      strokeJoin = Paint.Join.ROUND
    }

    override fun onDraw(canvas: Canvas) {
      val w = width.toFloat()
      val h = height.toFloat()
      val path = Path().apply {
        if (pointRight) {
          moveTo(0f, 0f)
          lineTo(w, h / 2f)
          lineTo(0f, h)
        } else {
          moveTo(w, 0f)
          lineTo(0f, h / 2f)
          lineTo(w, h)
        }
        close()
      }
      canvas.drawPath(path, fillPaint)
      if (pointRight) {
        canvas.drawLine(0f, 0f, w, h / 2f, strokePaint)
        canvas.drawLine(w, h / 2f, 0f, h, strokePaint)
      } else {
        canvas.drawLine(w, 0f, 0f, h / 2f, strokePaint)
        canvas.drawLine(0f, h / 2f, w, h, strokePaint)
      }
    }
  }

  companion object {
    private val COLOR_PRIMARY = Color.parseColor("#244D3B")
    private val COLOR_LIME = Color.parseColor("#D9EDAB")
    private val COLOR_SOFT = Color.parseColor("#ECF2E6")
    private val COLOR_BG = Color.parseColor("#F7F8F4")
    private val COLOR_BORDER = Color.parseColor("#E0E5DA")
    private val COLOR_MUTED = Color.parseColor("#7B857E")
    private val COLOR_INK = Color.parseColor("#223C31")
    private val COLOR_DANGER = Color.parseColor("#BD6655")
  }
}

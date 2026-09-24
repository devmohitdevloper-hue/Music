package com.music.bitchord.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.music.bitchord.R

// Apple Music's signature red. No longer the primary accent, but kept for the
// spots (Replay's rank badge) that want that specific red regardless of theme.
val AccentRed = Color(0xFFFA2D48)

val KudMint = Color(0xFFB7F77A)
val KudInk = Color(0xFF101813)

private val DarkColors = darkColorScheme(
    primary = KudMint, onPrimary = KudInk,
    primaryContainer = Color(0xFF29452E), onPrimaryContainer = Color(0xFFD9FBC4),
    secondary = Color(0xFF82D9CA), onSecondary = Color(0xFF072E28),
    secondaryContainer = Color(0xFF20473E), onSecondaryContainer = Color(0xFFB3F1E2),
    tertiary = Color(0xFFE9C596), onTertiary = Color(0xFF382A15),
    background = Color(0xFF101513), onBackground = Color(0xFFF3F5EE),
    surface = Color(0xFF19211D), onSurface = Color(0xFFF3F5EE),
    surfaceVariant = Color(0xFF26322B), onSurfaceVariant = Color(0xFFB2BEB5),
    surfaceContainer = Color(0xFF1D2821), surfaceContainerHigh = Color(0xFF29362D),
    outline = Color(0xFF536459), outlineVariant = Color(0xFF334239),
    error = Color(0xFFFFB4AB), onError = Color(0xFF690005),
)

private val LightColors = lightColorScheme(
    primary = Color(0xFF32652A), onPrimary = Color.White,
    primaryContainer = Color(0xFFD0EFBC), onPrimaryContainer = Color(0xFF173313),
    secondary = Color(0xFF25695D), onSecondary = Color.White,
    secondaryContainer = Color(0xFFBDEBDD), onSecondaryContainer = Color(0xFF072E28),
    tertiary = Color(0xFF78582F), onTertiary = Color.White,
    background = Color(0xFFF4F6EE), onBackground = KudInk,
    surface = Color(0xFFFCFDF7), onSurface = KudInk,
    surfaceVariant = Color(0xFFE1E8DC), onSurfaceVariant = Color(0xFF4C5B50),
    surfaceContainer = Color(0xFFEAF0E3), surfaceContainerHigh = Color(0xFFDFE7D7),
    outline = Color(0xFF75836F), outlineVariant = Color(0xFFC4D0BE),
)

/**
 * SF Pro Display, the face Apple Music itself is set in. Only the weights the
 * type scale actually asks for are bundled; Compose synthesises nothing, so a
 * missing weight would silently fall back to the nearest one shipped.
 */
val SFProDisplay = FontFamily(
    Font(R.font.sf_pro_display_regular, FontWeight.W400),
    Font(R.font.sf_pro_display_medium, FontWeight.W500),
    Font(R.font.sf_pro_display_semibold, FontWeight.W600),
    Font(R.font.sf_pro_display_bold, FontWeight.W700),
    Font(R.font.sf_pro_display_heavy, FontWeight.W800),
)

// Heavy, tight typography — the backbone of the Apple Music look.
private val BitChordTypography = Typography(
    displayLarge = TextStyle(fontWeight = FontWeight.W800, fontSize = 36.sp, letterSpacing = (-0.8).sp),
    headlineLarge = TextStyle(fontWeight = FontWeight.W800, fontSize = 32.sp, letterSpacing = (-0.7).sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.W700, fontSize = 22.sp, letterSpacing = (-0.4).sp),
    titleLarge = TextStyle(fontWeight = FontWeight.W700, fontSize = 20.sp, letterSpacing = (-0.3).sp),
    titleMedium = TextStyle(fontWeight = FontWeight.W600, fontSize = 16.sp, letterSpacing = (-0.2).sp),
    bodyLarge = TextStyle(fontWeight = FontWeight.W400, fontSize = 16.sp),
    bodyMedium = TextStyle(fontWeight = FontWeight.W400, fontSize = 14.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.W600, fontSize = 12.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.W600, fontSize = 11.sp),
).withFamily(FontFamily.SansSerif)

/** Applies [family] to every style in the scale, so nothing is left on Roboto. */
private fun Typography.withFamily(family: FontFamily) = Typography(
    displayLarge = displayLarge.copy(fontFamily = family),
    displayMedium = displayMedium.copy(fontFamily = family),
    displaySmall = displaySmall.copy(fontFamily = family),
    headlineLarge = headlineLarge.copy(fontFamily = family),
    headlineMedium = headlineMedium.copy(fontFamily = family),
    headlineSmall = headlineSmall.copy(fontFamily = family),
    titleLarge = titleLarge.copy(fontFamily = family),
    titleMedium = titleMedium.copy(fontFamily = family),
    titleSmall = titleSmall.copy(fontFamily = family),
    bodyLarge = bodyLarge.copy(fontFamily = family),
    bodyMedium = bodyMedium.copy(fontFamily = family),
    bodySmall = bodySmall.copy(fontFamily = family),
    labelLarge = labelLarge.copy(fontFamily = family),
    labelMedium = labelMedium.copy(fontFamily = family),
    labelSmall = labelSmall.copy(fontFamily = family),
)

@Composable
fun BitChordTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = BitChordTypography,
        content = content,
    )
}

/**
 * Draws the status and navigation bar glyphs dark or light.
 *
 * `enableEdgeToEdge()` decides this from the *system* dark-mode setting, which
 * is the wrong input the moment the in-app theme disagrees with it: Light theme
 * on a phone in dark mode left white icons on a white bar, invisible. The bars
 * have to follow the theme the app is actually painting — with one exception,
 * the player, which is dark artwork regardless and so always wants light
 * glyphs. Hence a parameter rather than reading the theme here.
 */
@Composable
fun SystemBarIcons(dark: Boolean) {
    val view = LocalView.current
    if (view.isInEditMode) return
    val window = findWindow(view) ?: return
    SideEffect {
        WindowCompat.getInsetsController(window, view).apply {
            isAppearanceLightStatusBars = dark
            isAppearanceLightNavigationBars = dark
        }
    }
}

// Walks up the Compose view hierarchy to find a DialogWindowProvider (e.g. modal player) before falling back to Activity context.
private fun findWindow(view: android.view.View): android.view.Window? {
    var parent = view.parent
    while (parent != null) {
        if (parent is androidx.compose.ui.window.DialogWindowProvider) {
            return parent.window
        }
        parent = parent.parent
    }
    var context = view.context
    while (context is android.content.ContextWrapper) {
        if (context is Activity) {
            return context.window
        }
        context = context.baseContext
    }
    return null
}


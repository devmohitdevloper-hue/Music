package com.music.bitchord.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.music.bitchord.R
import com.music.bitchord.ui.theme.KudMint

/** Shared editorial header. Text wraps rather than clipping at larger font scales. */
@Composable
fun KudPageHeader(eyebrow: String, title: String, subtitle: String) {
    Column(Modifier.fillMaxWidth().padding(horizontal = PAGE_GUTTER).padding(top = 8.dp, bottom = 22.dp)) {
        Text(eyebrow, style = MaterialTheme.typography.labelSmall,
            letterSpacing = 2.sp, color = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.height(10.dp))
        Text(title, style = MaterialTheme.typography.displayLarge,
            color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(8.dp))
        Text(subtitle, style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun KudMoodShortcuts(onSelect: (String) -> Unit) {
    val choices = listOf(
        stringResource(R.string.kud_mood_hindi) to "Hindi hits",
        stringResource(R.string.kud_mood_chill) to "lofi chill",
        stringResource(R.string.kud_mood_devotional) to "Hindi bhajan",
        stringResource(R.string.kud_mood_energy) to "workout music",
    )
    LazyRow(contentPadding = PaddingValues(horizontal = PAGE_GUTTER),
        horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 18.dp)) {
        items(choices.size) { index ->
            val (label, query) = choices[index]
            Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh,
                modifier = Modifier.clip(RoundedCornerShape(14.dp)).clickable { onSelect(query) }) {
                Text(label, modifier = Modifier.heightIn(min = 48.dp).padding(horizontal = 18.dp, vertical = 14.dp),
                    style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
fun KudBrowseGrid(onSelect: (String) -> Unit) {
    val labels = listOf(
        stringResource(R.string.kud_mood_hindi), stringResource(R.string.kud_mood_chill),
        stringResource(R.string.kud_mood_devotional), stringResource(R.string.kud_mood_energy),
        stringResource(R.string.kud_mood_romance), stringResource(R.string.kud_mood_classics),
    )
    val queries = listOf("Hindi hits", "lofi chill", "Hindi bhajan", "workout music", "Hindi romantic songs", "Hindi old songs")
    val colors = listOf(Color(0xFF335542), Color(0xFF354A63), Color(0xFF695135),
        Color(0xFF5A3D5C), Color(0xFF6A3C45), Color(0xFF3A5860))
    Column(Modifier.padding(PAGE_GUTTER), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(stringResource(R.string.kud_browse_moods), style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(bottom = 4.dp))
        (0 until 3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                (0 until 2).forEach { column ->
                    val i = row * 2 + column
                    Box(Modifier.weight(1f).heightIn(min = 126.dp).clip(RoundedCornerShape(22.dp))
                        .background(Brush.linearGradient(listOf(colors[i], colors[i].copy(alpha = 0.65f))))
                        .clickable { onSelect(queries[i]) }.padding(16.dp)) {
                        Column {
                            Text(labels[i], style = MaterialTheme.typography.titleMedium, color = Color.White,
                                fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(24.dp))
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Canvas(Modifier.weight(1f).height(24.dp)) {
                                    val heights = listOf(.3f,.7f,.45f,1f,.6f,.85f,.4f)
                                    heights.forEachIndexed { n, h ->
                                        val x = n * 9.dp.toPx() + 2.dp.toPx()
                                        drawLine(KudMint.copy(alpha = .75f), Offset(x, size.height*(1-h)/2),
                                            Offset(x, size.height*(1+h)/2), 3.dp.toPx(), StrokeCap.Round)
                                    }
                                }
                                Icon(Icons.Rounded.ArrowForward, null, tint = Color.White, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun KudLibraryActions(onDownloads: () -> Unit, onNewPlaylist: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = PAGE_GUTTER).padding(bottom = 22.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        FilledTonalButton(onClick = onDownloads, modifier = Modifier.weight(1f).heightIn(min = 54.dp),
            shape = RoundedCornerShape(16.dp), contentPadding = PaddingValues(12.dp)) {
            Icon(Icons.Rounded.Download, null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(6.dp))
            Text(stringResource(R.string.downloads), maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        Button(onClick = onNewPlaylist, modifier = Modifier.weight(1f).heightIn(min = 54.dp),
            shape = RoundedCornerShape(16.dp), contentPadding = PaddingValues(12.dp)) {
            Icon(Icons.Rounded.Add, null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(6.dp))
            Text(stringResource(R.string.new_playlist), maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

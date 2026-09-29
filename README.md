# Movie Sansar v10

Android 8+ app for the Movies and Web Series interface, with cached TMDB metadata and local WebView assets.

- Server 2 uses season and episode path segments. Changing episodes replaces the player frame to discard stale provider state.
- All orientations retain bottom navigation; landscape categories wrap. Library stores visited episodes and captures/resumes HTML5 video progress when the provider exposes a compatible video element.
- Native WebView blocks new windows, external top-level navigation, dialogs, permissions and known ad hosts, including service-worker requests. Embedded documents receive an early popup/link/ad-overlay guard.
- Each APK bundles the StevenBlack hosts list plus observed player ad domains. Upstream attribution, license and snapshot SHA-256 are included in assets.
- Study/Music, the app's timed fake loader and fake download links remain removed.

## Build and checks

GitHub Actions produces **Movie-Sansar-v10-APK** and **Movie-Sansar-v10-Layout-Checks** artifacts. It checks request caching, four viewport layouts, episode changes, history/resume, popup/link suppression and both top season/episode selectors; separately it records live provider behavior. A successful build does not mean every external stream is available.

Local build: JDK 17, Gradle 8.9, Android SDK 35. Run `python3 scripts/update-ad-filter.py`, then `gradle -p android assembleDebug`. The CI workflow reuses the cached v8 debug signing key for in-place upgrades. Release/store signing is not configured.

## Limits

The APK cannot guarantee removal of every future advertisement, especially ads embedded in video itself or newly introduced same-origin ads. Provider availability, protection challenges, codec support and network speed can affect playback. Live Chromium tests model native host filtering; they are not physical Android-device testing. No new provider is considered faster without a successful playback comparison.

Earlier repository content remains available in Git history.

Experimental candidates were checked separately. VidLink and VidSrc refused the protected iframe; FilmU, EzVidAPI and VidCore failed to load in the test environment. These incompatible candidates are not enabled in this APK. Diagnostic scripts remain in the repository.

## v10 theme and experimental players

Server 2 receives the selected accent through its supported `color` parameter. Document-start guards update its CSS accent and contrast when the app theme changes, without reloading or resetting playback.

The server menu has an Experimental / Testing group with VidZee and NHD. Neither is selected automatically for a new title. Both use the same popup sandbox, native host filtering and history bridge. VidZee played a movie and TV episode in Chromium integration tests. NHD played the TV episode, but the tested movie failed in its upstream source; it remains an explicitly experimental backup. No universal fastest/ad-free claim is made.

Provider references: https://vidzee.wtf/ and https://nhdapi.st/docs . The first candidates (Stellar, VidPhantom and Peestream) did not meet the playback checks.

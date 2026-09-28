# Movie Sansar v7

Movies and web series app with local Android WebView assets, cached TMDB metadata, restricted player pop-ups and known ad-domain blocking.

- Study/Music sections and app-owned player loading overlay removed.
- Android 8+; no advertising SDKs; only Internet permission.
- Third-party player availability and same-origin/video ads are outside the app’s full control.

## Build
GitHub Actions builds an installable signed debug APK and checks its signature and bundled assets. Download **Movie-Sansar-v7-APK** from the latest successful run.

Local: JDK 17, Gradle 8.9, SDK 35; run `gradle -p android assembleDebug`.

The old KUD Music project was replaced at the owner’s request. Earlier commits retain its history.

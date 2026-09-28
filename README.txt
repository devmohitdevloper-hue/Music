Movie Sansar v7 — Movies + Web Series

स्थिति / STATUS
यह revised website source + Android project है, compiled APK नहीं।
इस environment में Android SDK/JDK compiler/Gradle उपलब्ध नहीं थे। SDK download
सफल नहीं हुआ और package installation permissions के कारण विफल हुई।
Android compilation, device playback और real third-party ad blocking UNVERIFIED हैं।
Browser rendering भी नहीं जाँची जा सकी: browser binary उपलब्ध नहीं थी।

बदलाव
- Study और Music की pages, scripts, styles और दोनों navigation links हटाए।
- Series का API result-shape bug ठीक; Movies/Series एक catalog renderer उपयोग करते हैं।
- Player का app-owned loading overlay और forced 9-second timer हटाया।
- Metadata से पहले player शुरू; उसी URL पर अनावश्यक reload रोका।
- Fake download (जो बाहर player खोलता था) हटाया।
- Popup/top-navigation permissions iframe sandbox में बंद।
- Placeholder TMDB IDs और first-load title-enrichment request burst हटाए।
- API cache: 10 minutes fresh; error पर maximum 24-hour stale cache;
  80 entries; in-flight requests deduplicated.
- Direct API तुरंत; primary fallback 900ms बाद; पहली सफल response उपयोग होती है,
  बाकी requests abort होती हैं। Generic backup proxies primary proxy fail होने पर ही।
- Smaller poster/backdrop images; lazy image decode; no card stagger delay;
  hidden screen पर hero timer बंद; stale pagination responses ignore.
- Configured न होने वाला third server विकल्प छिपाया।

AD BLOCKING की सीमा
Website में sandbox popup/new-tab/top-page navigation रोकता है।
Android wrapper known ad domains (ad-hosts.txt) की requests block करता है,
new windows और external main-page navigation रोकता है; JS alert/confirm/prompt बंद।
Remote iframe के same-origin ads, video में embedded ads और नए ad domains का
100% removal guaranteed नहीं है। कुछ providers blocking पर playback रोक सकते हैं।
ऐसी स्थिति में दूसरा server चुनें। App का fake loader हटाया है; remote provider का
अपना loading UI, buffering और server delays हमारे control में नहीं हैं।
TMDB केवल metadata देता है, video streams नहीं। कोई नया stream source नहीं जोड़ा।

APK कैसे बनाएँ — GitHub Actions
1. इस ZIP का पूरा content अपने GitHub repo की root में रखें।
   android/, js/, css/, HTML और .github/workflows/build-apk.yml सब upload हों।
   Files को एक extra Movie-Sansar subfolder के अंदर न रखें।
2. GitHub > Actions > Build Movie Sansar APK > Run workflow.
3. Successful run > Artifacts > Movie-Sansar-v7-APK डाउनलोड करें।
4. Artifact ZIP extract करने पर app-debug.apk मिलेगा। वही फोन पर install करें।
यह Android 8+ के लिए personally installable debug APK बनाता है, Play Store release नहीं।
Standard debug key build runner पर बनती है। अलग runner के build की signing key बदल सकती
है; इसलिए update install fail हो सकता है। Stable distribution के लिए अपनी permanent
release keystore जोड़ें। Uninstall करने पर saved titles/cache मिटेंगे।

Android Studio
android/ folder खोलें। JDK 17, Gradle 8.9, Android SDK 35 और Build Tools 35.0.0 चाहिए।
इस package में Gradle wrapper binary नहीं है। Installed Gradle के साथ:
  gradle -p android assembleDebug
Output: android/app/build/outputs/apk/debug/app-debug.apk
Web assets build के समय automatically root website से copy होते हैं।

Website preview
Root folder में local HTTP server चलाएँ और movies.html खोलें।
  python -m http.server 8080
  http://localhost:8080/movies.html
HTML खोलना और native APK ad filtering अलग हैं। Native request blocker केवल APK में है।

Validation performed
- Node syntax checks: common.js, movies.js, watch.js.
- Isolated runtime tests using mocked fetch/minimal DOM: dedup, cache, delayed fallback
  cancellation, fallback winning before direct timeout, all requests failing,
  removed navigation, immediate playback, sandbox, episode and server changes.
- Local HTML dependency checks and Android XML parsing.
No live latency benchmark or actual ad-free playback claim is made.

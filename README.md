# KUD Music

An Android music app customized for Ashutosh, built on the open-source BitChord project.

## Version 2.0 redesign

- Charcoal and mint palette, with a matching light theme.
- KUD launcher icon, wordmark, app label and distinct package identity.
- Editorial Home with functional mood searches and wide artwork cards.
- Search mood tiles, Library action buttons and a four-tab navigation dock.
- Rounded mini player and mint play/pause control.
- English and Hindi text for the new screens.

Build: `bash gradlew :app:assembleDevDebug`. The GitHub Actions workflow creates installable APKs and performs emulator smoke checks.

The new package is `com.kud.music.dev`; it installs alongside the previous BitChord Dev app. Existing app data is not migrated. This is a debug/test build, not a Play Store release. Music availability still depends on the underlying providers.

## Credits and license

Based on [BitChord](https://github.com/kushagrasinghx/BitChord) by Kushagra Singh and contributors, at commit `42712cb7c1c0632c4bda54558d65a7016b5ce790`. Original source and attribution are retained. Distributed under GPLv3; see LICENSE. KUD customization changes the branding and interface and does not claim authorship of the original music engine.

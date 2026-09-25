# KUD Music Web

A responsive browser edition of KUD Music using separate HTML, CSS and vanilla JavaScript files. No build tools or API key required.

## Run

Open `dist/index.html` in a browser, or serve the folder:

```sh
python -m http.server 8080 --directory dist
```

Visit http://localhost:8080. Upload the three files in `dist/` to any static web host, keeping their relative paths.

## Features

- Automatic Hindi music discovery and song/artist search through the iTunes Search API (India catalogue).
- Streamed promotional previews, artwork, attribution and direct iTunes purchase links. Previews are not full tracks and are not downloaded or cached.
- Full playback of user-selected local audio files, previous/next, shuffle, local-track repeat, volume and seeking.
- Favourites in this browser's localStorage; local files remain only for the current page session.
- Responsive desktop sidebar and mobile bottom navigation, queue, keyboard controls, accessible labels and loading/error/empty states.

## Limits

This is a browser adaptation, not a Kotlin-to-JavaScript compilation. Android YouTube extraction, Google account synchronization, native downloads and background services are not included. Catalogue availability, preview lengths and supported audio formats depend on the provider/browser. Remote playback requires internet; local file selection does not upload files. This website does not provide a licensed full-song streaming catalogue. Adding one requires an authorized provider and its supported authentication/backend.

Online preview documentation: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html

## Files

- `dist/index.html`: page structure and controls
- `dist/styles.css`: charcoal/mint responsive design
- `dist/app.js`: catalogue, player, queue and local favourites

Optional browser WebMCP `search_music` tool is feature-detected. It uses the same search action as the visible form.

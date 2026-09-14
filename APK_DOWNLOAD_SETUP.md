# PORTGO Mobile Install / APK Download Button

The public PORTGO top bar and the admin top bar now include a download/install icon.

## What happens when a phone taps the icon

1. If Chrome/Android exposes the native PWA install prompt, PORTGO opens that prompt first. This installs PORTGO to the phone/home screen directly.
2. If the native install prompt is not available, PORTGO checks for a downloadable APK.
3. If an APK is configured, the browser downloads it.

Android always requires the user to confirm installation of a downloaded APK. A website cannot silently install an APK.

## Make the fallback APK download available

Use either option below.

### Option A — bundle the APK with PORTGO

1. Build the Android APK.
2. Rename it to `PortGo.apk`.
3. Put it at:

   `frontend/public/downloads/PortGo.apk`

4. Commit and push to GitHub.
5. Railway redeploys. Vite copies it to the production `dist/downloads` folder automatically.

### Option B — host the APK elsewhere

Upload `PortGo.apk` to a GitHub Release or another direct HTTPS download host and add this Railway variable:

```env
APK_DOWNLOAD_URL=https://your-host.example/PortGo.apk
```

Redeploy PORTGO after saving the variable.

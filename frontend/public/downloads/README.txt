PORTGO Android APK download folder
==================================

To make the top-bar download icon serve the APK directly from Railway:

1. Build your Android APK and name it exactly: PortGo.apk
2. Put it in this folder:
   frontend/public/downloads/PortGo.apk
3. Commit and push it to GitHub.
4. Railway rebuilds the Vite app and copies this folder into frontend/dist/downloads.

Alternative: keep the APK on a GitHub Release or another HTTPS host and set this
Railway variable instead:

APK_DOWNLOAD_URL=https://your-download-host.example/PortGo.apk

Android will download the APK when the top-bar icon is tapped. For security,
Android still requires the user to confirm installation manually.

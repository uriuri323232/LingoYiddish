# Yiddish Offline (Expo / React Native)
אפליקציה ללימוד יידיש בלי חיבור לאינטרנט: כרטיסיות, חזרה חכמה, חידון, זיווג וחיפוש.
כל המילים נמצאות ב-`vocabulary.json` (שדות: `c` קטגוריה, `y` יידיש, `t` תעתיק, `h` עברית).

    npm install
    npx expo start --android

הוספת מילים: מוסיפים שורה ל-`vocabulary.json`. הקטגוריות מוגדרות במערך `CATS` בתחילת `App.js`.

## בניית APK ב-GitHub
דחיפה ל-`main` (או הרצה ידנית מלשונית Actions) מפעילה את `main.yml`. בסיום מורידים את `yiddish-offline-apk` מה-Artifacts ומתקינים את `app-release.apk`.

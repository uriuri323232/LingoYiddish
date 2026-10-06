# Yiddish Offline (Expo / React Native)
Fully offline Yiddish learner: flashcards, quiz, search. All data lives in `data/vocabulary.json` (fields: `c` category, `y` Yiddish, `t` transliteration, `h` Hebrew).

    npm install
    npx expo start --android      # run on device/emulator via Expo Go

Add words by appending lines to `data/vocabulary.json`. Categories: greetings, daily, food, family, numbers, verbs.

## Build an APK on GitHub
Push to `main` (or run the workflow manually from the Actions tab). When it finishes, download `yiddish-offline-apk` from the run's Artifacts, unzip it and install `app-release.apk` on the phone.

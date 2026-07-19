# Android reference — Sentence Lab custom word generation

There's no Android project in this repo (only `memcab-angular`), so these files aren't
wired into a buildable module. They're a complete, self-contained reference for the
Sentence Lab upgrade described in the request — copy what you need into your real
Android project and adjust package/resource names to match.

## Files

```
app/src/main/java/com/memcab/app/
  sentence/SentenceLabActivity.java   activity: input capture, network call, render, save
  network/SentenceApiService.java     Retrofit interface — POST /api/sentence
  network/RetrofitClient.java         OkHttp + Retrofit singleton (set BASE_URL)
  network/model/SentenceRequest.java  { term }
  network/model/SentenceResponse.java { thai, romanization, partOfSpeech, sentenceThai, sentenceRomanization, sentenceEnglish }
  data/Deck.java, DeckWord.java       mirror Folder/Word from src/app/core/models.ts
  data/DeckRepository.java           interface — swap in your real deck storage here
  data/SharedPreferencesDeckRepository.java  working default (JSON in SharedPreferences)

app/src/main/res/
  layout/activity_sentence_lab.xml   full screen layout (custom input + result stage)
  layout/item_word_chip.xml          placeholder for the existing chip list item
  drawable/bg_card_surface.xml       rounded card background (18dp, --hairline stroke)
  drawable/bg_error_coral_tint.xml   rounded error banner background
  values/colors_sentence_lab.xml     color tokens matching the web app's design tokens
```

## Gradle dependencies

Add whatever's missing from your `app/build.gradle`:

```gradle
dependencies {
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.recyclerview:recyclerview:1.3.2'
}
```

Also add the internet permission if it isn't already in your manifest:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## What you'll need to wire up yourself

- **`RetrofitClient.BASE_URL`** — points at a placeholder (`https://api.memcab.app/`).
  Point it at whatever actually serves `POST /api/sentence`, matching the JSON contract
  in `SentenceResponse`/the prompt built in `sentence.service.ts`'s `generateCustom()`.
- **`DeckRepository`** — `SharedPreferencesDeckRepository` is a real, working default
  (stores JSON under a `memcab_folders` key, same shape as the web app's localStorage
  format), but if your app already has deck persistence (Room, a backend, etc.), implement
  `DeckRepository` against that instead and swap it into `SentenceLabActivity.onCreate()`.
- **"EXISTING SCREEN CONTENT" section in the layout** — a minimal stand-in for whatever
  Sentence Lab already renders for preset words. Merge the "NEW: CUSTOM WORD GENERATION"
  block above it into your real `activity_sentence_lab.xml`.

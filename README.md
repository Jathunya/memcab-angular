<div align="center">

<img src="public/memcab-logo.svg" width="72" height="72" alt="Memcab logo" />

# memcab

### *Mem*ory + Voca*b*ulary — a cozy, zoneless Thai ⇄ English learning studio

<p>
  <img src="https://img.shields.io/badge/Angular-21.2-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular 21.2" />
  <img src="https://img.shields.io/badge/Change_Detection-Zoneless-0b6e6a?style=for-the-badge&logo=angular&logoColor=white" alt="Zoneless" />
  <img src="https://img.shields.io/badge/State-Signals--Driven-10a19a?style=for-the-badge" alt="Signals-driven state" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=white" alt="Firebase Auth" />
  <img src="https://img.shields.io/badge/License-MIT-6b7c7b?style=for-the-badge" alt="MIT License" />
</p>

<p>
  <a href="https://memcab-angular.vercel.app"><strong>🚀 Live Demo</strong></a>
</p>

<!-- 🖼️ Drop a hero screenshot or GIF of the Home / Daily Review screen here -->
<!-- ![Memcab hero screenshot](./docs/hero.png) -->

</div>

---

## ✨ What is Memcab?

**Memcab** is a fully responsive Thai ⇄ English vocabulary trainer built to attack a very specific problem: the **forgetting curve**. Most vocabulary apps let you *add* words; very few are engineered to make sure you actually *keep* them.

Memcab pairs a confidence-based review loop with four bite-sized recall games and an AI sentence generator, wrapped in a warm, neumorphic-inspired interface that feels equally at home on a phone during a commute or a widescreen desktop during a study session. Under the hood, it's an exercise in **modern, zoneless Angular architecture** — no Zone.js, no `NgZone` patching, no wasted render cycles. Every pixel that updates on screen does so because a `Signal` it depends on actually changed.

---

## 🧩 Core Features & UX Decisions

### 🎴 Daily Review — Confidence-Based Spaced Repetition

The heart of the app. Each session pulls the words that aren't yet **Mastered** into a flippable flashcard deck, and lets the learner self-report how well they knew each one:

| Grade | Effect on mastery state | Points awarded |
|:--|:--|:--:|
| **Again** | Resets to `Learning` and is immediately re-queued for another pass in the *same* session | +1 |
| **Good** | `New → Learning`, or `Learning → Mastered` | +3 |
| **Easy** | Jumps straight to `Mastered` | +5 |

This is a **Leitner-box-inspired, three-state confidence model** (`New → Learning → Mastered`) rather than a full interval-scheduling algorithm — a deliberate scope decision. It captures the core spaced-repetition insight (self-assessed confidence should drive review frequency, and "Again" cards should resurface *before* you leave the session, not days later) while keeping the state machine trivially easy to reason about, test, and extend. A natural next iteration is layering true per-word due-dates (SM-2 style, with an Easiness Factor) on top of this same mastery signal.

### 🎮 Interactive Game Hub

Four recall modes, each targeting a different retrieval pathway so vocabulary gets reinforced from multiple angles instead of rote repetition:

- **Word Match** — grid-based tap-to-pair recall between Thai and English
- **Speed Quiz** — timed multiple-choice, optimized for rapid visual recognition
- **Type It** — free-text spelling practice from meaning + hint
- **Word Scramble** — tactile letter-tile reconstruction of the English spelling

Every mode is deck-aware and gracefully guards against under-populated decks (each mode declares a `minWords` threshold and prompts the user to add more vocabulary rather than rendering a broken game).

### 🧠 AI-Powered Sentence Lab

A context-first alternative to flashcard drilling: type any English word, and Memcab calls out to an LLM (Groq's OpenAI-compatible chat completions API) to generate a natural Thai sentence using that word, complete with pronunciation and part-of-speech tagging. Newly discovered words save straight into a custom deck with one tap — closing the loop between *encountering* a word in context and *owning* it for review.

The feature runs on a **bring-your-own-API-key (BYOK)** model: the key is supplied and stored client-side by the learner, keeping the app's own infrastructure footprint at zero while remaining fully functional out of the box.

### 🌗 Smart Theme Engine

Light and dark mode aren't a `filter: invert()` afterthought — they're two fully-designed palettes sharing one CSS custom-property contract:

- **☀️ Warm Cream** (`#f7f3ec` canvas, soft neumorphic dual-shadow system) for daytime study sessions
- **🌙 Charcoal Slate** (`#0f172a` canvas, flattened shadow system tuned for OLED contrast) for low-light use

Every component reads color through semantic tokens (`--bg`, `--surface`, `--ink`, `--teal`, `--coral`, …) redefined per theme — never a hardcoded hex — so the entire UI repaints atomically on toggle with zero per-component theme logic.

---

## 🏗️ Technical Architecture & Engineering Decisions

### ⚡ Zoneless Angular, 100% Signals

Memcab ships with **no `zone.js` in the bundle at all.** Change detection isn't driven by monkey-patched `setTimeout`/`addEventListener`/`Promise` hooks that force Angular to walk the *entire* component tree on every async tick — it's driven by fine-grained `Signal` reads and writes.

**Why this matters in practice:**

- **Targeted, near-constant-time DOM updates.** When a signal changes, Angular schedules change detection only for the components that actually *read* that signal — not a global tree walk. A click in a modal doesn't cost a re-check of the sidebar, the game hub, and every route that isn't even mounted.
- **Zero incidental re-renders.** Because reactivity is explicit (`signal()`, `computed()`, `effect()`), there's no class of bugs where an unrelated async callback silently triggers a full-app CD pass.
- **Leaner runtime, smaller bundle.** Dropping Zone.js removes a non-trivial chunk of patched-global overhead and one of the more infamous sources of "why did this re-render?" debugging sessions.
- **Async-safe by construction.** Even Firebase's callback-style `onAuthStateChanged` API integrates cleanly — writing into a signal inside the callback is enough to trigger exactly the right UI updates, with no `NgZone.run()` wrapper required.

### 📱 Responsive Layout Transformation

Memcab doesn't just reflow at `768px` — it **re-architects the navigation model** for the input method at hand:

| | Desktop (≥ 768px) | Mobile (< 768px) |
|:--|:--|:--|
| **Primary nav** | Fixed vertical sidebar, grouped by *Learn / Play / Build / Track*, with Settings auto-anchored to the bottom | Collapses into a 5-item **bottom navigation bar** sized for thumb-reach |
| **Settings tabs** | Stacked vertical tab list alongside the content pane | Becomes a **swipeable, horizontally-scrollable pill nav** (`overflow-x: auto` + hidden scrollbar) so long tab labels never clip or squeeze |
| **Account menu** | Popover anchored to the avatar | Routes straight into the Settings → Account tab, since a hover-style popover doesn't translate to touch |

This isn't one layout squeezed to fit — it's two purpose-built navigation systems sharing one component tree via CSS custom properties and Angular's `@if`/media-query pairing.

### 🎯 Tactile Micro-Feedback

Small, physical-feeling responses to every interaction, tuned with `cubic-bezier` spring-style easing rather than linear transitions:

- **Flashcards** transition faces inside a `perspective`-primed card stage with a cross-fade, giving the flip weight without the jank of a literal 3D rotation on lower-end devices
- **Spring scale** on hover/press across buttons, nav pills, and cards (`scale(1.05)` on hover, `scale(0.96)` + a slight lift on press) for tactile confirmation
- **Slide-in banners** (`cubic-bezier(0.16, 1, 0.3, 1)`) for success/error states, so feedback arrives with motion instead of an abrupt pop-in

---

## 🗃️ Data Modeling

Clean, narrow interfaces — every field earns its place. A `Word` is intentionally decoupled from any single deck, so the same word shape powers the core vocabulary set, custom decks, and AI-generated Sentence Lab results identically:

```typescript
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'phrase' | 'adverb';
export type MasteryStatus = 'new' | 'learning' | 'mastered';

export interface Word {
  id: string;
  word: string;              // Thai
  translation: string;       // English
  pronunciation?: string;    // IPA / phonetic hint, paired with `translation`
  partOfSpeech: PartOfSpeech;
  customNote?: string;       // e.g. an AI-generated example sentence
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  words: Word[];
}

export interface Progress {
  mastery: Record<string, MasteryStatus>;   // word id → confidence state
  bests: Partial<Record<GameMode, GameBest>>;
  streak: number;
  points: number;
  reviewedToday: number;
  lastReviewDate: string | null;            // yyyy-mm-dd
}
```

---

## 🚀 Installation & Setup

```bash
# 1. Clone the repository
git clone [YOUR_GITHUB_LINK]
cd memcab-angular

# 2. Install dependencies
npm install

# 3. Run the development server
npm start
# — or —
ng serve

# 4. Open the app
# http://localhost:4200
```

> **Note:** Sentence Lab requires a Groq API key, entered by the learner on first use (stored client-side). Authentication runs on Firebase — set your own project config in `src/app/core/firebase.ts` before deploying.

Run the unit test suite (Vitest):

```bash
ng test
```

---

## 🔍 UX Case Study — Friction Found, Friction Fixed

A README says "responsive" and "accessible"; here's what actually got shipped to earn those words.

**1. Mobile Settings tabs were clipping and squeezing text.**
Stacking three tab labels — *Account Settings*, *App Preferences*, *Danger Zone* — into a narrow viewport either truncated the labels or crushed the layout. **Fix:** converted the tab bar to a horizontally-scrollable pill nav below the mobile breakpoint (`overflow-x: auto`, scrollbar hidden, `-webkit-overflow-scrolling: touch`), so every label stays fully legible and the interaction becomes a natural swipe instead of a cramped stack.

**2. Silent password failures during sign-up.**
The original flow only surfaced a "password too short" error *after* form submission — a dead end that reads as a bug, not guidance. **Fix:** introduced a reactive, real-time validation signal keyed off actual field interaction (`passwordTouched`), so the length warning appears the moment it becomes relevant and clears itself the moment it's resolved — no submit-and-fail round trip.

**3. Dark-mode contrast failure on the Daily Review CTA.**
The Daily Review card is intentionally rendered as a bold, dark card in *both* themes for visual consistency — but naively inheriting the app's flip-on-theme-toggle `--ink` token meant its text flipped to a *light* color in light mode and became nearly invisible against its own dark background. **Fix:** introduced a dedicated `--card-dark-bg` token, decoupled from the theme-reactive `--ink`/`--bg` pair, so bold accent cards keep legible, high-contrast text regardless of which theme is active — closing a real WCAG contrast gap rather than papering over it with a one-off inline style.

---

<div align="center">

Built with a lot of `computed()`, zero `NgZone.run()`, and one very cozy color palette.

</div>

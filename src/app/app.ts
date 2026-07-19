import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LottieIntro } from './shared/lottie-intro';

const INTRO_SEEN_KEY = 'memcab_intro_seen';
const FADE_DURATION_MS = 400;
// Safety net in case the animation fails to load or its 'complete' event
// never fires — the splash must never get stuck covering the app.
const FALLBACK_DISMISS_MS = 4000;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LottieIntro],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly alreadySeenIntro =
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(INTRO_SEEN_KEY) === '1';

  protected readonly showSplash = signal(!this.alreadySeenIntro);
  protected readonly splashFadingOut = signal(false);

  constructor() {
    if (this.showSplash()) {
      setTimeout(() => this.dismissSplash(), FALLBACK_DISMISS_MS);
    }
  }

  protected onIntroComplete(): void {
    this.dismissSplash();
  }

  private dismissSplash(): void {
    if (!this.showSplash() || this.splashFadingOut()) return;
    this.splashFadingOut.set(true);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    setTimeout(() => this.showSplash.set(false), FADE_DURATION_MS);
  }
}

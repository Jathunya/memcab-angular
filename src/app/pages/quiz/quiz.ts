import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { Word } from '../../core/models';

interface Question {
  word: Word;
  options: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MIN_WORDS = 4;

@Component({
  selector: 'app-quiz',
  imports: [RouterLink],
  templateUrl: './quiz.html',
  styleUrl: './quiz.css',
})
export class QuizPage implements OnInit, OnDestroy {
  protected readonly store = inject(StoreService);
  private readonly router = inject(Router);
  private timer?: ReturnType<typeof setInterval>;

  protected readonly questions = signal<Question[]>([]);
  protected readonly index = signal(0);
  protected readonly score = signal(0);
  protected readonly timeLeft = signal(this.store.quizTime());
  protected readonly picked = signal<string | null>(null);
  protected readonly insufficientWords = signal(false);
  protected readonly minWords = MIN_WORDS;

  protected readonly current = computed<Question | null>(() => this.questions()[this.index()] ?? null);
  protected readonly total = computed(() => this.questions().length);

  ngOnInit(): void {
    const deck = this.store.activeDeckWords();
    if (deck.length < MIN_WORDS) {
      this.insufficientWords.set(true);
      return;
    }
    const pool = shuffle(deck).slice(0, Math.min(10, deck.length));
    const questions: Question[] = pool.map((word) => {
      const distractorPool = deck.filter((w) => w.translation !== word.translation);
      const distractors = shuffle(distractorPool)
        .slice(0, 3)
        .map((w) => w.translation);
      return { word, options: shuffle([word.translation, ...distractors]) };
    });
    this.questions.set(questions);
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timeLeft.set(this.store.quizTime());
    this.timer = setInterval(() => {
      this.timeLeft.update((t) => t - 1);
      if (this.timeLeft() <= 0) {
        clearInterval(this.timer);
        this.answer(null);
      }
    }, 1000);
  }

  protected goBackToHub(): void {
    this.router.navigate(['/hub']);
  }

  protected answer(option: string | null): void {
    if (this.picked() !== null) return;
    if (this.timer) clearInterval(this.timer);
    this.picked.set(option ?? '');
    const correct = this.current()?.word.translation;
    if (option && option === correct) this.score.update((s) => s + 1);

    setTimeout(() => {
      if (this.index() + 1 >= this.total()) {
        this.finish();
      } else {
        this.index.update((i) => i + 1);
        this.picked.set(null);
        this.startTimer();
      }
    }, 700);
  }

  private finish(): void {
    this.store.recordGameResult('quiz', this.score(), this.total());
    this.router.navigateByUrl('/result');
  }
}

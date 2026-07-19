import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/store.service';
import { AudioService } from '../../core/audio.service';
import { CustomWordResult, SentenceService } from '../../core/sentence.service';
import { POS_COLORS } from '../../core/data';

@Component({
  selector: 'app-sentence',
  imports: [FormsModule],
  templateUrl: './sentence.html',
  styleUrl: './sentence.css',
})
export class SentencePage {
  protected readonly store = inject(StoreService);
  protected readonly audio = inject(AudioService);
  private readonly sentenceService = inject(SentenceService);

  protected readonly posColors = POS_COLORS;

  protected readonly customTerm = signal('');
  protected readonly customLoading = signal(false);
  protected readonly customError = signal<string | null>(null);
  protected readonly customResult = signal<CustomWordResult | null>(null);

  protected hear(text: string, lang: 'th-TH' | 'en-US' = 'th-TH'): void {
    this.audio.speak(text, lang);
  }

  protected async generateCustom(): Promise<void> {
    const term = this.customTerm().trim();
    if (!term) {
      this.customError.set('Please type a word first.');
      return;
    }

    this.customError.set(null);
    this.customLoading.set(true);
    this.customResult.set(null);
    try {
      const result = await this.sentenceService.generateCustom(term);
      this.customResult.set(result);
    } catch (err) {
      this.customError.set(
        err instanceof Error ? err.message : 'Could not generate sentence. Please check your internet connection.',
      );
    } finally {
      this.customLoading.set(false);
    }
  }

  protected saveCustom(): void {
    const result = this.customResult();
    if (!result) return;
    this.store.openModal({
      type: 'save-word',
      word: {
        word: result.thai,
        translation: result.term,
        pronunciation: result.pronunciation || undefined,
        partOfSpeech: result.partOfSpeech,
        customNote: result.sentence,
      },
    });
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShell } from './modal-shell';
import { StoreService } from '../core/store.service';
import { PartOfSpeech } from '../core/models';

const POS_OPTIONS: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'phrase'];

@Component({
  selector: 'app-word-modal',
  imports: [FormsModule, ModalShell],
  template: `
    @if (state(); as s) {
      <app-modal-shell [title]="s.word ? 'Edit word' : 'Add word'" (backdrop)="close()">
        <form class="field-stack" (ngSubmit)="save()">
          <div class="field">
            <label for="w-trans">English</label>
            <input id="w-trans" class="thai" [ngModel]="translation()" (ngModelChange)="translation.set($event)" name="translation" required placeholder="hello" />
          </div>
          <div class="field">
            <label for="w-word">Thai</label>
            <input id="w-word" class="thai" [ngModel]="word()" (ngModelChange)="word.set($event)" name="word" required placeholder="สวัสดี" />
          </div>
          <div class="field">
            <label for="w-ipa">Pronunciation (IPA)</label>
            <input id="w-ipa" class="thai" [ngModel]="pronunciation()" (ngModelChange)="pronunciation.set($event)" name="pronunciation" placeholder="e.g. həˈləʊ" />
          </div>
          <div class="field">
            <label for="w-pos">Part of speech</label>
            <select id="w-pos" [ngModel]="partOfSpeech()" (ngModelChange)="partOfSpeech.set($event)" name="pos">
              @for (opt of posOptions; track opt) {
                <option [value]="opt">{{ opt }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="w-note">Note (optional)</label>
            <input id="w-note" [ngModel]="note()" (ngModelChange)="note.set($event)" name="note" placeholder="e.g. informal greeting" />
          </div>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="!word().trim() || !translation().trim()">
              {{ s.word ? 'Save changes' : 'Add word' }}
            </button>
          </div>
        </form>
      </app-modal-shell>
    }
  `,
  styles: [
    `
      .field-stack {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .field {
        gap: 0.2rem;
      }
      .field label {
        font-size: 0.76rem;
      }
      .field input,
      .field select {
        padding: 0.45rem 0.65rem;
        font-size: 0.9rem;
        font-weight: 700;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.6rem;
        margin-top: 0.35rem;
      }
    `,
  ],
})
export class WordModal {
  private readonly store = inject(StoreService);
  readonly posOptions = POS_OPTIONS;

  readonly state = computed(() => {
    const m = this.store.activeModal();
    return m?.type === 'word' ? m : null;
  });

  readonly word = signal(this.state()?.word?.word ?? '');
  readonly translation = signal(this.state()?.word?.translation ?? '');
  readonly pronunciation = signal(this.state()?.word?.pronunciation ?? '');
  readonly partOfSpeech = signal<PartOfSpeech>(this.state()?.word?.partOfSpeech ?? 'noun');
  readonly note = signal(this.state()?.word?.customNote ?? '');

  constructor() {
    const s = this.state();
    if (s?.word) {
      this.word.set(s.word.word);
      this.translation.set(s.word.translation);
      this.pronunciation.set(s.word.pronunciation ?? '');
      this.partOfSpeech.set(s.word.partOfSpeech);
      this.note.set(s.word.customNote ?? '');
    }
  }

  save(): void {
    const s = this.state();
    if (!s || !this.word().trim() || !this.translation().trim()) return;
    const payload = {
      word: this.word().trim(),
      translation: this.translation().trim(),
      pronunciation: this.pronunciation().trim() || undefined,
      partOfSpeech: this.partOfSpeech(),
      customNote: this.note().trim() || undefined,
    };
    if (s.word) {
      this.store.updateWord(s.folderId, s.word.id, payload);
    } else {
      this.store.addWord(s.folderId, payload);
    }
    this.close();
  }

  close(): void {
    this.store.closeModal();
  }
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { AudioService } from '../../core/audio.service';
import { POS_COLORS } from '../../core/data';
import { Word } from '../../core/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  protected readonly store = inject(StoreService);
  private readonly audio = inject(AudioService);
  protected readonly posColors = POS_COLORS;

  protected hear(word: Word): void {
    this.audio.speak(word.word, 'th-TH');
  }

  protected status(word: Word) {
    return this.store.status(word.id);
  }
}

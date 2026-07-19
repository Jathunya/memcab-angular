import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { StoreService } from '../../core/store.service';
import { AudioService } from '../../core/audio.service';
import { POS_COLORS } from '../../core/data';
import { Folder, PartOfSpeech, Word } from '../../core/models';

const POS_OPTIONS: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'phrase'];

@Component({
  selector: 'app-deck-detail',
  imports: [RouterLink, FormsModule],
  templateUrl: './deck-detail.html',
  styleUrl: './deck-detail.css',
})
export class DeckDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly store = inject(StoreService);
  private readonly audio = inject(AudioService);
  protected readonly posColors = POS_COLORS;
  protected readonly posOptions = POS_OPTIONS;

  private readonly folderId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  protected readonly folder = computed(() => this.store.folderById(this.folderId()));

  protected readonly search = signal('');
  protected readonly posFilter = signal<'all' | PartOfSpeech>('all');
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly studyMenuOpen = signal(false);

  protected readonly filteredWords = computed<Word[]>(() => {
    const folder = this.folder();
    if (!folder) return [];
    const q = this.search().trim().toLowerCase();
    const pos = this.posFilter();
    return folder.words.filter(
      (w) =>
        (pos === 'all' || w.partOfSpeech === pos) &&
        (!q || w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q)),
    );
  });

  protected toggleSelect(id: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected allFilteredSelected(): boolean {
    const words = this.filteredWords();
    return words.length > 0 && words.every((w) => this.selected().has(w.id));
  }

  protected toggleSelectAll(): void {
    const ids = this.filteredWords().map((w) => w.id);
    const allSelected = ids.every((id) => this.selected().has(id));
    this.selected.set(allSelected ? new Set() : new Set(ids));
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected hear(word: Word): void {
    this.audio.speak(word.translation, 'en-US');
  }

  protected addWord(): void {
    const folder = this.folder();
    if (folder) this.store.openModal({ type: 'word', folderId: folder.id });
  }

  protected editWord(word: Word): void {
    const folder = this.folder();
    if (folder) this.store.openModal({ type: 'word', folderId: folder.id, word });
  }

  protected deleteWord(word: Word): void {
    const folder = this.folder();
    if (!folder) return;
    this.store.openModal({
      type: 'confirm',
      title: 'Delete word?',
      body: `"${word.word}" (${word.translation}) will be removed from this deck.`,
      confirmLabel: 'Delete',
      onConfirm: () => this.store.deleteWords(folder.id, [word.id]),
    });
  }

  protected bulkDelete(): void {
    const folder = this.folder();
    const ids = Array.from(this.selected());
    if (!folder || !ids.length) return;
    this.store.openModal({
      type: 'confirm',
      title: `Delete ${ids.length} word(s)?`,
      body: 'This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        this.store.deleteWords(folder.id, ids);
        this.clearSelection();
      },
    });
  }

  protected bulkMove(): void {
    const folder = this.folder();
    const ids = Array.from(this.selected());
    if (!folder || !ids.length) return;
    this.store.openModal({ type: 'move', folderId: folder.id, wordIds: ids });
    this.clearSelection();
  }

  protected exportCsv(): void {
    const folder = this.folder();
    if (!folder) return;
    const csv = this.store.exportFolderCsv(folder);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folder.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected back(): void {
    this.router.navigateByUrl('/decks');
  }

  // ---- "Study this deck" dropdown ----

  protected toggleStudyMenu(event: Event): void {
    event.stopPropagation();
    this.studyMenuOpen.update((open) => !open);
  }

  @HostListener('document:click')
  protected closeStudyMenu(): void {
    this.studyMenuOpen.set(false);
  }

  protected startDailyReview(folder: Folder): void {
    this.closeStudyMenu();
    this.router.navigate(['/review'], { queryParams: { deckId: folder.id } });
  }

  protected playInGameHub(folder: Folder): void {
    this.closeStudyMenu();
    this.store.setActiveDeck(folder.id);
    this.router.navigateByUrl('/hub');
  }
}

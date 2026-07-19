import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { Folder } from '../../core/models';

@Component({
  selector: 'app-decks',
  imports: [RouterLink],
  templateUrl: './decks.html',
  styleUrl: './decks.css',
})
export class DecksPage {
  protected readonly store = inject(StoreService);

  protected newDeck(): void {
    this.store.openModal({ type: 'folder' });
  }

  protected editDeck(folder: Folder): void {
    this.store.openModal({ type: 'folder', folder });
  }

  protected deleteDeck(folder: Folder): void {
    this.store.openModal({
      type: 'confirm',
      title: 'Delete deck?',
      body: `"${folder.name}" and its ${folder.words.length} word(s) will be permanently removed.`,
      confirmLabel: 'Delete deck',
      onConfirm: () => this.store.deleteFolder(folder.id),
    });
  }

  protected importCsv(folder: Folder, input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      this.store.importFolderCsv(folder.id, text);
      input.value = '';
    });
  }

  protected exportCsv(folder: Folder): void {
    const csv = this.store.exportFolderCsv(folder);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folder.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

import { Component, inject } from '@angular/core';
import { StoreService } from '../core/store.service';
import { FolderModal } from './folder-modal';
import { WordModal } from './word-modal';
import { MoveModal } from './move-modal';
import { ConfirmModal } from './confirm-modal';
import { SaveWordModal } from './save-word-modal';

@Component({
  selector: 'app-modal-host',
  imports: [FolderModal, WordModal, MoveModal, ConfirmModal, SaveWordModal],
  template: `
    @switch (store.activeModal()?.type) {
      @case ('folder') {
        <app-folder-modal />
      }
      @case ('word') {
        <app-word-modal />
      }
      @case ('move') {
        <app-move-modal />
      }
      @case ('confirm') {
        <app-confirm-modal />
      }
      @case ('save-word') {
        <app-save-word-modal />
      }
    }
  `,
})
export class ModalHost {
  protected readonly store = inject(StoreService);
}

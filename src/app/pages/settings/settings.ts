import { Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { AuthService } from '../../core/auth.service';

type SettingsTab = 'account' | 'preferences' | 'danger';

interface TabMeta {
  id: SettingsTab;
  label: string;
  icon: string;
}

const SAVED_TICK_DURATION_MS = 2000;

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class SettingsPage {
  protected readonly store = inject(StoreService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly tabs: TabMeta[] = [
    { id: 'account', label: 'Account Settings', icon: '👤' },
    { id: 'preferences', label: 'App Preferences', icon: '🎨' },
    { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
  ];

  protected readonly activeTab = signal<SettingsTab>('account');

  protected readonly avatarUrl = computed(() => this.auth.currentUser()?.photoURL);

  protected readonly ttsSpeeds = [
    { label: '🐢 Slow', value: 0.8 },
    { label: '🏃 Normal', value: 1.0 },
    { label: '⚡ Fast', value: 1.2 },
  ];

  protected readonly editingEmail = signal(false);
  protected readonly editingPassword = signal(false);
  protected readonly emailVerificationSentTo = signal('');
  protected readonly passwordSaved = signal(false);
  protected readonly accountError = signal('');
  protected tempEmail = '';
  protected tempPassword = '';

  protected readonly showDeleteConfirm = signal(false);
  protected deleteConfirmText = '';

  protected selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;
      const result = await this.auth.updateAvatar(dataUrl);
      if (!result.ok) this.accountError.set(result.error);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  protected startEditEmail(): void {
    this.tempEmail = this.auth.currentUser()?.email ?? '';
    this.accountError.set('');
    this.emailVerificationSentTo.set('');
    this.editingEmail.set(true);
  }

  protected async saveEmail(): Promise<void> {
    const newEmail = this.tempEmail;
    const result = await this.auth.updateEmail(newEmail);
    if (!result.ok) {
      this.accountError.set(result.error);
      return;
    }
    this.editingEmail.set(false);
    this.accountError.set('');
    this.emailVerificationSentTo.set(newEmail);
  }

  protected cancelEditEmail(): void {
    this.editingEmail.set(false);
    this.accountError.set('');
    this.emailVerificationSentTo.set('');
  }

  protected startEditPassword(): void {
    this.tempPassword = '';
    this.accountError.set('');
    this.editingPassword.set(true);
  }

  protected async savePassword(): Promise<void> {
    const result = await this.auth.updatePassword(this.tempPassword);
    if (!result.ok) {
      this.accountError.set(result.error);
      return;
    }
    this.editingPassword.set(false);
    this.tempPassword = '';
    this.accountError.set('');
    this.flashSaved(this.passwordSaved);
  }

  protected cancelEditPassword(): void {
    this.editingPassword.set(false);
    this.tempPassword = '';
    this.accountError.set('');
  }

  private flashSaved(flag: WritableSignal<boolean>): void {
    flag.set(true);
    setTimeout(() => flag.set(false), SAVED_TICK_DURATION_MS);
  }

  protected setDarkMode(enabled: boolean): void {
    this.store.setDarkMode(enabled);
  }

  protected setTtsRate(rate: number): void {
    this.store.setTtsRate(rate);
  }

  protected toggleSound(): void {
    this.store.setSoundEnabled(!this.store.soundEnabled());
  }

  protected resetProgress(): void {
    const confirmed = window.confirm(
      'This will permanently reset your points, day streak, and word mastery progress. Are you sure?',
    );
    if (!confirmed) return;
    this.store.resetProgress();
  }

  protected openDeleteConfirm(): void {
    this.deleteConfirmText = '';
    this.showDeleteConfirm.set(true);
  }

  protected cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deleteConfirmText = '';
  }

  protected async confirmDelete(): Promise<void> {
    if (this.deleteConfirmText !== 'DELETE') return;
    const result = await this.auth.deleteAccount();
    if (!result.ok) {
      this.accountError.set(result.error);
      this.showDeleteConfirm.set(false);
      this.activeTab.set('account');
      return;
    }
    this.router.navigateByUrl('/login');
  }
}

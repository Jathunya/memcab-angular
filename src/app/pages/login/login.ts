import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LogoMark } from '../../shared/logo-mark';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, LogoMark],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  readonly isResettingPassword = signal(false);
  readonly resetEmail = signal('');
  readonly resetSuccessText = signal('');
  readonly resetErrorText = signal('');
  readonly resetLoading = signal(false);

  constructor() {
    // Firebase resolves auth state asynchronously on boot, so this reacts
    // whenever isAuthenticated() flips true rather than checking only once.
    effect(() => {
      if (this.auth.isAuthenticated()) this.router.navigateByUrl('/home');
    });
  }

  async submit(): Promise<void> {
    if (!this.email().trim() || !this.password() || this.loading()) return;
    this.error.set(null);
    this.loading.set(true);
    const result = await this.auth.login(this.email(), this.password());
    this.loading.set(false);
    if (result.ok) {
      this.router.navigateByUrl('/home');
    } else {
      this.error.set(result.error);
    }
  }

  onFormSubmit(): void {
    if (this.isResettingPassword()) {
      this.onForgotPasswordSubmit();
    } else {
      this.submit();
    }
  }

  startPasswordReset(): void {
    this.resetEmail.set(this.email());
    this.resetSuccessText.set('');
    this.resetErrorText.set('');
    this.isResettingPassword.set(true);
  }

  backToLogin(): void {
    this.isResettingPassword.set(false);
    this.resetSuccessText.set('');
    this.resetErrorText.set('');
  }

  async onForgotPasswordSubmit(): Promise<void> {
    const emailValue = this.resetEmail().trim();
    if (!emailValue || this.resetLoading()) return;

    this.resetErrorText.set('');
    this.resetSuccessText.set('');
    this.resetLoading.set(true);
    const result = await this.auth.sendPasswordReset(emailValue);
    this.resetLoading.set(false);

    if (result.ok) {
      this.resetSuccessText.set('Password reset link sent! Check your inbox (and spam folder).');
    } else {
      this.resetErrorText.set(result.error);
    }
  }
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LogoMark } from '../../shared/logo-mark';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, LogoMark],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class SignupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly passwordTouched = signal(false);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  readonly showPasswordLengthError = computed(
    () => this.passwordTouched() && this.password().length > 0 && this.password().length < 6,
  );

  readonly passwordsMismatch = computed(
    () => this.confirmPassword().length > 0 && this.password() !== this.confirmPassword(),
  );

  readonly canSubmit = computed(
    () =>
      !!this.name().trim() &&
      !!this.email().trim() &&
      this.password().length >= 6 &&
      this.password() === this.confirmPassword() &&
      !this.loading(),
  );

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) this.router.navigateByUrl('/home');
    });
  }

  onPasswordInput(value: string): void {
    this.password.set(value);
    this.passwordTouched.set(true);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.error.set(null);
    this.loading.set(true);
    const result = await this.auth.register(this.name(), this.email(), this.password());
    this.loading.set(false);
    if (result.ok) {
      this.router.navigateByUrl('/home');
    } else {
      this.error.set(result.error);
    }
  }
}

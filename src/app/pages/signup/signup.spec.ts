import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignupPage } from './signup';
import { AuthService } from '../../core/auth.service';

describe('SignupPage', () => {
  let component: SignupPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        // isAuthenticated() only needs to be callable here; it's read once by
        // the redirect effect in the constructor and not asserted on in
        // these tests, which target the validation signals only.
        { provide: AuthService, useValue: { isAuthenticated: () => false, register: vi.fn() } },
        // The template's routerLink ("Already have an account? Log in")
        // needs a real router context (ActivatedRoute etc.) to resolve its
        // DI, which a bare `{ provide: Router, useValue: {...} }` mock
        // doesn't satisfy -- an empty route config is enough.
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('real-time password length validation', () => {
    it('shows no error before the password field has been touched', () => {
      expect(component.showPasswordLengthError()).toBe(false);
    });

    it('shows the length error the moment a too-short password is typed (boundary: 5 chars)', () => {
      component.onPasswordInput('abcde');
      expect(component.showPasswordLengthError()).toBe(true);
    });

    it('clears the length error at the 6-character boundary', () => {
      component.onPasswordInput('abcde');
      expect(component.showPasswordLengthError()).toBe(true);

      component.onPasswordInput('abcdef');
      expect(component.showPasswordLengthError()).toBe(false);
    });

    it('does not show the length error for an empty password, even once touched', () => {
      component.onPasswordInput('abc');
      component.onPasswordInput('');
      expect(component.showPasswordLengthError()).toBe(false);
    });
  });

  describe('confirm-password mismatch', () => {
    it('does not flag a mismatch until confirmPassword has content', () => {
      component.password.set('abcdef');
      expect(component.passwordsMismatch()).toBe(false);
    });

    it('flags a mismatch once confirmPassword differs from password', () => {
      component.password.set('abcdef');
      component.confirmPassword.set('abcdeg');
      expect(component.passwordsMismatch()).toBe(true);
    });

    it('clears the mismatch once the values match', () => {
      component.password.set('abcdef');
      component.confirmPassword.set('abcdeg');
      component.confirmPassword.set('abcdef');
      expect(component.passwordsMismatch()).toBe(false);
    });
  });

  describe('canSubmit', () => {
    it('is false until name, email, and matching 6+ character passwords are all present', () => {
      expect(component.canSubmit()).toBe(false);

      component.name.set('Learner');
      component.email.set('learner@example.com');
      component.onPasswordInput('password123');
      component.confirmPassword.set('password123');

      expect(component.canSubmit()).toBe(true);
    });

    it('is false while a submission is already in flight', () => {
      component.name.set('Learner');
      component.email.set('learner@example.com');
      component.onPasswordInput('password123');
      component.confirmPassword.set('password123');
      component.loading.set(true);

      expect(component.canSubmit()).toBe(false);
    });

    it('is false for a name that is only whitespace', () => {
      component.name.set('   ');
      component.email.set('learner@example.com');
      component.onPasswordInput('password123');
      component.confirmPassword.set('password123');

      expect(component.canSubmit()).toBe(false);
    });
  });
});

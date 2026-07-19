import { Injectable, computed, inject, signal } from '@angular/core';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { auth } from './firebase';
import { AppUser } from './models';
import { StoreService } from './store.service';

export type AuthResult = { ok: true } | { ok: false; error: string };

function toAppUser(user: FirebaseUser | null): AppUser | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
}

function mapAuthError(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code ?? '';
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found for this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/requires-recent-login':
      return 'Please log out and back in, then try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Firebase Authentication (email/password). `currentUser` reflects Firebase's
 * onAuthStateChanged stream, which resolves asynchronously on boot (it has to
 * check IndexedDB for a persisted session) — callers that need to gate access
 * (e.g. the route guard) should await `ready` before reading isAuthenticated.
 *
 * StoreService keeps its own lightweight `user` signal (display name only)
 * for the rest of the app to read; this service keeps it in sync on every
 * auth-state change so no other component needs to know about Firebase.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(StoreService);

  private readonly _currentUser = signal<AppUser | null>(null);
  private readonly _authReady = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly authReady = this._authReady.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());

  /** Resolves once Firebase has reported its first (real) auth state. */
  readonly ready: Promise<void>;

  constructor() {
    let resolveReady!: () => void;
    this.ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    onAuthStateChanged(auth, (user) => {
      this._currentUser.set(toAppUser(user));
      // Swaps StoreService's entire decks/progress dataset to this uid's
      // own scoped storage before anything else reacts to the auth change —
      // otherwise the previous account's data would stay visible in memory
      // until something happened to touch it.
      this.store.setActiveUser(user?.uid ?? null);
      if (user) {
        this.store.login(user.displayName || 'Learner');
      } else {
        this.store.logout();
      }
      if (!this._authReady()) {
        this._authReady.set(true);
        resolveReady();
      }
    });
  }

  private refreshCurrentUser(): void {
    this._currentUser.set(toAppUser(auth.currentUser));
  }

  async register(name: string, email: string, password: string): Promise<AuthResult> {
    const trimmedName = name.trim();
    if (!trimmedName) return { ok: false, error: 'Please enter your name.' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: trimmedName });
      this.refreshCurrentUser();
      this.store.login(trimmedName);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapAuthError(error) };
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapAuthError(error) };
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  async sendPasswordReset(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapAuthError(error) };
    }
  }

  /**
   * Firebase's projects created with email enumeration protection (the
   * current default) reject the legacy direct `updateEmail` call with
   * `auth/operation-not-allowed`. The supported path sends a confirmation
   * link to the new address instead — the address only actually changes
   * once the user clicks it, so `currentUser` is intentionally left as-is.
   */
  async updateEmail(email: string): Promise<AuthResult> {
    const user = auth.currentUser;
    if (!user) return { ok: false, error: 'Not logged in.' };
    try {
      await verifyBeforeUpdateEmail(user, email.trim());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapAuthError(error) };
    }
  }

  async updatePassword(newPassword: string): Promise<AuthResult> {
    const user = auth.currentUser;
    if (!user) return { ok: false, error: 'Not logged in.' };
    if (newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    try {
      await firebaseUpdatePassword(user, newPassword);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapAuthError(error) };
    }
  }

  async updateAvatar(dataUrl: string): Promise<AuthResult> {
    const user = auth.currentUser;
    if (!user) return { ok: false, error: 'Not logged in.' };
    try {
      await updateProfile(user, { photoURL: dataUrl });
      this.refreshCurrentUser();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapAuthError(error) };
    }
  }

  async deleteAccount(): Promise<AuthResult> {
    const user = auth.currentUser;
    if (!user) return { ok: false, error: 'Not logged in.' };
    const { uid } = user;
    try {
      await deleteUser(user);
      this.store.wipeAllData(uid);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapAuthError(error) };
    }
  }
}

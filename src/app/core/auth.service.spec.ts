import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { StoreService } from './store.service';
import type { AppUser } from './models';

/**
 * All firebase/* calls are mocked here -- this is a unit test for
 * AuthService's own logic (state mapping, error translation, orchestration
 * of StoreService), not an integration test against real Firebase. See
 * e2e/ for tests that exercise the real UI against mocked network responses.
 *
 * vi.hoisted() is required because vi.mock() factories are hoisted above
 * normal imports/const declarations -- referencing plain top-level consts
 * from inside the factory without this would throw a TDZ error.
 */
const {
  mockAuthInstance,
  mockOnAuthStateChanged,
  mockSignIn,
  mockCreateUser,
  mockSignOut,
  mockSendPasswordReset,
  mockUpdateProfile,
  mockUpdatePassword,
  mockVerifyBeforeUpdateEmail,
  mockDeleteUser,
} = vi.hoisted(() => ({
  mockAuthInstance: { currentUser: null as { uid: string } | null },
  mockOnAuthStateChanged: vi.fn(),
  mockSignIn: vi.fn(),
  mockCreateUser: vi.fn(),
  mockSignOut: vi.fn(),
  mockSendPasswordReset: vi.fn(),
  mockUpdateProfile: vi.fn(),
  mockUpdatePassword: vi.fn(),
  mockVerifyBeforeUpdateEmail: vi.fn(),
  mockDeleteUser: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuthInstance),
  onAuthStateChanged: mockOnAuthStateChanged,
  signInWithEmailAndPassword: mockSignIn,
  createUserWithEmailAndPassword: mockCreateUser,
  signOut: mockSignOut,
  sendPasswordResetEmail: mockSendPasswordReset,
  updateProfile: mockUpdateProfile,
  updatePassword: mockUpdatePassword,
  verifyBeforeUpdateEmail: mockVerifyBeforeUpdateEmail,
  deleteUser: mockDeleteUser,
}));

describe('AuthService', () => {
  let service: AuthService;
  let authStateCallback: (user: Partial<AppUser> | null) => void;
  let storeSpy: {
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    setActiveUser: ReturnType<typeof vi.fn>;
    wipeAllData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthInstance.currentUser = null;

    // Capture the callback AuthService registers so tests can fire simulated
    // auth-state transitions synchronously, instead of waiting on real
    // Firebase network round trips.
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: unknown) => void) => {
      authStateCallback = cb as typeof authStateCallback;
      return () => {};
    });

    storeSpy = {
      login: vi.fn(),
      logout: vi.fn(),
      setActiveUser: vi.fn(),
      wipeAllData: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: StoreService, useValue: storeSpy }],
    });

    service = TestBed.inject(AuthService);
  });

  it('starts unauthenticated before Firebase resolves its first auth state', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('updates currentUser and isAuthenticated when Firebase reports a signed-in user', () => {
    authStateCallback({ uid: 'abc123', email: 'learner@example.com', displayName: 'Learner', photoURL: null });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual({
      uid: 'abc123',
      email: 'learner@example.com',
      displayName: 'Learner',
      photoURL: null,
    });
  });

  it('tells StoreService which uid is active on sign-in -- this is the fix for the cross-account deck leak', () => {
    authStateCallback({ uid: 'abc123', email: 'a@example.com', displayName: 'A', photoURL: null });

    expect(storeSpy.setActiveUser).toHaveBeenCalledWith('abc123');
    expect(storeSpy.login).toHaveBeenCalledWith('A');
  });

  it('clears currentUser and calls store.setActiveUser(null) on sign-out', () => {
    authStateCallback({ uid: 'abc123', email: 'a@example.com', displayName: 'A', photoURL: null });
    authStateCallback(null);

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(storeSpy.setActiveUser).toHaveBeenLastCalledWith(null);
    expect(storeSpy.logout).toHaveBeenCalled();
  });

  it('resolves `ready` only after the first auth-state callback fires', async () => {
    let resolved = false;
    service.ready.then(() => {
      resolved = true;
    });
    // Nothing has fired the callback yet.
    expect(resolved).toBe(false);

    authStateCallback(null);
    await service.ready;
    expect(resolved).toBe(true);
  });

  describe('login()', () => {
    it('returns { ok: true } on successful sign-in', async () => {
      mockSignIn.mockResolvedValue({ user: { uid: 'abc' } });
      const result = await service.login('a@example.com', 'password123');
      expect(result).toEqual({ ok: true });
      expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), 'a@example.com', 'password123');
    });

    it('maps auth/invalid-credential to a friendly "Incorrect password." message', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });
      const result = await service.login('a@example.com', 'wrong');
      expect(result).toEqual({ ok: false, error: 'Incorrect password.' });
    });

    it('falls back to a generic message for an unrecognized Firebase error code', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/some-future-error-code' });
      const result = await service.login('a@example.com', 'x');
      expect(result).toEqual({ ok: false, error: 'Something went wrong. Please try again.' });
    });
  });

  describe('register() -- signup password length validation (boundary value analysis)', () => {
    it('rejects a 5-character password without calling Firebase at all', async () => {
      const result = await service.register('Name', 'a@example.com', '12345');
      expect(result).toEqual({ ok: false, error: 'Password must be at least 6 characters.' });
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('accepts a password at exactly the 6-character boundary', async () => {
      mockCreateUser.mockResolvedValue({ user: { uid: 'new-uid' } });
      mockUpdateProfile.mockResolvedValue(undefined);
      const result = await service.register('Name', 'a@example.com', '123456');
      expect(result).toEqual({ ok: true });
      expect(mockCreateUser).toHaveBeenCalledWith(expect.anything(), 'a@example.com', '123456');
    });

    it('rejects a whitespace-only name before calling Firebase', async () => {
      const result = await service.register('   ', 'a@example.com', 'password123');
      expect(result).toEqual({ ok: false, error: 'Please enter your name.' });
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('maps auth/email-already-in-use to a friendly message', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
      const result = await service.register('Name', 'taken@example.com', 'password123');
      expect(result).toEqual({ ok: false, error: 'An account with this email already exists.' });
    });
  });

  describe('sendPasswordReset()', () => {
    it('returns { ok: true } for a registered email', async () => {
      mockSendPasswordReset.mockResolvedValue(undefined);
      const result = await service.sendPasswordReset('learner@example.com');
      expect(result).toEqual({ ok: true });
    });

    it('also returns { ok: true } for an unregistered email -- Firebase email-enumeration protection means the app cannot distinguish the two, by design', async () => {
      mockSendPasswordReset.mockResolvedValue(undefined);
      const result = await service.sendPasswordReset('nobody@example.com');
      expect(result).toEqual({ ok: true });
    });

    it('maps auth/invalid-email to a friendly message', async () => {
      mockSendPasswordReset.mockRejectedValue({ code: 'auth/invalid-email' });
      const result = await service.sendPasswordReset('not-an-email');
      expect(result).toEqual({ ok: false, error: 'Please enter a valid email address.' });
    });
  });

  describe('deleteAccount()', () => {
    it('purges the uid captured BEFORE deleteUser() resolves, guarding against onAuthStateChanged(null) racing the await', async () => {
      authStateCallback({ uid: 'to-delete', email: 'x@example.com', displayName: 'X', photoURL: null });
      mockAuthInstance.currentUser = { uid: 'to-delete' };

      mockDeleteUser.mockImplementation(async () => {
        // Simulate Firebase firing onAuthStateChanged(null) as a side effect
        // of deletion, same as it does for real -- this is exactly the race
        // the uid-capture-before-await fix in deleteAccount() guards against.
        authStateCallback(null);
      });

      const result = await service.deleteAccount();

      expect(result).toEqual({ ok: true });
      expect(storeSpy.wipeAllData).toHaveBeenCalledWith('to-delete');
    });

    it('returns an error without calling Firebase when no user is signed in', async () => {
      mockAuthInstance.currentUser = null;
      const result = await service.deleteAccount();
      expect(result).toEqual({ ok: false, error: 'Not logged in.' });
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });
});

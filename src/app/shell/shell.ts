import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StoreService } from '../core/store.service';
import { AuthService } from '../core/auth.service';
import { ModalHost } from '../modals/modal-host';
import { LogoMark } from '../shared/logo-mark';

const MOBILE_BREAKPOINT = 768;

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ModalHost, LogoMark],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly store = inject(StoreService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isUserMenuOpen = signal(false);

  protected readonly bottomNavItems: NavItem[] = [
    { label: 'Home', icon: '🏠', path: '/home' },
    { label: 'Review', icon: '🎴', path: '/review' },
    { label: 'Sentence', icon: '✨', path: '/sentence' },
    { label: 'Game Hub', icon: '🎮', path: '/hub' },
    { label: 'My Decks', icon: '📁', path: '/decks' },
  ];

  protected readonly navGroups: NavGroup[] = [
    {
      label: 'Learn',
      items: [
        { label: 'Daily Review', icon: '🎴', path: '/review' },
        { label: 'Sentence Lab', icon: '✨', path: '/sentence' },
      ],
    },
    { label: 'Play', items: [{ label: 'Game Hub', icon: '🎮', path: '/hub' }] },
    { label: 'Build', items: [{ label: 'My Decks', icon: '📁', path: '/decks' }] },
    {
      label: 'Track',
      items: [
        { label: 'Progress', icon: '📊', path: '/progress' },
        { label: 'Achievements', icon: '🏆', path: '/badges' },
      ],
    },
  ];

  protected navBadge(path: string): number | null {
    if (path !== '/review') return null;
    const n = this.store.reviewQueue().length;
    return n > 0 ? n : null;
  }

  protected get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'อรุณสวัสดิ์';
    if (hour < 18) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  }

  protected async logout(): Promise<void> {
    this.isUserMenuOpen.set(false);
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  protected toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();

    const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
    if (isMobile) {
      this.router.navigateByUrl('/settings');
      return;
    }

    this.isUserMenuOpen.update((open) => !open);
  }

  @HostListener('document:click')
  protected closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }
}

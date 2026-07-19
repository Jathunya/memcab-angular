import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import type { AnimationItem } from 'lottie-web';

@Component({
  selector: 'app-lottie-intro',
  template: `<div #container class="lottie-container" [style.width.px]="size" [style.height.px]="size"></div>`,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .lottie-container {
        display: block;
      }
    `,
  ],
})
export class LottieIntro implements OnInit, OnDestroy {
  @Input() size = 140;
  @Input() path = 'memcab-intro.lottie.json';
  @Input() loop = false;
  @Output() readonly complete = new EventEmitter<void>();

  @ViewChild('container', { static: true }) private readonly container!: ElementRef<HTMLDivElement>;

  private animation: AnimationItem | null = null;

  async ngOnInit(): Promise<void> {
    if (typeof window === 'undefined') return;
    const lottie = (await import('lottie-web')).default;
    this.animation = lottie.loadAnimation({
      container: this.container.nativeElement,
      renderer: 'svg',
      loop: this.loop,
      autoplay: true,
      path: this.path,
    });
    this.animation.addEventListener('complete', () => this.complete.emit());
  }

  ngOnDestroy(): void {
    this.animation?.destroy();
  }
}

import { Component, Input } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'app-logo-mark',
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 100 100" role="img" aria-label="memcab logo">
      <defs>
        <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#10A19A" />
          <stop offset="1" stop-color="#0B6E6A" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="24" [attr.fill]="'url(#' + gradientId + ')'" />
      <path
        d="M49 30c-6-7-19-6-23 2-8 1-12 9-8 15-4 6 0 14 8 15 3 6 12 8 17 3"
        fill="none"
        stroke="#fff"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M49 30c6-7 17-6 21 2 8 1 12 9 8 15 4 6 0 14-8 15-3 6-11 8-16 3"
        fill="none"
        stroke="#fff"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M49 27v41" stroke="#fff" stroke-width="5" stroke-linecap="round" />
      <path
        d="M40 44c-4 0-6 4-3 7M59 47c3-1 6 2 4 6"
        stroke="#fff"
        stroke-width="4"
        fill="none"
        stroke-linecap="round"
        opacity=".7"
      />
      <path d="M70 14l2.6 5.4L78 22l-5.4 2.6L70 30l-2.6-5.4L62 22l5.4-2.6z" fill="#F2A93B" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-shrink: 0;
        line-height: 0;
      }
    `,
  ],
})
export class LogoMark {
  @Input() size = 40;
  protected readonly gradientId = `memcabTeal-${nextId++}`;
}

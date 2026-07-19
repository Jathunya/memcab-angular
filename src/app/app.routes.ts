import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup').then((m) => m.SignupPage),
  },
  {
    path: '',
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', loadComponent: () => import('./pages/home/home').then((m) => m.HomePage) },
      {
        path: 'review',
        loadComponent: () => import('./pages/review/review').then((m) => m.ReviewPage),
      },
      { path: 'hub', loadComponent: () => import('./pages/hub/hub').then((m) => m.HubPage) },
      {
        path: 'match',
        loadComponent: () => import('./pages/match/match').then((m) => m.MatchPage),
      },
      { path: 'quiz', loadComponent: () => import('./pages/quiz/quiz').then((m) => m.QuizPage) },
      { path: 'type', loadComponent: () => import('./pages/type/type').then((m) => m.TypePage) },
      {
        path: 'speak',
        loadComponent: () => import('./pages/speak/speak').then((m) => m.SpeakPage),
      },
      {
        path: 'result',
        loadComponent: () => import('./pages/result/result').then((m) => m.ResultPage),
      },
      {
        path: 'decks',
        loadComponent: () => import('./pages/decks/decks').then((m) => m.DecksPage),
      },
      {
        path: 'decks/:id',
        loadComponent: () =>
          import('./pages/deck-detail/deck-detail').then((m) => m.DeckDetailPage),
      },
      {
        path: 'progress',
        loadComponent: () => import('./pages/progress/progress').then((m) => m.ProgressPage),
      },
      {
        path: 'badges',
        loadComponent: () => import('./pages/badges/badges').then((m) => m.BadgesPage),
      },
      {
        path: 'sentence',
        loadComponent: () => import('./pages/sentence/sentence').then((m) => m.SentencePage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];

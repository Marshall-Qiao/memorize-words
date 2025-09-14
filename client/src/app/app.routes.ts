import { Routes } from '@angular/router';
import { WordListComponent } from './components/word-list/word-list.component';
import { TrainingComponent } from './components/training/training.component';
import { ErrorTrainingComponent } from './components/error-training/error-training.component';
import { AnalysisComponent } from './components/analysis/analysis.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { WordbookManagementComponent } from './components/wordbook-management/wordbook-management.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'wordbooks', component: WordbookManagementComponent },
  { path: 'words', component: WordListComponent },
  { path: 'training', component: TrainingComponent },
  { path: 'error-training', component: ErrorTrainingComponent },
  { path: 'analysis', component: AnalysisComponent },
  { path: '**', redirectTo: '/login' }
];
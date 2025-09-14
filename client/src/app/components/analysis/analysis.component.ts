import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AnalysisService, OverviewAnalysis, SessionAnalysis, ProgressAnalysis, WordMastery, Recommendations } from '../../services/analysis.service';
import { TrainingService, TrainingSession } from '../../services/training.service';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.scss']
})
export class AnalysisComponent implements OnInit {
  // Data
  overviewData: OverviewAnalysis | null = null;
  sessions: TrainingSession[] = [];
  selectedSession: TrainingSession | null = null;
  sessionAnalysis: SessionAnalysis | null = null;
  progressData: ProgressAnalysis | null = null;
  wordMasteryData: WordMastery | null = null;
  recommendations: Recommendations | null = null;
  
  // Loading states
  loading = false;
  loadingOverview = false;
  loadingSessions = false;
  loadingSessionAnalysis = false;
  loadingProgress = false;
  loadingWordMastery = false;
  loadingRecommendations = false;
  
  // Settings
  selectedDays = 30;
  selectedGroupBy = 'day';

  constructor(
    private analysisService: AnalysisService,
    private trainingService: TrainingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadOverviewData();
    this.loadSessions();
    this.loadProgressData();
    this.loadWordMasteryData();
    this.loadRecommendations();
  }

  loadOverviewData() {
    this.loadingOverview = true;
    this.analysisService.getOverview(this.selectedDays).subscribe({
      next: (data) => {
        this.overviewData = data;
        this.loadingOverview = false;
      },
      error: (error) => {
        console.error('Error loading overview data:', error);
        this.snackBar.open('Failed to load overview data', 'Close', { duration: 3000 });
        this.loadingOverview = false;
      }
    });
  }

  loadSessions() {
    this.loadingSessions = true;
    this.trainingService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loadingSessions = false;
      },
      error: (error) => {
        console.error('Error loading sessions:', error);
        this.snackBar.open('Failed to load sessions', 'Close', { duration: 3000 });
        this.loadingSessions = false;
      }
    });
  }

  loadSessionAnalysis(session: TrainingSession) {
    this.selectedSession = session;
    this.loadingSessionAnalysis = true;
    this.sessionAnalysis = null;

    this.analysisService.getSessionAnalysis(session.id).subscribe({
      next: (analysis) => {
        this.sessionAnalysis = analysis;
        this.loadingSessionAnalysis = false;
      },
      error: (error) => {
        console.error('Error loading session analysis:', error);
        this.snackBar.open('Failed to load session analysis', 'Close', { duration: 3000 });
        this.loadingSessionAnalysis = false;
      }
    });
  }

  loadProgressData() {
    this.loadingProgress = true;
    this.analysisService.getProgressAnalysis(this.selectedDays, this.selectedGroupBy).subscribe({
      next: (data) => {
        this.progressData = data;
        this.loadingProgress = false;
      },
      error: (error) => {
        console.error('Error loading progress data:', error);
        this.snackBar.open('Failed to load progress data', 'Close', { duration: 3000 });
        this.loadingProgress = false;
      }
    });
  }

  loadWordMasteryData() {
    this.loadingWordMastery = true;
    this.analysisService.getWordMastery(this.selectedDays, 50).subscribe({
      next: (data) => {
        this.wordMasteryData = data;
        this.loadingWordMastery = false;
      },
      error: (error) => {
        console.error('Error loading word mastery data:', error);
        this.snackBar.open('Failed to load word mastery data', 'Close', { duration: 3000 });
        this.loadingWordMastery = false;
      }
    });
  }

  loadRecommendations() {
    this.loadingRecommendations = true;
    this.analysisService.getRecommendations(10).subscribe({
      next: (data) => {
        this.recommendations = data;
        this.loadingRecommendations = false;
      },
      error: (error) => {
        console.error('Error loading recommendations:', error);
        this.snackBar.open('Failed to load recommendations', 'Close', { duration: 3000 });
        this.loadingRecommendations = false;
      }
    });
  }

  onDaysChange() {
    this.loadOverviewData();
    this.loadProgressData();
    this.loadWordMasteryData();
  }

  onGroupByChange() {
    this.loadProgressData();
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  formatAccuracy(accuracy: number): string {
    return `${Math.round(accuracy * 100) / 100}%`;
  }

  getMasteryLevelColor(level: string): string {
    switch (level) {
      case 'mastered': return '#4caf50';
      case 'good': return '#8bc34a';
      case 'needs_practice': return '#ff9800';
      case 'difficult': return '#f44336';
      default: return '#666';
    }
  }

  getMasteryLevelIcon(level: string): string {
    switch (level) {
      case 'mastered': return 'check_circle';
      case 'good': return 'thumb_up';
      case 'needs_practice': return 'warning';
      case 'difficult': return 'error';
      default: return 'help';
    }
  }
}
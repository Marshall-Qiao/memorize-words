import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { AnalysisService, OverviewAnalysis } from '../../services/analysis.service';
import { WordService } from '../../services/word.service';
import { TrainingService } from '../../services/training.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  overviewData: OverviewAnalysis | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private analysisService: AnalysisService,
    private wordService: WordService,
    private trainingService: TrainingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    this.error = null;

    this.analysisService.getOverview(30).subscribe({
      next: (data) => {
        this.overviewData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.error = 'Failed to load dashboard data';
        this.loading = false;
      }
    });
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

  navigateToTraining() {
    this.router.navigate(['/training']);
  }

  navigateToErrorTraining() {
    this.router.navigate(['/error-training']);
  }

  navigateToWords() {
    this.router.navigate(['/words']);
  }

  navigateToAnalysis() {
    this.router.navigate(['/analysis']);
  }
}
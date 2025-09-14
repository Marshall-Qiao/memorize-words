import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WordService, Word } from '../../services/word.service';
import { ErrorService, WordError, ErrorTrainingRound, TopError } from '../../services/error.service';
import { TrainingService, TrainingSession } from '../../services/training.service';

@Component({
  selector: 'app-error-training',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './error-training.component.html',
  styleUrls: ['./error-training.component.scss']
})
export class ErrorTrainingComponent implements OnInit, OnDestroy {
  // Error data
  errors: WordError[] = [];
  topErrors: TopError[] = [];
  errorStats: any[] = [];
  
  // Training sessions
  sessions: TrainingSession[] = [];
  selectedSessionId: number | null = null;
  
  // Error training rounds
  errorRounds: ErrorTrainingRound[] = [];
  currentRound: ErrorTrainingRound | null = null;
  
  // Training state
  isTraining = false;
  isPaused = false;
  currentWordIndex = 0;
  currentWord: Word | null = null;
  trainingWords: Word[] = [];
  trainingResults: any[] = [];
  
  // UI state
  userInput = '';
  showAnswer = false;
  countdown = 0;
  countdownInterval: any;
  
  // Settings
  roundNumber = 1;
  wordCount = 10;
  accent: 'us' | 'uk' = 'us';
  speed = 1.0;
  
  // Loading states
  loading = false;
  loadingErrors = false;
  loadingSessions = false;

  constructor(
    private wordService: WordService,
    private errorService: ErrorService,
    private trainingService: TrainingService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadErrorData();
    this.loadSessions();
  }

  ngOnDestroy() {
    this.stopTraining();
  }

  loadErrorData() {
    this.loadingErrors = true;
    
    // Load error stats and top errors
    this.errorService.getErrorStats().subscribe({
      next: (stats) => {
        this.errorStats = stats;
      },
      error: (error) => {
        console.error('Error loading error stats:', error);
      }
    });

    this.errorService.getTopErrors(20, 30).subscribe({
      next: (errors) => {
        this.topErrors = errors;
        this.loadingErrors = false;
      },
      error: (error) => {
        console.error('Error loading top errors:', error);
        this.loadingErrors = false;
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
        this.loadingSessions = false;
      }
    });
  }

  loadErrorsForSession(sessionId: number) {
    this.loading = true;
    this.errorService.getErrors(sessionId).subscribe({
      next: (errors) => {
        this.errors = errors;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading errors for session:', error);
        this.snackBar.open('Failed to load errors', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  generateRandomErrorRound() {
    if (!this.selectedSessionId) {
      this.snackBar.open('Please select a training session', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.errorService.generateRandomErrorRound(
      this.selectedSessionId, 
      this.roundNumber, 
      this.wordCount
    ).subscribe({
      next: (response) => {
        this.snackBar.open('Random error round generated successfully', 'Close', { duration: 3000 });
        this.loadErrorRounds();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error generating random error round:', error);
        this.snackBar.open('Failed to generate error round', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  loadErrorRounds() {
    if (!this.selectedSessionId) return;

    this.errorService.getErrorTrainingRounds(this.selectedSessionId).subscribe({
      next: (rounds) => {
        this.errorRounds = rounds;
      },
      error: (error) => {
        console.error('Error loading error rounds:', error);
      }
    });
  }

  startErrorTraining(round: ErrorTrainingRound) {
    this.currentRound = round;
    
    // Get word details for the round
    this.wordService.getWords().subscribe({
      next: (words) => {
        this.trainingWords = words.filter(w => round.word_ids.includes(w.id));
        
        if (this.trainingWords.length === 0) {
          this.snackBar.open('No words found for this round', 'Close', { duration: 3000 });
          return;
        }

        this.startTraining();
      },
      error: (error) => {
        console.error('Error loading words for training:', error);
        this.snackBar.open('Failed to load words for training', 'Close', { duration: 3000 });
      }
    });
  }

  startTraining() {
    this.isTraining = true;
    this.isPaused = false;
    this.currentWordIndex = 0;
    this.trainingResults = [];
    this.userInput = '';
    this.showAnswer = false;

    this.loadCurrentWord();
  }

  loadCurrentWord() {
    if (this.currentWordIndex >= this.trainingWords.length) {
      this.finishTraining();
      return;
    }

    this.currentWord = this.trainingWords[this.currentWordIndex];
    this.userInput = '';
    this.showAnswer = false;

    this.playCurrentWord();
  }

  playCurrentWord() {
    if (!this.currentWord) return;

    const audioUrl = this.accent === 'us' ? this.currentWord.audio_url_us : this.currentWord.audio_url_uk;
    
    if (audioUrl) {
      this.wordService.playAudio(audioUrl).catch(() => {
        this.wordService.speakWord(this.currentWord!.word, this.accent, this.speed);
      });
    } else {
      this.wordService.speakWord(this.currentWord.word, this.accent, this.speed);
    }
  }

  checkAnswer() {
    if (!this.currentWord) return;

    const isCorrect = this.userInput.toLowerCase().trim() === this.currentWord.word.toLowerCase();
    const startTime = Date.now();
    
    // Record result
    this.trainingResults.push({
      wordId: this.currentWord.id,
      isCorrect,
      userInput: this.userInput,
      errorType: isCorrect ? undefined : 'spelling',
      timeSpent: Date.now() - startTime
    });

    this.showAnswer = true;
    this.startCountdown();
  }

  startCountdown() {
    this.countdown = 3;
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.currentWordIndex++;
        this.loadCurrentWord();
      }
    }, 1000);
  }

  pauseTraining() {
    this.isPaused = true;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  resumeTraining() {
    this.isPaused = false;
    this.startCountdown();
  }

  stopTraining() {
    this.isTraining = false;
    this.isPaused = false;
    this.currentWord = null;
    this.currentWordIndex = 0;
    this.userInput = '';
    this.showAnswer = false;
    this.currentRound = null;
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  finishTraining() {
    this.stopTraining();
    
    if (this.currentRound && this.trainingResults.length > 0) {
      // Update round status
      this.errorService.updateErrorTrainingRoundStatus(
        this.currentRound.id, 
        'completed', 
        new Date().toISOString()
      ).subscribe({
        next: () => {
          const correctCount = this.trainingResults.filter(r => r.isCorrect).length;
          const accuracy = (correctCount / this.trainingResults.length) * 100;
          
          this.snackBar.open(
            `Error training completed! Accuracy: ${accuracy.toFixed(1)}%`, 
            'Close', 
            { duration: 5000 }
          );
          
          this.loadErrorRounds();
        },
        error: (error) => {
          console.error('Error updating round status:', error);
          this.snackBar.open('Training completed but status not updated', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onSessionChange() {
    if (this.selectedSessionId) {
      this.loadErrorsForSession(this.selectedSessionId);
      this.loadErrorRounds();
    }
  }

  getProgress(): number {
    if (this.trainingWords.length === 0) return 0;
    return ((this.currentWordIndex + 1) / this.trainingWords.length) * 100;
  }

  getCurrentWordProgress(): string {
    if (this.trainingWords.length === 0) return '0/0';
    return `${this.currentWordIndex + 1}/${this.trainingWords.length}`;
  }
}
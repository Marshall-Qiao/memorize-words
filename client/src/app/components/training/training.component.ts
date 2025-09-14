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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WordService, Word } from '../../services/word.service';
import { TrainingService, TrainingSession, TrainingResult } from '../../services/training.service';

@Component({
  selector: 'app-training',
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
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.scss']
})
export class TrainingComponent implements OnInit, OnDestroy {
  // Training state
  isTraining = false;
  isPaused = false;
  currentWordIndex = 0;
  currentWord: Word | null = null;
  words: Word[] = [];
  trainingResults: TrainingResult[] = [];
  
  // Training settings
  sessionName = '';
  repeatCount = 1;
  interval = 2;
  accent: 'us' | 'uk' = 'us';
  speed = 1.0;
  startFrom = 0;
  
  // UI state
  userInput = '';
  showAnswer = false;
  currentRepeat = 0;
  countdown = 0;
  countdownInterval: any;
  
  // Available words
  availableWords: Word[] = [];
  selectedWordIds: number[] = [];

  constructor(
    private wordService: WordService,
    private trainingService: TrainingService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadAvailableWords();
  }

  ngOnDestroy() {
    this.stopTraining();
  }

  loadAvailableWords() {
    this.wordService.getWords().subscribe({
      next: (words) => {
        this.availableWords = words;
      },
      error: (error) => {
        console.error('Error loading words:', error);
        this.snackBar.open('Failed to load words', 'Close', { duration: 3000 });
      }
    });
  }

  startTraining() {
    if (this.selectedWordIds.length === 0) {
      this.snackBar.open('Please select words to train', 'Close', { duration: 3000 });
      return;
    }

    if (!this.sessionName.trim()) {
      this.sessionName = `Training ${new Date().toLocaleString()}`;
    }

    // Filter words based on selection
    this.words = this.availableWords.filter(w => this.selectedWordIds.includes(w.id));
    
    // Apply start from setting
    if (this.startFrom > 0) {
      this.words = this.words.slice(this.startFrom - 1);
    }

    if (this.words.length === 0) {
      this.snackBar.open('No words selected for training', 'Close', { duration: 3000 });
      return;
    }

    // Initialize training state
    this.isTraining = true;
    this.isPaused = false;
    this.currentWordIndex = 0;
    this.currentRepeat = 0;
    this.trainingResults = [];
    this.userInput = '';
    this.showAnswer = false;

    // Start with first word
    this.loadCurrentWord();
  }

  loadCurrentWord() {
    if (this.currentWordIndex >= this.words.length) {
      this.finishTraining();
      return;
    }

    this.currentWord = this.words[this.currentWordIndex];
    this.userInput = '';
    this.showAnswer = false;
    this.currentRepeat = 0;

    // Play word pronunciation
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
    this.currentRepeat++;

    if (this.currentRepeat < this.repeatCount) {
      // Continue with same word
      this.startCountdown();
    } else {
      // Move to next word
      this.currentWordIndex++;
      this.startCountdown();
    }
  }

  startCountdown() {
    this.countdown = this.interval;
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        if (this.currentRepeat < this.repeatCount) {
          // Repeat current word
          this.userInput = '';
          this.showAnswer = false;
          this.playCurrentWord();
        } else {
          // Move to next word
          this.loadCurrentWord();
        }
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
    this.currentRepeat = 0;
    this.userInput = '';
    this.showAnswer = false;
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  finishTraining() {
    this.stopTraining();
    
    // Save training results
    if (this.trainingResults.length > 0) {
      // Create training session
      this.trainingService.createSession(
        this.sessionName,
        this.selectedWordIds,
        {
          repeatCount: this.repeatCount,
          interval: this.interval,
          accent: this.accent,
          speed: this.speed,
          startFrom: this.startFrom
        }
      ).subscribe({
        next: (session) => {
          // Save results
          this.trainingService.saveTrainingResults(session.id, this.trainingResults).subscribe({
            next: () => {
              const correctCount = this.trainingResults.filter(r => r.isCorrect).length;
              const accuracy = (correctCount / this.trainingResults.length) * 100;
              
              this.snackBar.open(
                `Training completed! Accuracy: ${accuracy.toFixed(1)}%`, 
                'Close', 
                { duration: 5000 }
              );
            },
            error: (error) => {
              console.error('Error saving training results:', error);
              this.snackBar.open('Training completed but results not saved', 'Close', { duration: 3000 });
            }
          });
        },
        error: (error) => {
          console.error('Error creating training session:', error);
          this.snackBar.open('Training completed but session not saved', 'Close', { duration: 3000 });
        }
      });
    }
  }

  toggleWordSelection(wordId: number) {
    const index = this.selectedWordIds.indexOf(wordId);
    if (index > -1) {
      this.selectedWordIds.splice(index, 1);
    } else {
      this.selectedWordIds.push(wordId);
    }
  }

  isWordSelected(wordId: number): boolean {
    return this.selectedWordIds.includes(wordId);
  }

  selectAllWords() {
    this.selectedWordIds = this.availableWords.map(w => w.id);
  }

  clearSelection() {
    this.selectedWordIds = [];
  }

  getProgress(): number {
    if (this.words.length === 0) return 0;
    return ((this.currentWordIndex + 1) / this.words.length) * 100;
  }

  getCurrentWordProgress(): string {
    if (this.words.length === 0) return '0/0';
    return `${this.currentWordIndex + 1}/${this.words.length}`;
  }
}
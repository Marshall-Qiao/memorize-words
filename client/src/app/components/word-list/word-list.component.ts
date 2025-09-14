import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { WordService, Word } from '../../services/word.service';

@Component({
  selector: 'app-word-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatListModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatCheckboxModule
  ],
  templateUrl: './word-list.component.html',
  styleUrls: ['./word-list.component.scss']
})
export class WordListComponent implements OnInit {
  words: Word[] = [];
  filteredWords: Word[] = [];
  loading = false;
  searchQuery = '';
  newWord = '';
  selectedWords: number[] = [];
  accent: 'us' | 'uk' = 'us';
  speed = 1.0;

  constructor(
    private wordService: WordService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadWords();
  }

  loadWords() {
    this.loading = true;
    this.wordService.getWords().subscribe({
      next: (words) => {
        this.words = words;
        this.filteredWords = words;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading words:', error);
        this.snackBar.open('Failed to load words', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  searchWords() {
    if (this.searchQuery.trim()) {
      this.wordService.searchWords(this.searchQuery).subscribe({
        next: (words) => {
          this.filteredWords = words;
        },
        error: (error) => {
          console.error('Error searching words:', error);
          this.snackBar.open('Search failed', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.filteredWords = this.words;
    }
  }

  addWord() {
    if (!this.newWord.trim()) {
      this.snackBar.open('Please enter a word', 'Close', { duration: 3000 });
      return;
    }

    this.wordService.addWord(this.newWord.trim()).subscribe({
      next: (response) => {
        this.snackBar.open('Word added successfully', 'Close', { duration: 3000 });
        this.newWord = '';
        this.loadWords();
      },
      error: (error) => {
        console.error('Error adding word:', error);
        this.snackBar.open('Failed to add word', 'Close', { duration: 3000 });
      }
    });
  }

  addWordsFromText() {
    const text = prompt('Enter words separated by commas, spaces, or new lines:');
    if (!text) return;

    const words = text
      .split(/[,\s\n]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    if (words.length === 0) {
      this.snackBar.open('No valid words found', 'Close', { duration: 3000 });
      return;
    }

    this.wordService.addWords(words).subscribe({
      next: (response) => {
        this.snackBar.open(`${words.length} words added successfully`, 'Close', { duration: 3000 });
        this.loadWords();
      },
      error: (error) => {
        console.error('Error adding words:', error);
        this.snackBar.open('Failed to add words', 'Close', { duration: 3000 });
      }
    });
  }

  toggleWordSelection(wordId: number) {
    const index = this.selectedWords.indexOf(wordId);
    if (index > -1) {
      this.selectedWords.splice(index, 1);
    } else {
      this.selectedWords.push(wordId);
    }
  }

  isWordSelected(wordId: number): boolean {
    return this.selectedWords.includes(wordId);
  }

  selectAllWords() {
    this.selectedWords = this.filteredWords.map(w => w.id);
  }

  clearSelection() {
    this.selectedWords = [];
  }

  playWord(word: Word) {
    const audioUrl = this.accent === 'us' ? word.audio_url_us : word.audio_url_uk;
    
    if (audioUrl) {
      this.wordService.playAudio(audioUrl).catch(() => {
        // Fallback to TTS if audio file fails
        this.wordService.speakWord(word.word, this.accent, this.speed);
      });
    } else {
      // Download audio first, then play
      this.wordService.downloadAudio(word.id, this.accent).subscribe({
        next: (response) => {
          this.wordService.playAudio(response.audioUrl).catch(() => {
            this.wordService.speakWord(word.word, this.accent, this.speed);
          });
        },
        error: () => {
          // Fallback to TTS
          this.wordService.speakWord(word.word, this.accent, this.speed);
        }
      });
    }
  }

  deleteWord(word: Word) {
    if (confirm(`Are you sure you want to delete the word "${word.word}"?`)) {
      this.wordService.deleteWord(word.id).subscribe({
        next: () => {
          this.snackBar.open('Word deleted successfully', 'Close', { duration: 3000 });
          this.loadWords();
        },
        error: (error) => {
          console.error('Error deleting word:', error);
          this.snackBar.open('Failed to delete word', 'Close', { duration: 3000 });
        }
      });
    }
  }

  startTraining() {
    if (this.selectedWords.length === 0) {
      this.snackBar.open('Please select words to train', 'Close', { duration: 3000 });
      return;
    }
    
    // Navigate to training with selected words
    // This would be implemented in the training component
    console.log('Starting training with words:', this.selectedWords);
  }
}
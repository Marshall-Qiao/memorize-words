import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Word {
  id: number;
  word: string;
  pronunciation_us?: string;
  pronunciation_uk?: string;
  audio_url_us?: string;
  audio_url_uk?: string;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class WordService {
  private apiUrl = 'http://localhost:3000/api/words';

  constructor(private http: HttpClient) { }

  // 获取所有单词
  getWords(): Observable<Word[]> {
    return this.http.get<Word[]>(this.apiUrl);
  }

  // 添加单词
  addWord(word: string): Observable<any> {
    return this.http.post(this.apiUrl, { word });
  }

  // 批量添加单词
  addWords(words: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch`, { words });
  }

  // 搜索单词
  searchWords(query: string, limit: number = 50): Observable<Word[]> {
    return this.http.get<Word[]>(`${this.apiUrl}/search/${query}?limit=${limit}`);
  }

  // 获取单词音频URL
  getAudioUrl(wordId: number, accent: 'us' | 'uk' = 'us'): Observable<any> {
    return this.http.get(`${this.apiUrl}/${wordId}/audio?accent=${accent}`);
  }

  // 下载音频文件
  downloadAudio(wordId: number, accent: 'us' | 'uk' = 'us'): Observable<any> {
    return this.http.post(`${this.apiUrl}/${wordId}/download-audio`, { accent });
  }

  // 删除单词
  deleteWord(wordId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${wordId}`);
  }

  // 播放音频（使用Web Audio API）
  playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.onended = () => resolve();
      audio.onerror = (error) => reject(error);
      audio.play().catch(reject);
    });
  }

  // 使用TTS朗读单词
  speakWord(word: string, accent: 'us' | 'uk' = 'us', speed: number = 1.0): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = speed;
      utterance.lang = accent === 'us' ? 'en-US' : 'en-GB';
      speechSynthesis.speak(utterance);
    }
  }
}
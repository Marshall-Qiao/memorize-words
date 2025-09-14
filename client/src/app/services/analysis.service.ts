import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OverviewAnalysis {
  basicStats: {
    total_sessions: number;
    total_words: number;
    total_errors: number;
    avg_accuracy: number;
    total_time_seconds: number;
  };
  errorTypes: Array<{
    error_type: string;
    count: number;
    percentage: number;
  }>;
  dailyProgress: Array<{
    date: string;
    sessions_count: number;
    errors_count: number;
    avg_accuracy: number;
  }>;
  topErrorWords: Array<{
    word: string;
    word_id: number;
    error_count: number;
    last_error: string;
    error_percentage: number;
  }>;
  weeklyTrend: Array<{
    week: string;
    sessions_count: number;
    errors_count: number;
    avg_accuracy: number;
    total_time_seconds: number;
  }>;
  period: string;
}

export interface SessionAnalysis {
  session: any;
  errors: any[];
  errorTypeStats: any[];
  wordDifficulty: any[];
}

export interface ProgressAnalysis {
  progress: Array<{
    period: string;
    sessions_count: number;
    unique_words_learned: number;
    total_errors: number;
    avg_accuracy: number;
    total_time_seconds: number;
    accuracy_trend: number;
  }>;
  groupBy: string;
  period: string;
}

export interface WordMastery {
  wordMastery: Array<{
    word: string;
    word_id: number;
    practice_sessions: number;
    total_errors: number;
    last_error: string;
    first_error: string;
    error_rate: number;
    mastery_level: 'mastered' | 'good' | 'needs_practice' | 'difficult';
  }>;
  masteryStats: Array<{
    mastery_level: string;
    word_count: number;
    percentage: number;
  }>;
  period: string;
}

export interface Recommendations {
  practiceRecommendations: Array<{
    word: string;
    word_id: number;
    error_count: number;
    last_error: string;
    days_since_last_error: number;
    error_frequency: number;
  }>;
  newWords: Array<{
    word: string;
    word_id: number;
    created_at: string;
  }>;
  totalRecommendations: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private apiUrl = 'http://localhost:3000/api/analysis';

  constructor(private http: HttpClient) { }

  // 获取整体分析数据
  getOverview(days: number = 30): Observable<OverviewAnalysis> {
    return this.http.get<OverviewAnalysis>(`${this.apiUrl}/overview?days=${days}`);
  }

  // 获取会话详细分析
  getSessionAnalysis(sessionId: number): Observable<SessionAnalysis> {
    return this.http.get<SessionAnalysis>(`${this.apiUrl}/session/${sessionId}`);
  }

  // 获取学习进度分析
  getProgressAnalysis(days: number = 30, groupBy: string = 'day'): Observable<ProgressAnalysis> {
    return this.http.get<ProgressAnalysis>(`${this.apiUrl}/progress?days=${days}&groupBy=${groupBy}`);
  }

  // 获取单词掌握程度分析
  getWordMastery(days: number = 30, limit: number = 50): Observable<WordMastery> {
    return this.http.get<WordMastery>(`${this.apiUrl}/word-mastery?days=${days}&limit=${limit}`);
  }

  // 获取推荐学习内容
  getRecommendations(limit: number = 10): Observable<Recommendations> {
    return this.http.get<Recommendations>(`${this.apiUrl}/recommendations?limit=${limit}`);
  }
}
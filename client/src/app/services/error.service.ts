import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WordError {
  id: number;
  word_id: number;
  session_id: number;
  error_type: 'spelling' | 'pronunciation' | 'recognition';
  user_input: string;
  correct_answer: string;
  error_count: number;
  created_at: string;
  word?: string;
  session_name?: string;
}

export interface ErrorStats {
  error_type: string;
  error_count: number;
  unique_words: number;
  sessions_affected: number;
}

export interface TopError {
  word: string;
  word_id: number;
  error_count: number;
  last_error: string;
  error_types: string;
  error_percentage: number;
}

export interface ErrorTrainingRound {
  id: number;
  session_id: number;
  word_ids: number[];
  round_number: number;
  created_at: string;
  completed_at?: string;
  status: 'active' | 'completed';
  session_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private apiUrl = 'http://localhost:3000/api/errors';

  constructor(private http: HttpClient) { }

  // 获取错误记录
  getErrors(sessionId?: number, wordId?: number, errorType?: string, limit: number = 100): Observable<WordError[]> {
    let params = `?limit=${limit}`;
    if (sessionId) params += `&sessionId=${sessionId}`;
    if (wordId) params += `&wordId=${wordId}`;
    if (errorType) params += `&errorType=${errorType}`;
    
    return this.http.get<WordError[]>(`${this.apiUrl}${params}`);
  }

  // 获取错误统计
  getErrorStats(sessionId?: number, days: number = 30): Observable<ErrorStats[]> {
    let params = `?days=${days}`;
    if (sessionId) params += `&sessionId=${sessionId}`;
    
    return this.http.get<ErrorStats[]>(`${this.apiUrl}/stats${params}`);
  }

  // 获取最常出错的单词
  getTopErrors(limit: number = 20, days: number = 30): Observable<TopError[]> {
    return this.http.get<TopError[]>(`${this.apiUrl}/top-errors?limit=${limit}&days=${days}`);
  }

  // 创建错误训练轮次
  createErrorTrainingRound(sessionId: number, wordIds: number[], roundNumber?: number): Observable<ErrorTrainingRound> {
    return this.http.post<ErrorTrainingRound>(`${this.apiUrl}/training-rounds`, {
      sessionId,
      wordIds,
      roundNumber
    });
  }

  // 获取错误训练轮次
  getErrorTrainingRounds(sessionId?: number, status: string = 'active'): Observable<ErrorTrainingRound[]> {
    let params = `?status=${status}`;
    if (sessionId) params += `&sessionId=${sessionId}`;
    
    return this.http.get<ErrorTrainingRound[]>(`${this.apiUrl}/training-rounds${params}`);
  }

  // 更新错误训练轮次状态
  updateErrorTrainingRoundStatus(roundId: number, status: string, completedAt?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/training-rounds/${roundId}/status`, {
      status,
      completedAt
    });
  }

  // 生成随机错误训练轮次
  generateRandomErrorRound(sessionId: number, roundNumber?: number, wordCount: number = 10): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate-random-round`, {
      sessionId,
      roundNumber,
      wordCount
    });
  }

  // 删除错误记录
  deleteError(errorId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${errorId}`);
  }
}
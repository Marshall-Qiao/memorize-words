import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TrainingSession {
  id: number;
  session_name: string;
  word_ids: number[];
  settings: any;
  created_at: string;
  completed_at?: string;
  status: 'active' | 'completed' | 'paused';
  words?: any[];
  error_count?: number;
}

export interface TrainingResult {
  wordId: number;
  isCorrect: boolean;
  userInput?: string;
  errorType?: string;
  timeSpent: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private apiUrl = 'http://localhost:3000/api/training';

  constructor(private http: HttpClient) { }

  // 创建训练会话
  createSession(sessionName: string, wordIds: number[], settings: any): Observable<TrainingSession> {
    return this.http.post<TrainingSession>(`${this.apiUrl}/sessions`, {
      sessionName,
      wordIds,
      settings
    });
  }

  // 获取所有训练会话
  getSessions(): Observable<TrainingSession[]> {
    return this.http.get<TrainingSession[]>(`${this.apiUrl}/sessions`);
  }

  // 获取特定训练会话
  getSession(sessionId: number): Observable<TrainingSession> {
    return this.http.get<TrainingSession>(`${this.apiUrl}/sessions/${sessionId}`);
  }

  // 更新训练会话状态
  updateSessionStatus(sessionId: number, status: string, completedAt?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/sessions/${sessionId}/status`, {
      status,
      completedAt
    });
  }

  // 保存训练结果
  saveTrainingResults(sessionId: number, results: TrainingResult[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/sessions/${sessionId}/results`, {
      results
    });
  }

  // 删除训练会话
  deleteSession(sessionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sessions/${sessionId}`);
  }
}
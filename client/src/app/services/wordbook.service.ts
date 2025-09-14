import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Wordbook {
  id: number;
  name: string;
  description: string;
  type: 'system' | 'user_upload';
  source?: string;
  total_words: number;
  created_at: string;
  created_by_username?: string;
}

export interface Word {
  id: number;
  word: string;
  pronunciation_us?: string;
  pronunciation_uk?: string;
  audio_url_us?: string;
  audio_url_uk?: string;
  definition?: string;
  example_sentence?: string;
  wordbook_id: number;
  created_at: string;
  updated_at: string;
}

export interface WordbookWordsResponse {
  words: Word[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateWordbookRequest {
  name: string;
  description?: string;
}

export interface UploadWordsResponse {
  message: string;
  inserted: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class WordbookService {
  private apiUrl = 'http://localhost:3000/api/wordbooks';

  constructor(private http: HttpClient) { }

  // 获取所有词书
  getWordbooks(): Observable<Wordbook[]> {
    return this.http.get<Wordbook[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    });
  }

  // 获取词书详情
  getWordbook(id: number): Observable<Wordbook> {
    return this.http.get<Wordbook>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // 获取词书中的单词
  getWordbookWords(id: number, page: number = 1, limit: number = 50): Observable<WordbookWordsResponse> {
    return this.http.get<WordbookWordsResponse>(`${this.apiUrl}/${id}/words`, {
      headers: this.getAuthHeaders(),
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  // 创建词书
  createWordbook(wordbookData: CreateWordbookRequest): Observable<{ message: string; wordbook: Wordbook }> {
    return this.http.post<{ message: string; wordbook: Wordbook }>(this.apiUrl, wordbookData, {
      headers: this.getAuthHeaders()
    });
  }

  // 上传词书CSV文件
  uploadWords(id: number, file: File): Observable<UploadWordsResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadWordsResponse>(`${this.apiUrl}/${id}/upload`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  // 删除词书
  deleteWordbook(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // 获取认证头
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}

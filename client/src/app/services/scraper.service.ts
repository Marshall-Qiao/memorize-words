import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ScrapeResponse {
  message: string;
  wordbook_id: number;
  inserted: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScraperService {
  private apiUrl = 'http://localhost:3000/api/scraper';

  constructor(private http: HttpClient) { }

  // 爬取四级词汇
  scrapeCET4(): Observable<ScrapeResponse> {
    return this.http.post<ScrapeResponse>(`${this.apiUrl}/cet4`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // 爬取雅思词汇
  scrapeIELTS(): Observable<ScrapeResponse> {
    return this.http.post<ScrapeResponse>(`${this.apiUrl}/ielts`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // 爬取托福词汇
  scrapeTOEFL(): Observable<ScrapeResponse> {
    return this.http.post<ScrapeResponse>(`${this.apiUrl}/toefl`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // 获取认证头
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}

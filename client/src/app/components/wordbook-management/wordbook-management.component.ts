import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WordbookService, Wordbook, CreateWordbookRequest } from '../../services/wordbook.service';
import { ScraperService } from '../../services/scraper.service';

@Component({
  selector: 'app-wordbook-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wordbook-management">
      <div class="header">
        <h2>词书管理</h2>
        <button class="btn btn-primary" (click)="showCreateForm = !showCreateForm">
          {{ showCreateForm ? '取消' : '创建词书' }}
        </button>
      </div>

      <!-- 创建词书表单 -->
      <div class="create-form" *ngIf="showCreateForm">
        <h3>创建新词书</h3>
        <form (ngSubmit)="createWordbook()" #createForm="ngForm">
          <div class="form-group">
            <label for="name">词书名称</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              [(ngModel)]="newWordbook.name" 
              required 
              class="form-control"
              placeholder="请输入词书名称"
            >
          </div>
          <div class="form-group">
            <label for="description">词书描述</label>
            <textarea 
              id="description" 
              name="description" 
              [(ngModel)]="newWordbook.description" 
              class="form-control"
              placeholder="请输入词书描述（可选）"
              rows="3"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="!createForm.form.valid || isLoading">
              {{ isLoading ? '创建中...' : '创建' }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="showCreateForm = false">
              取消
            </button>
          </div>
        </form>
      </div>

      <!-- 系统词书爬取 -->
      <div class="scraper-section">
        <h3>系统词书</h3>
        <p>点击下方按钮爬取系统词书数据：</p>
        <div class="scraper-buttons">
          <button class="btn btn-success" (click)="scrapeWords('cet4')" [disabled]="isScraping">
            {{ isScraping === 'cet4' ? '爬取中...' : '爬取四级词汇' }}
          </button>
          <button class="btn btn-success" (click)="scrapeWords('ielts')" [disabled]="isScraping">
            {{ isScraping === 'ielts' ? '爬取中...' : '爬取雅思词汇' }}
          </button>
          <button class="btn btn-success" (click)="scrapeWords('toefl')" [disabled]="isScraping">
            {{ isScraping === 'toefl' ? '爬取中...' : '爬取托福词汇' }}
          </button>
        </div>
      </div>

      <!-- 词书列表 -->
      <div class="wordbook-list">
        <h3>词书列表</h3>
        <div class="wordbooks" *ngIf="wordbooks.length > 0; else noWordbooks">
          <div class="wordbook-card" *ngFor="let wordbook of wordbooks">
            <div class="wordbook-info">
              <h4>{{ wordbook.name }}</h4>
              <p class="description">{{ wordbook.description }}</p>
              <div class="wordbook-meta">
                <span class="type" [class.system]="wordbook.type === 'system'">
                  {{ wordbook.type === 'system' ? '系统词书' : '用户词书' }}
                </span>
                <span class="word-count">{{ wordbook.total_words }} 个单词</span>
                <span class="created-by" *ngIf="wordbook.created_by_username">
                  创建者：{{ wordbook.created_by_username }}
                </span>
              </div>
            </div>
            <div class="wordbook-actions">
              <button class="btn btn-primary" (click)="viewWords(wordbook)">
                查看单词
              </button>
              <button class="btn btn-info" (click)="uploadWords(wordbook)" *ngIf="wordbook.type === 'user_upload'">
                上传单词
              </button>
              <button class="btn btn-danger" (click)="deleteWordbook(wordbook)" *ngIf="wordbook.type === 'user_upload'">
                删除
              </button>
            </div>
          </div>
        </div>
        <ng-template #noWordbooks>
          <div class="no-wordbooks">
            <p>暂无词书，请先创建词书或爬取系统词书。</p>
          </div>
        </ng-template>
      </div>

      <!-- 文件上传模态框 -->
      <div class="modal" *ngIf="showUploadModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>上传单词文件</h3>
            <button class="close" (click)="closeUploadModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p>请选择CSV文件，格式：单词,释义,例句</p>
            <input 
              type="file" 
              #fileInput 
              accept=".csv" 
              (change)="onFileSelected($event)"
              class="file-input"
            >
            <div class="file-info" *ngIf="selectedFile">
              <p>已选择文件：{{ selectedFile.name }}</p>
              <p>文件大小：{{ (selectedFile.size / 1024).toFixed(2) }} KB</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" (click)="uploadFile()" [disabled]="!selectedFile || isUploading">
              {{ isUploading ? '上传中...' : '上传' }}
            </button>
            <button class="btn btn-secondary" (click)="closeUploadModal()">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wordbook-management {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .header h2 {
      margin: 0;
      color: #333;
    }

    .create-form {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }

    .create-form h3 {
      margin-top: 0;
      color: #333;
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      color: #555;
      font-weight: 500;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
    }

    .form-actions {
      display: flex;
      gap: 10px;
    }

    .scraper-section {
      background: #e8f5e8;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }

    .scraper-section h3 {
      margin-top: 0;
      color: #333;
    }

    .scraper-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .wordbook-list h3 {
      color: #333;
      margin-bottom: 20px;
    }

    .wordbooks {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .wordbook-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .wordbook-info h4 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .description {
      color: #666;
      margin-bottom: 15px;
      font-size: 14px;
    }

    .wordbook-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 15px;
    }

    .type {
      background: #e9ecef;
      color: #495057;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .type.system {
      background: #d4edda;
      color: #155724;
    }

    .word-count {
      background: #cce5ff;
      color: #004085;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .created-by {
      color: #666;
      font-size: 12px;
    }

    .wordbook-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .no-wordbooks {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.3s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #1e7e34;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-info:hover:not(:disabled) {
      background: #138496;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #c82333;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #545b62;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #ddd;
    }

    .modal-header h3 {
      margin: 0;
    }

    .close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
    }

    .modal-body {
      padding: 20px;
    }

    .file-input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 15px;
    }

    .file-info {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
    }

    .file-info p {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px;
      border-top: 1px solid #ddd;
    }
  `]
})
export class WordbookManagementComponent implements OnInit {
  wordbooks: Wordbook[] = [];
  showCreateForm = false;
  isLoading = false;
  isScraping: string | null = null;
  showUploadModal = false;
  selectedFile: File | null = null;
  selectedWordbook: Wordbook | null = null;
  isUploading = false;

  newWordbook: CreateWordbookRequest = {
    name: '',
    description: ''
  };

  constructor(
    private wordbookService: WordbookService,
    private scraperService: ScraperService
  ) {}

  ngOnInit(): void {
    this.loadWordbooks();
  }

  loadWordbooks(): void {
    this.isLoading = true;
    this.wordbookService.getWordbooks().subscribe({
      next: (wordbooks) => {
        this.wordbooks = wordbooks;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading wordbooks:', error);
        alert('加载词书失败：' + (error.error?.error || '未知错误'));
        this.isLoading = false;
      }
    });
  }

  createWordbook(): void {
    this.isLoading = true;
    this.wordbookService.createWordbook(this.newWordbook).subscribe({
      next: (response) => {
        console.log('Wordbook created:', response);
        this.newWordbook = { name: '', description: '' };
        this.showCreateForm = false;
        this.loadWordbooks();
        alert('词书创建成功！');
      },
      error: (error) => {
        console.error('Error creating wordbook:', error);
        alert('创建词书失败：' + (error.error?.error || '未知错误'));
        this.isLoading = false;
      }
    });
  }

  scrapeWords(type: string): void {
    this.isScraping = type;
    
    let scrapeObservable;
    switch (type) {
      case 'cet4':
        scrapeObservable = this.scraperService.scrapeCET4();
        break;
      case 'ielts':
        scrapeObservable = this.scraperService.scrapeIELTS();
        break;
      case 'toefl':
        scrapeObservable = this.scraperService.scrapeTOEFL();
        break;
      default:
        return;
    }

    scrapeObservable.subscribe({
      next: (response) => {
        console.log('Scraping successful:', response);
        this.loadWordbooks();
        alert(`${type.toUpperCase()}词汇爬取成功！共插入 ${response.inserted} 个单词`);
      },
      error: (error) => {
        console.error('Scraping error:', error);
        alert('爬取失败：' + (error.error?.error || '未知错误'));
      },
      complete: () => {
        this.isScraping = null;
      }
    });
  }

  viewWords(wordbook: Wordbook): void {
    // 这里可以导航到单词列表页面
    console.log('View words for wordbook:', wordbook);
    // this.router.navigate(['/words'], { queryParams: { wordbook_id: wordbook.id } });
  }

  uploadWords(wordbook: Wordbook): void {
    this.selectedWordbook = wordbook;
    this.showUploadModal = true;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      this.selectedFile = file;
    } else {
      alert('请选择CSV文件');
      this.selectedFile = null;
    }
  }

  uploadFile(): void {
    if (!this.selectedFile || !this.selectedWordbook) return;

    this.isUploading = true;
    this.wordbookService.uploadWords(this.selectedWordbook.id, this.selectedFile).subscribe({
      next: (response) => {
        console.log('Upload successful:', response);
        this.closeUploadModal();
        this.loadWordbooks();
        alert(`上传成功！共插入 ${response.inserted} 个单词`);
      },
      error: (error) => {
        console.error('Upload error:', error);
        alert('上传失败：' + (error.error?.error || '未知错误'));
        this.isUploading = false;
      }
    });
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.selectedFile = null;
    this.selectedWordbook = null;
  }

  deleteWordbook(wordbook: Wordbook): void {
    if (confirm(`确定要删除词书"${wordbook.name}"吗？此操作不可撤销。`)) {
      this.wordbookService.deleteWordbook(wordbook.id).subscribe({
        next: (response) => {
          console.log('Wordbook deleted:', response);
          this.loadWordbooks();
          alert('词书删除成功！');
        },
        error: (error) => {
          console.error('Error deleting wordbook:', error);
          alert('删除词书失败：' + (error.error?.error || '未知错误'));
        }
      });
    }
  }
}

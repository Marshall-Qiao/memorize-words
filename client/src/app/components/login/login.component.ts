import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest, RegisterRequest } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>{{ isLoginMode ? '登录' : '注册' }}</h2>
        
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">用户名</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              [(ngModel)]="formData.username" 
              required 
              class="form-control"
              placeholder="请输入用户名"
            >
          </div>

          <div class="form-group" *ngIf="!isLoginMode">
            <label for="email">邮箱</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              [(ngModel)]="formData.email" 
              required 
              class="form-control"
              placeholder="请输入邮箱"
            >
          </div>

          <div class="form-group">
            <label for="password">密码</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              [(ngModel)]="formData.password" 
              required 
              class="form-control"
              placeholder="请输入密码"
            >
          </div>

          <button 
            type="submit" 
            class="btn btn-primary" 
            [disabled]="!loginForm.form.valid || isLoading"
          >
            {{ isLoading ? '处理中...' : (isLoginMode ? '登录' : '注册') }}
          </button>
        </form>

        <div class="switch-mode">
          <p>
            {{ isLoginMode ? '还没有账号？' : '已有账号？' }}
            <a href="#" (click)="toggleMode($event)">{{ isLoginMode ? '立即注册' : '立即登录' }}</a>
          </p>
        </div>

        <div class="demo-account" *ngIf="isLoginMode">
          <p>演示账号：</p>
          <p>用户名：demo</p>
          <p>密码：123456</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
    }

    .login-card h2 {
      text-align: center;
      margin-bottom: 30px;
      color: #333;
      font-size: 28px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      color: #555;
      font-weight: 500;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      border: 2px solid #e1e5e9;
      border-radius: 5px;
      font-size: 16px;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .switch-mode {
      text-align: center;
      margin-top: 20px;
    }

    .switch-mode a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .switch-mode a:hover {
      text-decoration: underline;
    }

    .demo-account {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
      text-align: center;
    }

    .demo-account p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
  `]
})
export class LoginComponent {
  isLoginMode = true;
  isLoading = false;
  formData: LoginRequest & RegisterRequest = {
    username: '',
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleMode(event: Event): void {
    event.preventDefault();
    this.isLoginMode = !this.isLoginMode;
    this.formData = { username: '', email: '', password: '' };
  }

  onSubmit(): void {
    if (this.isLoginMode) {
      this.login();
    } else {
      this.register();
    }
  }

  login(): void {
    this.isLoading = true;
    const loginData: LoginRequest = {
      username: this.formData.username,
      password: this.formData.password
    };

    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Login error:', error);
        alert('登录失败：' + (error.error?.error || '未知错误'));
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  register(): void {
    this.isLoading = true;
    const registerData: RegisterRequest = {
      username: this.formData.username,
      email: this.formData.email,
      password: this.formData.password
    };

    this.authService.register(registerData).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Registration error:', error);
        alert('注册失败：' + (error.error?.error || '未知错误'));
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}

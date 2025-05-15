import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  // private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/api/auth/login`, { email, password }).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      })
    );
  }

  register(email: string, password: string, name?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/register`, { email, password, name });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): { id: number; email: string; role: string } | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Role-based checks
  isAdmin(): boolean {
    const user = this.getUser();
    return user ? user.role === 'Admin' : false;
  }

  isAnalyst(): boolean {
    const user = this.getUser();
    return user ? user.role === 'Analyst' : false;
  }

  isUser(): boolean {
    const user = this.getUser();
    return user ? user.role === 'User' : false;
  }

  getRole(): string | null {
    const user = this.getUser();
    return user ? user.role : null;
  }

  //user-management
  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/users`, { headers: this.getAuthHeaders() });
  }

  createUser(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/users`, user, { headers: this.getAuthHeaders() });
  }

  updateUser(id: number, user: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/users/${id}`, user, { headers: this.getAuthHeaders() });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/users/${id}`, { headers: this.getAuthHeaders() });
  }

  // KPI Management Methods
  getKpis(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/kpis`, { headers: this.getAuthHeaders() });
  }

  createKpi(kpiData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/kpis`, kpiData, {
      headers: this.getAuthHeaders()
    });
  }

  updateKpi(id: number, kpi: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/kpis/${id}`, kpi, { headers: this.getAuthHeaders() });
  }

  deleteKpi(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/kpis/${id}`, { headers: this.getAuthHeaders() });
  }
}
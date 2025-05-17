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
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  // private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/api/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        })
      );
  }

  register(email: string, password: string, name?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/register`, {
      email,
      password,
      name,
    });
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
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
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

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user ? user.role === role : false;
  }

  //user-management
  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/users`, {
      headers: this.getAuthHeaders(),
    });
  }

  createUser(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/users`, user, {
      headers: this.getAuthHeaders(),
    });
  }

  updateUser(id: number, user: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/users/${id}`, user, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/users/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // KPI Management Methods
  getKpis(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/kpis`, {
      headers: this.getAuthHeaders(),
    });
  }

  createKpi(kpiData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/kpis`, kpiData, {
      headers: this.getAuthHeaders(),
    });
  }

  updateKpi(id: number, kpi: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/kpis/${id}`, kpi, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteKpi(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/kpis/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getPerformanceHistory(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/api/performance-data/${this.getUser()?.id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  downloadAllKpiReport() {
    return this.http.get(`${this.apiUrl}/api/download/report/all`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob',
      observe: 'response',
    });
  }

  //Analytics Methods
  getAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/analytics/kpi/all`, {
      headers: this.getAuthHeaders(),
    });
  }

  downloadKpiReportForUser(kpiIds: number[], userId: number) {
    return this.http.post(`${this.apiUrl}/api/download/report`, { kpiIds, userId }, {
      headers: this.getAuthHeaders(),
      observe: 'response',
      responseType: 'blob'
    });
  }

  //Logs Methods
  getLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/logs`, {
      headers: this.getAuthHeaders(),
    });
  }

  createLog(logData: { userId: number; action: string; timestamp: string }) {
    const formattedTimestamp = this.formatTimestampForMySQL(
      new Date(logData.timestamp)
    );
    logData.timestamp = formattedTimestamp;
    return this.http.post(`${this.apiUrl}/api/logs`, logData, {
      headers: this.getAuthHeaders(),
    });
  }

  formatTimestampForMySQL(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      ' ' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes()) +
      ':' +
      pad(date.getSeconds())
    );
  }

  upsertPerformanceData(data: { user_id: number, kpi_id: number, value: number, frequency: string, date?: string }) {
    const freq = (data.frequency || '').toLowerCase();
    return this.http.post(`${this.apiUrl}/api/performance-data/upsert`, data, { headers: this.getAuthHeaders() });
  }

  saveInput(widget: any) {
    const user = this.getUser();
    if (!user) {
      alert('User session expired. Please log in again.');
      return;
    }
    const now = new Date();
    console.log('Fetching for', { userId: user.id, kpiId: Number(widget.id.replace('kpi-', '')), frequency: widget.frequency, date: now.toISOString() });
    this.upsertPerformanceData({
      user_id: user.id,
      kpi_id: Number(widget.id.replace('kpi-', '')),
      value: widget.inputValue,
      frequency: widget.frequency || 'Monthly',
      date: now.toISOString()
    }).subscribe(() => {
      widget.inputSaved = true;
    });
  }

  editInput(widget: any) {
    widget.inputSaved = false;
  }

  getPerformanceValueForPeriod(userId: number, kpiId: number, frequency: string, date: string) {
    const freq = (frequency || '').toLowerCase();

    return this.http.get<any>(
      `${this.apiUrl}/api/performance-data/value`,
      {
        params: { userId, kpiId, frequency, date },
        headers: this.getAuthHeaders()
      }
    ).pipe(
      tap((data) => {
        console.log('Backend returned:', data);
        console.log('userId:', userId, typeof userId);
        console.log('kpiId:', kpiId, typeof kpiId);
        console.log('frequency:', frequency);
        console.log('date:', date);
      })
    );
  }
}

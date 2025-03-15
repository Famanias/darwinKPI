import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent implements OnInit {
  kpis: any[] = [];

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    const headers = this.authService.getAuthHeaders();
    this.http.get('http://localhost:3000/api/kpis', { headers })
      .subscribe({
        next: (data: any) => {
          this.kpis = data;
        },
        error: (err) => {
          console.error('Error fetching KPIs:', err);
        }
      });
  }
}
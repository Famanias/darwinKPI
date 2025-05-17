import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  // standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent {
  logs: any[] = [];
  users: any[] = [];
  constructor(private authService: AuthService, private router: Router) {}

  getUserRole(): string | null {
    return this.authService.getRole();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.authService.getLogs().subscribe({
      next: (response) => {
        this.logs = response;
        console.log('Logs:', this.logs);
      },
      error: (err) => {
        console.error('Failed to load logs:', err);
      },
    });

    this.authService.getUsers().subscribe({
      next: (response) => {
        this.users = response;
        console.log('Users:', this.users);
      },
      error: (err) => {
        console.error('Failed to load users:', err);
      },
    });
  }

  getUsernameById(userId: number): string {
    const user = this.users.find((user) => user.id === userId);
    return user ? user.name : 'Unknown User';
  }

  convertDateWithTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
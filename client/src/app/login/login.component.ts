import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true, // Since you're using standalone components
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  error: string = '';

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error = '';
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        const user = this.authService.getUser();
        if (user) {
          switch (user.role) {
            case 'Admin':
              this.router.navigate(['/admin-dashboard']);
              break;
            case 'Analyst':
              this.router.navigate(['/analytics']);
              break;
            case 'User':
            default:
              this.router.navigate(['/dashboard']);
              break;
          }
        } else {
          this.router.navigate(['/dashboard']); // Fallback
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
    console.log('Navigating to register');
  }
}
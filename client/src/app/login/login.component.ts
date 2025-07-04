import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Add this import

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule], // Add MatSnackBarModule
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  error: string = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  onSubmit(): void {
    this.error = '';
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
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
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Login failed. Please try again.';
        this.snackBar.open(this.error, 'Close', { duration: 3000 }); // Show toast
      }
    });
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}
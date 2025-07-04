import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Add this import

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule], // Add MatSnackBarModule
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  name: string = '';
  error: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  onSubmit() {
    this.error = '';
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match!';
      this.snackBar.open(this.error, 'Close', { duration: 3000 }); // Show toast
      return;
    }

    this.authService.register(this.email, this.password, this.name).subscribe({
      next: (response) => {
        this.snackBar.open('Registration successful! Please login.', 'Close', { duration: 3000 });
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.error = error.error?.message || 'Registration failed. Please try again.';
        this.snackBar.open(this.error, 'Close', { duration: 3000 }); // Show toast
      }
    });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
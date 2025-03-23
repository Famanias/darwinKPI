import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {
  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
    console.log('Navigating to login');
  }
  navigateToRegister() {
    this.router.navigate(['/register']);
    console.log('Navigating to register');
  }
}
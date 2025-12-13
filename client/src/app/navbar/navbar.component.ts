import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  organizationName: string = '';
  userName: string = '';
  userRole: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadOrganization();
    this.loadUserInfo();
  }

  loadUserInfo(): void {
    const user = this.authService.getUser();
    if (user?.name) {
      this.userName = user.name;
    } else if (user?.email) {
      this.userName = user.email.split('@')[0];
    }
    if (user?.role) {
      this.userRole = user.role;
    }
  }

  loadOrganization() {
    if (this.isLoggedIn() && this.authService.hasOrganization()) {
      this.authService.getCurrentOrganization().subscribe({
        next: (org) => {
          this.organizationName = org?.name || '';
          if (org) {
            this.authService.setOrganization(org);
          }
        },
        error: () => {
          // Silently fail
          const storedOrg = this.authService.getOrganization();
          if (storedOrg) {
            this.organizationName = storedOrg.name;
          }
        },
      });
    }
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  hasOrganization(): boolean {
    return this.authService.hasOrganization();
  }

  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/']); // Redirect to home page after logout
    }
  }
}

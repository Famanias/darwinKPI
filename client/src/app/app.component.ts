import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { AuthService } from './auth.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, TopbarComponent, CommonModule],
  template: `
    <!-- Main layout with navbar and topbar when logged in -->
    <div class="app-container" *ngIf="authService.isLoggedIn()">
      <app-navbar></app-navbar>
      <div class="content-wrapper">
        <app-topbar></app-topbar>
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <!-- Simple layout for login/register pages -->
    <div class="auth-container" *ngIf="!authService.isLoggedIn()">
      <main class="auth-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .app-container {
        display: flex;
        min-height: 100vh;
      }

      .content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-left: 250px; /* Same as navbar width */
      }

      .main-content {
        flex: 1;
      }

      .auth-container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        width: 100%;
      }

      .auth-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        width: 100%;
      }

      @media (max-width: 768px) {
        .content-wrapper {
          margin-left: 0;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  constructor(protected authService: AuthService, private router: Router) {}

  title = 'darwin-kpi';

  isSidebarCollapsed = false;

  ngOnInit() {
    // Listen to route changes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const currentPath = event.url;

        // Clear localStorage if on login/register/home page (force fresh login)
        if (
          currentPath === '/login' ||
          currentPath === '/register' ||
          currentPath === '/'
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }

        // Redirect to login if not authenticated
        if (
          !this.authService.isLoggedIn() &&
          currentPath !== '/login' &&
          currentPath !== '/register' &&
          currentPath !== '/' &&
          currentPath !== '/terms' &&
          currentPath !== '/privacy' &&
          currentPath !== '/contact'
        ) {
          this.router.navigate(['/login']);
        }
      });
  }

  onToggleSidebar(isCollapsed: boolean) {
    this.isSidebarCollapsed = isCollapsed;
  }
}

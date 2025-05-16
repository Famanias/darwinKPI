import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { AuthService } from './auth.service';
import { CommonModule } from '@angular/common';

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
  styles: [`
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
      padding: 2rem;
    }

    .auth-container {
      display: flex;
      min-height: 100vh;
    }

    .auth-content {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      background-color: #f7fafc;
    }

    @media (max-width: 768px) {
      .content-wrapper {
        margin-left: 0;
      }
    }
  `]
})
export class AppComponent {
  constructor(protected authService: AuthService) {}

  title = 'darwin-kpi';

  isSidebarCollapsed = false;

  onToggleSidebar(isCollapsed: boolean) {
    this.isSidebarCollapsed = isCollapsed;
  }
}

import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';


import { WelcomeComponent } from './welcome/welcome.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';

import { AnalyticsComponent } from './analytics/analytics.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { KpiManagementComponent } from './kpi-management/kpi-management.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], data: { roles: ['User', 'Admin', 'Analyst'] } },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [authGuard], data: { roles: ['Admin'] } },
  { path: 'analytics', component: AnalyticsComponent, canActivate: [authGuard], data: { roles: ['Admin', 'Analyst'] } },
  { path: 'user-management', component: UserManagementComponent, canActivate: [authGuard], data: { roles: ['Admin'] } },
  { path: 'kpi-management', component: KpiManagementComponent, canActivate: [authGuard], data: { roles: ['Admin'] } },
  { path: '', component: WelcomeComponent },
  { path: '**', redirectTo: '' } // Wildcard route for 404
];
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if the user is logged in
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Get the required roles from the route's data
  const requiredRoles = route.data['roles'] as string[];

  // If no roles are specified, allow access (assuming logged-in status is enough)
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  // Check if the user's role matches one of the required roles
  const userRole = authService.getRole();
  if (userRole && requiredRoles.includes(userRole)) {
    return true;
  }

  // If access is denied, redirect to the home page
  router.navigate(['/']);
  return false;
};
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  name: string = '';
  error: string = '';

  // Organization fields
  orgMode: 'create' | 'join' = 'create';
  organizationName: string = '';
  inviteCode: string = '';
  verifiedOrgName: string = '';
  isVerifying: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check if there's an invite code in the URL
    this.route.queryParams.subscribe((params) => {
      if (params['invite']) {
        this.inviteCode = params['invite'];
        this.orgMode = 'join';
        this.verifyInviteCode();
      }
    });
  }

  verifyInviteCode() {
    if (!this.inviteCode || this.inviteCode.length < 4) {
      this.verifiedOrgName = '';
      return;
    }

    this.isVerifying = true;
    this.authService.verifyInviteCode(this.inviteCode).subscribe({
      next: (response) => {
        if (response.valid) {
          this.verifiedOrgName = response.organization.name;
        } else {
          this.verifiedOrgName = '';
        }
        this.isVerifying = false;
      },
      error: () => {
        this.verifiedOrgName = '';
        this.isVerifying = false;
      },
    });
  }

  onSubmit() {
    this.error = '';

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match!';
      return;
    }

    if (this.orgMode === 'create' && !this.organizationName.trim()) {
      this.error = 'Organization name is required';
      return;
    }

    if (this.orgMode === 'join' && !this.inviteCode.trim()) {
      this.error = 'Invite code is required';
      return;
    }

    const orgName =
      this.orgMode === 'create' ? this.organizationName : undefined;
    const code = this.orgMode === 'join' ? this.inviteCode : undefined;

    this.authService
      .register(this.email, this.password, this.name, orgName, code)
      .subscribe({
        next: (response) => {
          console.log('Registration successful', response);
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Registration failed', error);
          this.error =
            error.error?.message || 'Registration failed. Please try again.';
        },
      });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
    console.log('Navigating to login');
  }
}

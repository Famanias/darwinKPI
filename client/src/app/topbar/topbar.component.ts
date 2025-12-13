import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopbarComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  organizationName: string = 'DarwinKPI';
  userName: string = '';
  @Output() refreshRequested = new EventEmitter<void>();

  private dateUpdateInterval: any;

  constructor(private datePipe: DatePipe, private authService: AuthService) {}

  ngOnInit(): void {
    this.dateUpdateInterval = setInterval(() => {
      this.currentDate = new Date();
    }, 60000);

    this.loadOrganization();
    this.loadUserName();
  }

  loadUserName(): void {
    const user = this.authService.getUser();
    if (user?.name) {
      this.userName = user.name;
    } else if (user?.email) {
      // Fallback to email if no name
      this.userName = user.email.split('@')[0];
    }
  }

  loadOrganization(): void {
    // First try to get from localStorage
    const storedOrg = this.authService.getOrganization();
    if (storedOrg?.name) {
      this.organizationName = storedOrg.name;
    }

    // Then fetch fresh data if logged in
    if (this.authService.isLoggedIn() && this.authService.hasOrganization()) {
      this.authService.getCurrentOrganization().subscribe({
        next: (org) => {
          if (org?.name) {
            this.organizationName = org.name;
            this.authService.setOrganization(org);
          }
        },
        error: () => {
          // Keep the stored org name on error
        },
      });
    }
  }

  ngOnDestroy(): void {
    if (this.dateUpdateInterval) {
      clearInterval(this.dateUpdateInterval);
    }
  }

  manualRefresh(): void {
    location.reload();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}

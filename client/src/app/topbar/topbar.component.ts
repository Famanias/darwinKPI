import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent {
  currentDate: Date = new Date();

  constructor(private authService: AuthService) {
    // Update the date every minute
    setInterval(() => {
      this.currentDate = new Date();
    }, 60000);
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
} 
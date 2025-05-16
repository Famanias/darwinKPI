import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule ],
  providers: [DatePipe],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  @Output() refreshRequested = new EventEmitter<void>();

  private dateUpdateInterval: any;

  constructor(private datePipe: DatePipe, private authService: AuthService) {}

  ngOnInit(): void {
    this.dateUpdateInterval = setInterval(() => {
      this.currentDate = new Date();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.dateUpdateInterval) {
      clearInterval(this.dateUpdateInterval);
    }
  }

  manualRefresh(): void {
    this.refreshRequested.emit();
    console.log('Refresh requested from topbar');
  }
  
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

}


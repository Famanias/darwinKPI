import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  name = '';
  email = '';
  subject = '';
  message = '';
  submitted = false;

  constructor(private router: Router) {}

  onSubmit() {
    if (this.name && this.email && this.message) {
      this.submitted = true;
    }
  }

  goHome() { this.router.navigate(['/']); }
}

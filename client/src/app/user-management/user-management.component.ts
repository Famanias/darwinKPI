import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  imports: [CommonModule, FormsModule]
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  showCreateModal = false;
  newUser = {
    firstName: '',
    lastName: '',
    extension: '',
    email: '',
    role: 'User',
    department: '',
    status: 'Active'
  };

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.authService.getUsers().subscribe(
      (data) => {
        this.users = data;
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetNewUser();
  }

  createUser(): void {
    this.authService.createUser(this.newUser).subscribe(
      () => {
        this.loadUsers();
        this.closeCreateModal();
      },
      (error) => {
        console.error('Error creating user:', error);
      }
    );
  }

  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.authService.deleteUser(id).subscribe(
        () => {
          this.loadUsers();
        },
        (error) => {
          console.error('Error deleting user:', error);
        }
      );
    }
  }

  resetNewUser(): void {
    this.newUser = {
      firstName: '',
      lastName: '',
      extension: '',
      email: '',
      role: 'User',
      department: '',
      status: 'Active'
    };
  }
}
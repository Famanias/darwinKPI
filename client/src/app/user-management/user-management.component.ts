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
    status: 'Active'
  };

  showEditModal = false;
  editUser: any = {
    id: 0,
    firstName: '',
    lastName: '',
    extension: '',
    email: '',
    role: 'User',
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

//CREATE USER 
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

//EDIT USER
openEditModal(user: any): void {
  const nameParts = user.name.split(' ');
  this.editUser = {
    id: user.id,
    firstName: nameParts[0],
    lastName: nameParts[nameParts.length - 1],
    extension: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '',
    email: user.email,
    role: user.role,
    status: user.status
  };
  this.showEditModal = true;
}

closeEditModal(): void {
  this.showEditModal = false;
  this.editUser = {
    id: 0,
    firstName: '',
    lastName: '',
    extension: '',
    email: '',
    role: 'User',
    status: 'Active'
  };
}

updateUser(): void {
  this.authService.updateUser(this.editUser.id, this.editUser).subscribe(
    () => {
      this.loadUsers();
      this.closeEditModal();
    },
    (error) => {
      console.error('Error updating user:', error);
    }
  );
}

//DELETE USER
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
      status: 'Active'
    };
  }
}
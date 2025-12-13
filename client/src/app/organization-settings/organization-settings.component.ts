import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

interface Organization {
  id: number;
  name: string;
  slug: string;
  invite_code: string;
  created_at: string;
  memberCount: number;
}

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-organization-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organization-settings.component.html',
  styleUrl: './organization-settings.component.css',
})
export class OrganizationSettingsComponent implements OnInit {
  organization: Organization | null = null;
  members: Member[] = [];
  isLoading = true;
  error = '';
  success = '';

  // Edit mode
  isEditing = false;
  editName = '';

  // Invite code copied
  inviteCopied = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadOrganization();
    this.loadMembers();
  }

  loadOrganization() {
    this.authService.getCurrentOrganization().subscribe({
      next: (org) => {
        this.organization = org;
        this.editName = org.name;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading organization:', err);
        this.error = 'Failed to load organization details';
        this.isLoading = false;
      },
    });
  }

  loadMembers() {
    this.authService.getOrganizationMembers().subscribe({
      next: (members) => {
        this.members = members;
      },
      error: (err) => {
        console.error('Error loading members:', err);
      },
    });
  }

  saveOrganization() {
    if (!this.editName.trim()) {
      this.error = 'Organization name is required';
      return;
    }

    this.authService.updateOrganization(this.editName).subscribe({
      next: (response) => {
        this.organization = response.organization;
        this.authService.setOrganization(response.organization);
        this.isEditing = false;
        this.success = 'Organization updated successfully';
        setTimeout(() => (this.success = ''), 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update organization';
        setTimeout(() => (this.error = ''), 3000);
      },
    });
  }

  copyInviteCode() {
    if (this.organization?.invite_code) {
      navigator.clipboard.writeText(this.organization.invite_code);
      this.inviteCopied = true;
      setTimeout(() => (this.inviteCopied = false), 2000);
    }
  }

  copyInviteLink() {
    if (this.organization?.invite_code) {
      const link = `${window.location.origin}/register?invite=${this.organization.invite_code}`;
      navigator.clipboard.writeText(link);
      this.inviteCopied = true;
      setTimeout(() => (this.inviteCopied = false), 2000);
    }
  }

  regenerateCode() {
    if (
      !confirm(
        'Are you sure you want to regenerate the invite code? The old code will no longer work.'
      )
    ) {
      return;
    }

    this.authService.regenerateInviteCode().subscribe({
      next: (response) => {
        if (this.organization) {
          this.organization.invite_code = response.inviteCode;
        }
        this.success = 'Invite code regenerated successfully';
        setTimeout(() => (this.success = ''), 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to regenerate invite code';
        setTimeout(() => (this.error = ''), 3000);
      },
    });
  }

  updateMemberRole(member: Member, newRole: string) {
    this.authService.updateMemberRole(member.id, newRole).subscribe({
      next: () => {
        member.role = newRole;
        this.success = `${member.name}'s role updated to ${newRole}`;
        setTimeout(() => (this.success = ''), 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update member role';
        setTimeout(() => (this.error = ''), 3000);
      },
    });
  }

  removeMember(member: Member) {
    if (
      !confirm(
        `Are you sure you want to remove ${member.name} from the organization?`
      )
    ) {
      return;
    }

    this.authService.removeMember(member.id).subscribe({
      next: () => {
        this.members = this.members.filter((m) => m.id !== member.id);
        this.success = `${member.name} has been removed from the organization`;
        setTimeout(() => (this.success = ''), 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to remove member';
        setTimeout(() => (this.error = ''), 3000);
      },
    });
  }

  isCurrentUser(member: Member): boolean {
    const user = this.authService.getUser();
    return user?.id === member.id;
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}

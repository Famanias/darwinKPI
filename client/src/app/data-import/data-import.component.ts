import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-data-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-import.component.html',
  styleUrls: ['./data-import.component.css']
})
export class DataImportComponent {
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadSuccess: boolean = false;
  uploadError: string | null = null;
  // importType: 'existing' | 'new' = 'existing';
  existingKpis: any[] = [];
  selectedKpi: any = null;

  // Add popup message properties
  showPopup: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'error';
importType: any;

  constructor(private authService: AuthService) {
    this.loadExistingKpis();
  }

  loadExistingKpis(): void {
    this.authService.getKpis().subscribe(
      (data) => {
        this.existingKpis = data;
      },
      (error) => {
        console.error('Error fetching KPIs:', error);
        this.showErrorPopup('Failed to load KPIs');
      }
    );
  }

  selectKpi(kpi: any): void {
    this.selectedKpi = kpi;
  }

  showErrorPopup(message: string): void {
    this.popupMessage = message;
    this.popupType = 'error';
    this.showPopup = true;
    setTimeout(() => {
      this.showPopup = false;
    }, 5000);
  }

  showSuccessPopup(message: string): void {
    this.popupMessage = message;
    this.popupType = 'success';
    this.showPopup = true;
    setTimeout(() => {
      this.showPopup = false;
    }, 5000);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.isValidFileType(file)) {
        this.selectedFile = file;
        this.uploadError = null;
      } else {
        this.selectedFile = null;
        this.showErrorPopup('Please select a CSV or Excel file');
      }
    }
  }

  isValidFileType(file: File): boolean {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return validTypes.includes(file.type);
  }

  async uploadFile(): Promise<void> {
    if (!this.selectedFile || !this.selectedKpi) {
      this.showErrorPopup('Please select both a KPI and a file');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('kpi_id', this.selectedKpi.id);
    
    // Get the current user's information
    const user = this.authService.getUser();
    if (!user?.id) {
      this.showErrorPopup('User session expired. Please log in again.');
      this.isUploading = false;
      return;
    }
    formData.append('user_id', user.id.toString());

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${this.authService.getToken()}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to import data');
      }

      this.showSuccessPopup(`Successfully imported ${data.insertedRows} rows of data`);
      this.selectedFile = null;
      this.uploadProgress = 100;
    } catch (error) {
      let errorMessage = 'Failed to import data';
      
      if (error instanceof Error) {
        // Handle specific error messages from backend
        if (error.message.includes('Invalid date format')) {
          errorMessage = error.message;
        } else if (error.message.includes('Spreadsheet is empty')) {
          errorMessage = 'The uploaded file is empty or has invalid data';
        } else if (error.message.includes('File, kpi_id, and user_id are required')) {
          errorMessage = 'Missing required information for import';
        }
      }
      
      this.showErrorPopup(errorMessage);
    } finally {
      this.isUploading = false;
    }
  }

  private simulateFileUpload(): Promise<void> {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        this.uploadProgress = progress;
        
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  }
} 
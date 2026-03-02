import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ImportResponse {
  message: string;
  insertedRows?: number;
  error?: string;
  details?: string;
}

@Component({
  selector: 'app-data-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-import.component.html',
  styleUrls: ['./data-import.component.css'],
})
export class DataImportComponent implements OnInit {
  importType: string = 'existing';
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadSuccess: boolean = false;
  uploadError: string | null = null;
  existingKpis: any[] = [];
  selectedKpi: any = null;
  showPopup: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'error';
  private apiUrl = environment.apiUrl || '';

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadExistingKpis();
  }

  loadExistingKpis(): void {
    this.authService.getKpis().subscribe({
      next: (data) => {
        this.existingKpis = data;
        if (this.existingKpis.length === 0) {
          this.showErrorPopup('No KPIs available. Please create a KPI first.');
        }
      },
      error: (error) => {
        console.error('Error fetching KPIs:', error);
        this.showErrorPopup('Failed to load KPIs. Please refresh the page.');
      },
    });
  }

  selectKpi(kpi: any): void {
    this.selectedKpi = kpi;
    this.uploadError = null;
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

        // Preview first few rows if it's a CSV
        if (file.type === 'text/csv') {
          this.previewCSV(file);
        }
      } else {
        this.selectedFile = null;
        this.showErrorPopup('Please select a CSV or Excel file');
      }
    }
  }

  private previewCSV(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const lines = text.split('\n');
      if (lines.length > 0) {
        const headers = lines[0].trim().split(',');
        if (!headers.includes('date') || !headers.includes('value')) {
          this.showErrorPopup(
            'CSV file must contain "date" and "value" columns'
          );
          this.selectedFile = null;
        }
      }
    };
    reader.readAsText(file);
  }

  isValidFileType(file: File): boolean {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    return validTypes.includes(file.type);
  }

  async uploadFile(): Promise<void> {
    if (!this.selectedFile) {
      this.showErrorPopup('Please select a file to upload');
      return;
    }

    if (!this.selectedKpi) {
      this.showErrorPopup('Please select a KPI for the data');
      return;
    }

    const user = this.authService.getUser();
    if (!user?.id) {
      this.showErrorPopup('User session expired. Please log in again.');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('kpi_id', this.selectedKpi.id.toString());
    formData.append('user_id', user.id.toString());

    try {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${this.authService.getToken()}`,
      });

      const response = await this.http
        .post<ImportResponse>(`${this.apiUrl}/api/import`, formData, {
          headers,
        })
        .toPromise();

      if (response) {
        this.showSuccessPopup(response.message);
        this.selectedFile = null;
        this.uploadProgress = 100;
        this.uploadSuccess = true;

        // Optionally refresh KPI data
        this.loadExistingKpis();
      }
    } catch (error) {
      this.uploadSuccess = false;
      if (error instanceof HttpErrorResponse) {
        const message = error.error?.message || 'Failed to import data';
        this.showErrorPopup(message);
        console.error(
          'Import error details:',
          error.error?.details || error.message
        );
      } else {
        this.showErrorPopup('An unexpected error occurred');
        console.error('Unexpected error:', error);
      }
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

  // Download CSV template for selected KPI
  downloadTemplate(): void {
    if (!this.selectedKpi) {
      this.showErrorPopup('Please select a KPI first');
      return;
    }

    // Create CSV content with headers and sample data
    const today = new Date();
    const sampleDates: string[] = [];

    // Generate sample dates based on KPI frequency
    const frequency = (this.selectedKpi.frequency || 'daily').toLowerCase();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      if (frequency === 'daily') {
        date.setDate(date.getDate() - i);
      } else if (frequency === 'weekly') {
        date.setDate(date.getDate() - i * 7);
      } else if (frequency === 'monthly') {
        date.setMonth(date.getMonth() - i);
        date.setDate(1); // First day of month
      } else if (frequency === 'quarterly') {
        date.setMonth(date.getMonth() - i * 3);
        date.setDate(1);
      } else if (frequency === 'yearly') {
        date.setFullYear(date.getFullYear() - i);
        date.setMonth(0);
        date.setDate(1);
      } else {
        date.setDate(date.getDate() - i);
      }
      sampleDates.push(date.toISOString().slice(0, 10));
    }

    // Build CSV content
    let csvContent = 'date,value\n';
    sampleDates.forEach((date) => {
      csvContent += `${date},\n`; // Empty value for user to fill
    });

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.selectedKpi.name.replace(
      /\s+/g,
      '_'
    )}_template.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.showSuccessPopup(`Template downloaded for ${this.selectedKpi.name}`);
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Clear selected file
  clearFile(): void {
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.uploadSuccess = false;
    this.uploadError = null;
  }
}

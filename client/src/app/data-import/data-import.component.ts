import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
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
  styleUrls: ['./data-import.component.css']
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
importType: any;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

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
      }
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
          this.showErrorPopup('CSV file must contain "date" and "value" columns');
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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
        'Authorization': `Bearer ${this.authService.getToken()}`
      });

      const response = await this.http.post<ImportResponse>(
        `${this.apiUrl}/api/import`,
        formData,
        { headers }
      ).toPromise();

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
        console.error('Import error details:', error.error?.details || error.message);
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
} 
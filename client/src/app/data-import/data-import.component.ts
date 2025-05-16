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
      }
    );
  }

  selectKpi(kpi: any): void {
    this.selectedKpi = kpi;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Check if file is CSV or Excel
      if (this.isValidFileType(file)) {
        this.selectedFile = file;
        this.uploadError = null;
      } else {
        this.uploadError = 'Please select a CSV or Excel file';
        this.selectedFile = null;
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
    if (!this.selectedFile) return;
    // if (this.importType === 'existing' && !this.selectedKpi) return;

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadError = null;

    try {


      //implement the actual file upload and processing
      await this.simulateFileUpload();
      
      this.uploadSuccess = true;
      this.selectedFile = null;
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        this.uploadSuccess = false;
      }, 3000);
    } catch (error) {
      this.uploadError = 'An error occurred while uploading the file';
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
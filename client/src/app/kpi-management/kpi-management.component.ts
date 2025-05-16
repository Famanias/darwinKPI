import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-kpi-management',
  templateUrl: './kpi-management.component.html',
  styleUrls: ['./kpi-management.component.css'],
  imports: [CommonModule, FormsModule],
  standalone: true,
})
export class KpiManagementComponent implements OnInit {
  kpis: any[] = [];
  showCreateModal = false;
  newKpi = {
    name: '',
    description: '',
    unit: 'Number',
    target: 0,
    frequency: 'Daily',
    visualization: 'Bar',
  };

  showEditModal = false;
  editKpi: any = {
    id: 0,
    name: '',
    description: '',
    unit: 'Number',
    target: 0,
    frequency: 'Daily',
    visualization: 'Bar',
  };

  templates = [
    'Sales Target',
    'Customer Satisfaction',
    'Task Completion Rate',
    'Quality Assurance',
    'Employee Engagement',
    'Revenue Growth',
    'Cost Reduction',
  ];
  units = ['Number', 'Currency', 'Percentage'];
  frequencies = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
  visualizations = ['Bar', 'Gauge', 'Line', 'Pie'];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadKpis();
  }

  loadKpis(): void {
    this.authService.getKpis().subscribe(
      (data) => {
        this.kpis = data;
      },
      (error) => {
        console.error('Error fetching KPIs:', error);
      }
    );
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetNewKpi();
  }

  createKpi(): void {
    this.authService.createKpi(this.newKpi).subscribe(
      () => {
        this.loadKpis();
        this.closeCreateModal();
        alert('KPI created successfully!');
      },
      (error) => {
        console.error('Error creating KPI:', error);
      }
    );
  }

  openEditModal(kpi: any): void {
    console.log('Editing KPI:', kpi);
    this.editKpi = {
      id: kpi.id,
      name: kpi.name,
      description: kpi.description || '',
      unit: kpi.unit,
      target: kpi.target,
      frequency: kpi.frequency,
      visualization: kpi.visualization,
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editKpi = {
      id: 0,
      name: '',
      description: '',
      unit: '',
      target: 0,
      frequency: '',
      visualization: '',
    };
  }

  updateKpi(): void {
    this.authService.updateKpi(this.editKpi.id, this.editKpi).subscribe({
      next: () => {
        this.loadKpis();
        this.closeEditModal();
        // Optional: Add success notification
      },
      error: (error) => {
        console.error('Full error:', error);
        if (error.status === 404) {
          alert('KPI not found. It may have been deleted.');
        } else {
          alert('Update failed. Check console for details.');
        }
      },
    });
  }

  deleteKpi(id: number): void {
    if (confirm('Are you sure you want to delete this KPI?')) {
      this.authService.deleteKpi(id).subscribe(
        () => {
          this.loadKpis();
        },
        (error) => {
          console.error('Error deleting KPI:', error);
        }
      );
    }
  }

  onTemplateChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.newKpi.name = target.value;
    }
  }

  resetNewKpi(): void {
    this.newKpi = {
      name: '',
      description: '',
      unit: 'Number',
      target: 0,
      frequency: 'Daily',
      visualization: 'Bar',
    };
  }

  downloadReport() {
    this.authService.downloadAllKpiReport().subscribe(
      (response) => {
        const blob = new Blob([response.body!], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Try to get filename from Content-Disposition
        const contentDisposition = response.headers.get('Content-Disposition');
        const match = contentDisposition?.match(/filename="(.+)"/);
        const filename = match ? match[1] : 'kpi_report_all.pdf';

        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      (error) => {
        console.error('Download failed', error);
        alert('Failed to download report.');
      }
    );
  }
}
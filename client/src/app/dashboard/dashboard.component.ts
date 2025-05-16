import { Component, OnInit, AfterViewInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { interval, Subscription } from 'rxjs';

// Define the Kpi interface
interface Kpi {
  id?: number | string;
  name: string;
  description?: string;
  target?: number;
  frequency?: string;
  unit?: string;
  visualization?: string;
}

interface PerformanceData {
  id: number;
  kpi_id: number;
  user_id: number;
  value: number;
  date: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  kpis: Kpi[] = [];
  widgets: Kpi[] = [];
  attentionRequired: string | null = null;
  performanceHistory: PerformanceData[] = [];
  isSticky = false;
  showConfig = false;

  @ViewChildren('kpiChart') kpiChartRefs!: QueryList<ElementRef>;
  private kpiCharts: Chart[] = [];
  private pollingSubscription!: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.startPolling();
    this.loadWidgetState();
  }

  ngAfterViewInit(): void {
    this.setupKpiCharts();
    this.kpiChartRefs.changes.subscribe(() => {
      console.log('kpiChartRefs changed, re-setting up charts');
      this.setupKpiCharts();
    });
    window.addEventListener('scroll', this.handleScroll, true);
  }

  ngOnDestroy(): void {
    this.kpiCharts.forEach(chart => chart.destroy());
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    window.removeEventListener('scroll', this.handleScroll, true);
  }

  startPolling(): void {
    this.pollingSubscription = interval(5000).subscribe(() => {
      console.log('Polling for updates...');
      this.loadKpis();
      this.loadPerformanceHistory();
    });
    this.loadKpis();
    this.loadPerformanceHistory();
  }

  handleScroll = (): void => {
    this.isSticky = window.scrollY > 30;
  };

  loadKpis(): void {
    this.authService.getKpis().subscribe(
      (data: Kpi[]) => {
        this.kpis = data.map(kpi => ({
          ...kpi,
          target: kpi.target || 100,
          frequency: kpi.frequency || 'Monthly',
          unit: kpi.unit || 'Number',
          description: kpi.description || 'Test Description'
        }));
        console.log('Loaded KPIs:', this.kpis);
        this.initializeWidgets();
        this.checkPendingUpdates();
        this.setupKpiCharts();
      },
      (error) => {
        console.error('Error fetching KPIs:', error);
      }
    );
  }

  loadPerformanceHistory(): void {
    this.authService.getPerformanceHistory().subscribe(
      (data: PerformanceData[]) => {
        this.performanceHistory = data;
        console.log('Loaded Performance History:', this.performanceHistory);
        this.setupKpiCharts();
      },
      (error) => {
        console.error('Error fetching performance history:', error);
      }
    );
  }

  initializeWidgets(): void {
    const savedState = localStorage.getItem('dashboardWidgets');
    if (savedState) {
      const savedWidgets: Kpi[] = JSON.parse(savedState);
      this.widgets = this.kpis
        .filter(kpi => savedWidgets.some(w => w.name === kpi.name))
        .map(kpi => ({
          id: `kpi-${kpi.id || Math.random().toString(36).substr(2, 9)}`,
          name: kpi.name,
          description: kpi.description,
          target: kpi.target,
          frequency: kpi.frequency,
          unit: kpi.unit
        }));
    } else {
      this.widgets = this.kpis.map(kpi => ({
        id: `kpi-${kpi.id || Math.random().toString(36).substr(2, 9)}`,
        name: kpi.name,
        description: kpi.description,
        target: kpi.target,
        frequency: kpi.frequency,
        unit: kpi.unit
      }));
    }
    this.saveWidgetState();
    console.log('Initialized Widgets:', this.widgets);
  }

  isKpiSelected(kpiName: string): boolean {
    return this.widgets.some(w => w.name === kpiName);
  }

  toggleKpi(kpiName: string): void {
    const kpi = this.kpis.find(k => k.name === kpiName);
    if (kpi && !this.isKpiSelected(kpiName)) {
      this.widgets.push({
        id: `kpi-${kpi.id || Math.random().toString(36).substr(2, 9)}`,
        name: kpi.name,
        description: kpi.description,
        target: kpi.target,
        frequency: kpi.frequency,
        unit: kpi.unit
      });
    } else if (kpi) {
      this.widgets = this.widgets.filter(w => w.name !== kpiName);
    }
    this.saveWidgetState();
    this.setupKpiCharts();
  }

  loadWidgetState(): void {
    const savedState = localStorage.getItem('dashboardWidgets');
    if (savedState) {
      this.widgets = JSON.parse(savedState);
    }
  }

  saveWidgetState(): void {
    localStorage.setItem('dashboardWidgets', JSON.stringify(this.widgets));
  }

  checkPendingUpdates(): void {
    const pendingCount = this.kpis.filter(() => Math.random() > 0.5).length;
    if (pendingCount > 0) {
      this.attentionRequired = `You have ${pendingCount} KPIs that need to be updated. Please update them before the due date.`;
    } else {
      this.attentionRequired = null;
    }
  }

  setupKpiCharts(): void {
    this.kpiCharts.forEach(chart => chart.destroy());
    this.kpiCharts = [];

    if (!this.kpiChartRefs || this.kpiChartRefs.length === 0) {
      console.warn('No kpiChartRefs available to render charts');
      return;
    }

    if (!this.widgets.length || !this.performanceHistory.length) {
      console.warn('Widgets or performance history not loaded yet:', {
        widgets: this.widgets,
        performanceHistory: this.performanceHistory
      });
      return;
    }

    this.kpiChartRefs.forEach((chartRef, index) => {
      const widget = this.widgets[index];
      if (!widget) {
        console.warn(`No widget found at index ${index}`);
        return;
      }

      const canvas = chartRef.nativeElement as HTMLCanvasElement;
      if (!canvas) {
        console.error(`Canvas element not found at index ${index}`);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`Failed to get 2D context for canvas at index ${index}`);
        return;
      }

      const kpiHistory = this.performanceHistory
        .filter(entry => {
          const kpi = this.kpis.find(k => k.name === widget.name);
          return kpi && kpi.id === entry.kpi_id;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (kpiHistory.length === 0) {
        console.warn(`No history data for ${widget.name}`);
        return;
      }

      const labels = kpiHistory.map(entry => new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const data = kpiHistory.map(entry => entry.value || 0);

      console.log(`Rendering chart for ${widget.name}:`, { labels, data });

      try {
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Actual',
                data: data,
                borderColor: 'red',
                fill: false,
                tension: 0.4
              },
              {
                label: 'Target',
                data: Array(labels.length).fill(widget.target || 100),
                borderColor: 'green',
                fill: false,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { title: { display: true, text: 'Time' } },
              y: { title: { display: true, text: 'Value' }, beginAtZero: true }
            },
            plugins: {
              legend: { display: true, position: 'top' }
            }
          }
        });

        this.kpiCharts.push(chart);
        console.log(`Chart rendered successfully for ${widget.name}`);
      } catch (error) {
        console.error(`Error rendering chart for ${widget.name}:`, error);
      }
    });
  }
}
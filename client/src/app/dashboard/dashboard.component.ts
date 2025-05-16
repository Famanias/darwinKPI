import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  kpis: any[] = [];
  widgets: any[] = [];
  attentionRequired: string | null = null;
  performanceHistory: any[] = [];

  @ViewChild('performanceTrendChart') performanceTrendChartRef!: ElementRef;
  @ViewChildren('kpiChart') kpiChartRefs!: QueryList<ElementRef>;
  private trendChart: Chart | undefined;
  private kpiCharts: Chart[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadKpis();
    this.loadPerformanceHistory();
    this.loadWidgetState();
  }

  ngAfterViewInit(): void {
    this.setupPerformanceTrendChart();
    this.setupKpiCharts();
    this.kpiChartRefs.changes.subscribe(() => {
      this.setupKpiCharts();
    });
  }

  ngOnDestroy(): void {
    if (this.trendChart) {
      this.trendChart.destroy();
    }
    this.kpiCharts.forEach(chart => chart.destroy());
  }

  loadKpis(): void {
    this.authService.getKpis().subscribe(
      (data) => {
        this.kpis = data;
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
      (data) => {
        this.performanceHistory = data;
        this.setupPerformanceTrendChart();
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
      const savedWidgets = JSON.parse(savedState);
      this.widgets = this.kpis
        .filter(kpi => savedWidgets.some((w: any) => w.name === kpi.name))
        .map(kpi => ({
          id: `kpi-${kpi.id || Math.random().toString(36).substr(2, 9)}`,
          name: kpi.name,
          type: 'card'
        }));
    } else {
      this.widgets = this.kpis.map(kpi => ({
        id: `kpi-${kpi.id || Math.random().toString(36).substr(2, 9)}`,
        name: kpi.name,
        type: 'card'
      }));
    }

    this.saveWidgetState();
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
        type: 'card'
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

  setupPerformanceTrendChart(): void {
    if (this.trendChart) {
      this.trendChart.destroy();
    }

    if (!this.performanceTrendChartRef || !this.kpis.length) return;

    const ctx = this.performanceTrendChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const groupedData: { [key: string]: any[] } = {};
    this.performanceHistory.forEach((entry: any) => {
      if (!groupedData[entry.kpi_id]) {
        groupedData[entry.kpi_id] = [];
      }
      groupedData[entry.kpi_id].push(entry);
    });

    const allDates = Array.from(new Set(this.performanceHistory.map((entry: any) => entry.date)))
      .sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());
    const labels = allDates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    const datasets = this.kpis.map(kpi => {
      const data = allDates.map(date => {
        const entry = groupedData[kpi.id]?.find((e: any) => e.date === date);
        return entry ? entry.value : null;
      });
      return {
        label: kpi.name,
        data: data,
        fill: false,
        borderColor: this.getRandomColor(),
        tension: 0.4
      };
    });

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Performance'
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  setupKpiCharts(): void {
    this.kpiCharts.forEach(chart => chart.destroy());
    this.kpiCharts = [];

    setTimeout(() => {
      this.widgets.forEach((widget, index) => {
        if (widget.type !== 'card') return;

        const canvasElement = document.getElementById(`kpiChart-${index}`);
        if (!canvasElement) return;

        const ctx = (canvasElement as HTMLCanvasElement).getContext('2d');
        if (!ctx) return;

        const kpi = this.kpis.find(k => `kpi-${k.id}` === widget.id) || { id: index + 1, name: widget.name };
        const history = this.performanceHistory.filter(entry => entry.kpi_id === kpi.id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (history.length === 0) return;

        const labels = history.map(entry => new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const data = history.map(entry => entry.value);

        const chartType = this.getChartType(kpi.visualization || 'bar');
        const chartConfig: any = {
          type: chartType,
          data: {
            labels: labels,
            datasets: [{
              label: widget.name,
              data: data,
              backgroundColor: chartType === 'pie' ? this.getRandomColors(data.length) : this.getRandomColor(),
              borderColor: chartType !== 'pie' ? this.getRandomColor() : undefined,
              borderWidth: chartType !== 'pie' ? 1 : undefined,
              fill: chartType === 'line' ? false : undefined,
              tension: chartType === 'line' ? 0.4 : undefined
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: chartType === 'pie',
                position: 'top'
              }
            },
            scales: chartType !== 'pie' ? {
              x: { display: true, title: { display: true, text: 'Time' } },
              y: { display: true, title: { display: true, text: 'Value' }, beginAtZero: true }
            } : undefined
          }
        };

        this.kpiCharts.push(new Chart(ctx, chartConfig));
      });
    }, 0);
  }

  getChartType(visualization: string): string {
    switch (visualization.toLowerCase()) {
      case 'bar':
        return 'bar';
      case 'line':
        return 'line';
      case 'pie':
        return 'pie';
      default:
        return 'bar';
    }
  }

  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  getRandomColors(count: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(this.getRandomColor());
    }
    return colors;
  }

  calculateProgress(value: string): number {
    const [current, target] = value.split('/').map(v => parseFloat(v.trim()));
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  }
}
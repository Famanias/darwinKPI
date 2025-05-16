import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import Chart from 'chart.js/auto';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, DragDropModule],
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

  private pollingSubscription!: Subscription;
  ngOnInit(): void {
    this.startPolling();
    this.loadWidgetState();
  }

  ngAfterViewInit(): void {
    // Setup charts after the view is initialized
    this.setupPerformanceTrendChart();
    this.setupKpiCharts();
    // Listen for changes in kpiChartRefs (e.g., if widgets are reordered)
    this.kpiChartRefs.changes.subscribe(() => {
      this.setupKpiCharts();
    });
  }

  ngOnDestroy(): void {
    if (this.trendChart) {
      this.trendChart.destroy();
    }
    this.kpiCharts.forEach((chart) => chart.destroy());

    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  startPolling(): void {
    this.pollingSubscription = interval(5000).subscribe(() => {
      console.log('Polling for updates...');
      this.loadKpis();
      this.loadPerformanceHistory();
    });

    // Initial load
    this.loadKpis();
    this.loadPerformanceHistory();
  }

  manualRefresh(): void {
    this.loadKpis();
    this.loadPerformanceHistory();
  }

  loadKpis(): void {
    this.authService.getKpis().subscribe(
      (data) => {
        this.kpis = data;
        this.mapKpisToWidgets();
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

  mapKpisToWidgets(): void {
    const kpiWidgets = this.kpis.map((kpi) => ({
      id: `kpi-${kpi.id}`,
      name: kpi.name,
      value: this.getKpiValue(kpi),
      trend: this.getKpiTrend(kpi),
      type: 'card',
      visualization: kpi.visualization,
    }));

    const staticWidgets = [
      {
        id: 'performanceTrend',
        name: 'My Performance Trend',
        content: 'Performance vs Target over time',
        type: 'chart',
      },
      {
        id: 'pendingUpdates',
        name: 'Pending KPI Updates',
        items: this.getPendingUpdates(),
        type: 'list',
      },
      {
        id: 'performanceSummary',
        name: 'Overall Performance Summary',
        content: 'Your performance across all KPIs',
        type: 'summary',
      },
    ];

    this.widgets = [...kpiWidgets, ...staticWidgets];

    const savedState = localStorage.getItem('dashboardWidgets');
    if (savedState) {
      const savedWidgets = JSON.parse(savedState);
      const widgetMap = new Map(this.widgets.map((w) => [w.id, w]));
      this.widgets = savedWidgets
        .map((saved: any) => widgetMap.get(saved.id))
        .filter((w: any) => w !== undefined);
      const savedIds = new Set(savedWidgets.map((w: any) => w.id));
      const newWidgets = this.widgets.filter((w) => !savedIds.has(w.id));
      this.widgets.push(...newWidgets);
    }

    this.saveWidgetState();
  }

  getKpiValue(kpi: any): string {
    const currentValue = this.getLatestKpiValue(kpi.id);
    return `${currentValue || Math.round(kpi.target * 0.85)} ${
      kpi.unit === 'Currency' ? 'USD' : kpi.unit
    } / ${kpi.target} ${kpi.unit === 'Currency' ? 'USD' : kpi.unit}`;
  }

  getKpiTrend(kpi: any): string {
    const history = this.performanceHistory
      .filter((entry) => entry.kpi_id === kpi.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (history.length < 2)
      return `+${Math.round(
        Math.random() * 10
      )}% from previous ${kpi.frequency.toLowerCase()}`;
    const latest = history[0].value;
    const previous = history[1].value;
    const trend = ((latest - previous) / previous) * 100;
    return `${trend >= 0 ? '+' : ''}${trend.toFixed(
      1
    )}% from previous ${kpi.frequency.toLowerCase()}`;
  }

  getLatestKpiValue(kpiId: number): number | null {
    const history = this.performanceHistory
      .filter((entry) => entry.kpi_id === kpiId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return history.length > 0 ? history[0].value : null;
  }

  getPendingUpdates(): any[] {
    return this.kpis.slice(0, 3).map((kpi) => ({
      name: kpi.name,
      due: this.calculateDueDate(kpi.frequency),
    }));
  }

  calculateDueDate(frequency: string): string {
    const today = new Date('2025-05-15');
    let dueDate: Date;
    switch (frequency.toLowerCase()) {
      case 'daily':
        dueDate = new Date(today.setDate(today.getDate() + 1));
        break;
      case 'weekly':
        dueDate = new Date(today.setDate(today.getDate() + 7));
        break;
      case 'monthly':
        dueDate = new Date(today.setMonth(today.getMonth() + 1));
        break;
      case 'quarterly':
        dueDate = new Date(today.setMonth(today.getMonth() + 3));
        break;
      case 'yearly':
        dueDate = new Date(today.setFullYear(today.getFullYear() + 1));
        break;
      default:
        dueDate = new Date(today.setDate(today.getDate() + 1));
    }
    const daysLeft = Math.ceil(
      (dueDate.getTime() - new Date('2025-05-15').getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `${dueDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    })} (${daysLeft} days left)`;
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

    const allDates = Array.from(
      new Set(this.performanceHistory.map((entry: any) => entry.date))
    ).sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());
    const labels = allDates.map((date) =>
      new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const datasets = this.kpis.map((kpi) => {
      const data = allDates.map((date) => {
        const entry = groupedData[kpi.id]?.find((e: any) => e.date === date);
        return entry ? entry.value : null;
      });
      return {
        label: kpi.name,
        data: data,
        fill: false,
        borderColor: this.getRandomColor(),
        tension: 0.4,
      };
    });

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Performance',
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  setupKpiCharts(): void {
    // Destroy existing KPI charts
    this.kpiCharts.forEach((chart) => chart.destroy());
    this.kpiCharts = [];

    // Wait for the next tick to ensure the DOM is updated
    setTimeout(() => {
      this.widgets.forEach((widget, index) => {
        if (widget.type !== 'card') return;

        const kpi = this.kpis.find((k) => `kpi-${k.id}` === widget.id);
        if (!kpi) return;

        const canvasElement = document.getElementById(`kpiChart-${index}`);
        if (!canvasElement) return;

        const ctx = (canvasElement as HTMLCanvasElement).getContext('2d');
        if (!ctx) return;

        const history = this.performanceHistory
          .filter((entry) => entry.kpi_id === kpi.id)
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

        if (history.length === 0) return;

        const labels = history.map((entry) =>
          new Date(entry.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        );
        const data = history.map((entry) => entry.value);

        const chartType = this.getChartType(kpi.visualization || 'bar');
        const chartConfig: any = {
          type: chartType,
          data: {
            labels: labels,
            datasets: [
              {
                label: kpi.name,
                data: data,
                backgroundColor:
                  chartType === 'pie'
                    ? this.getRandomColors(data.length)
                    : this.getRandomColor(),
                borderColor:
                  chartType !== 'pie' ? this.getRandomColor() : undefined,
                borderWidth: chartType !== 'pie' ? 1 : undefined,
                fill: chartType === 'line' ? false : undefined,
                tension: chartType === 'line' ? 0.4 : undefined,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: chartType === 'pie',
                position: 'top',
              },
            },
            scales:
              chartType !== 'pie'
                ? {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Time',
                      },
                    },
                    y: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Value',
                      },
                      beginAtZero: true,
                    },
                  }
                : undefined,
          },
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
    const [current, target] = value.split('/').map((v) => parseFloat(v.trim()));
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  }

  drop(event: CdkDragDrop<any[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.saveWidgetState();
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
}
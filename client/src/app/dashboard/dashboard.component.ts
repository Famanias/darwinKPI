import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { interval, Subscription } from 'rxjs';
import { TopbarComponent } from '../topbar/topbar.component';
import { FormsModule } from '@angular/forms';

// Define the Kpi interface
interface Kpi {
  id?: number | string;
  name: string;
  description?: string;
  target?: number;
  frequency?: string;
  unit?: string;
  visualization?: string;
  inputValue?: number;
  inputSaved?: boolean;
}

// Widget extends KPI with additional dashboard-specific fields
interface Widget {
  kpiId: number; // Actual KPI ID from database
  name: string;
  description?: string;
  target?: number;
  frequency?: string;
  unit?: string;
  visualization?: string;
  inputValue?: number;
  inputSaved?: boolean;
  isLoading?: boolean; // Loading state for this widget
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
  imports: [CommonModule, TopbarComponent, FormsModule],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  kpis: Kpi[] = [];
  widgets: Widget[] = [];
  attentionRequired: string | null = null;
  performanceHistory: PerformanceData[] = [];
  isSticky = false;
  showConfig = false;
  widgetsLoading = true;

  // Chart controls
  chartTimeRange: string = 'all'; // days: '7', '30', '90', '365', 'all', 'custom'
  chartType: 'line' | 'bar' = 'line';
  selectedKpiIds: (number | string)[] = []; // Empty means all KPIs
  chartStartDate: string = ''; // For custom date range
  chartEndDate: string = ''; // For custom date range

  @ViewChildren('kpiChart') kpiChartRefs!: QueryList<ElementRef>;
  private kpiCharts: Chart[] = [];
  private pollingSubscription!: Subscription;

  @ViewChild('combinedKpiChart') combinedKpiChartRef!: ElementRef;
  private combinedChart: Chart | undefined;

  // Fixed colors for consistent KPI display
  kpiColors: string[] = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.startPolling();
    this.loadWidgetState();
    this.loadKpis();
  }

  ngAfterViewInit(): void {
    this.renderCombinedChart();
    this.setupKpiCharts();
    this.kpiChartRefs.changes.subscribe(() => {
      console.log('kpiChartRefs changed, re-setting up charts');
      this.setupKpiCharts();
    });
    window.addEventListener('scroll', this.handleScroll, true);
  }

  ngOnDestroy(): void {
    this.kpiCharts.forEach((chart) => chart.destroy());
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    window.removeEventListener('scroll', this.handleScroll, true);
  }

  startPolling(): void {
    this.pollingSubscription = interval(60000).subscribe(() => {
      console.log('Polling for updates...');
      this.loadKpis();
      this.loadPerformanceHistory();
    });
    this.loadKpis();
    this.loadPerformanceHistory();
  }

  saveKpiInput(widget: any) {
    if (widget.inputValue && widget.inputValue.trim() !== '') {
      widget.savedKpi = widget.inputValue;
    }
  }

  editKpiInput(widget: any) {
    widget.savedKpi = undefined;
  }

  handleScroll = (): void => {
    this.isSticky = window.scrollY > 30;
  };

  manualRefresh(): void {
    this.loadKpis();
    this.loadPerformanceHistory();
  }

  loadKpis(): void {
    this.authService.getKpis().subscribe({
      next: (data: Kpi[]) => {
        this.kpis = data.map((kpi) => ({
          ...kpi,
          target:
            kpi.target !== null && kpi.target !== undefined ? kpi.target : 0,
          frequency: kpi.frequency || 'Monthly',
          unit: kpi.unit || 'Number',
          description: kpi.description || 'Test Description',
        }));
        console.log('Loaded KPIs:', this.kpis);
        this.initializeWidgets();
        this.checkPendingUpdates();
        this.setupKpiCharts();
        // After initializing widgets, fetch their performance data
        this.fetchWidgetPerformanceData();
        // Trigger chart render after widgets are ready
        setTimeout(() => this.renderCombinedChart(), 100);
      },
      error: (error) => {
        console.error('Error fetching KPIs:', error);
      },
    });
  }

  fetchWidgetPerformanceData(): void {
    const user = this.authService.getUser();
    if (!user) {
      this.widgetsLoading = false;
      return;
    }

    if (this.widgets.length === 0) {
      this.widgetsLoading = false;
      return;
    }

    this.widgetsLoading = true;
    console.log('Fetching widget performance data for user:', user.id);
    let pendingRequests = this.widgets.length;

    this.widgets.forEach((widget) => {
      widget.isLoading = true;
      const now = new Date();

      console.log(
        `Fetching data for ${widget.name}, KPI ID: ${
          widget.kpiId
        }, Frequency: ${widget.frequency}, Date: ${now.toISOString()}`
      );

      this.authService
        .getPerformanceValueForPeriod(
          widget.kpiId,
          widget.frequency?.toLowerCase() || 'daily',
          now.toISOString()
        )
        .subscribe({
          next: (data) => {
            console.log(`Response for ${widget.name}:`, data);
            if (data && data.value !== null && data.value !== undefined) {
              widget.inputValue = Number(data.value);
              widget.inputSaved = true;
              console.log(
                `Loaded performance data for ${widget.name}: value=${data.value}, saved=true`
              );
            } else {
              widget.inputValue = undefined;
              widget.inputSaved = false;
              console.log(`No performance data found for ${widget.name}`);
            }
            widget.isLoading = false;
            pendingRequests--;
            if (pendingRequests === 0) {
              this.widgetsLoading = false;
              console.log('All widget data loaded');
            }
          },
          error: (error) => {
            console.error(
              `Error fetching performance value for ${widget.name}:`,
              error
            );
            widget.inputValue = undefined;
            widget.inputSaved = false;
            widget.isLoading = false;
            pendingRequests--;
            if (pendingRequests === 0) {
              this.widgetsLoading = false;
              console.log('All widget data loaded (with errors)');
            }
          },
        });
    });
  }

  loadPerformanceHistory(): void {
    console.log('Loading performance history...');
    this.authService.getPerformanceHistory().subscribe(
      (data: PerformanceData[]) => {
        console.log('Performance history loaded:', data);
        this.performanceHistory = data;
        this.renderCombinedChart();
        this.setupKpiSparklines();
      },
      (error) => {
        console.error('Error fetching performance history:', error);
      }
    );
  }

  initializeWidgets(): void {
    const savedState = localStorage.getItem('dashboardWidgetNames');

    if (savedState) {
      const savedNames: string[] = JSON.parse(savedState);
      this.widgets = this.kpis
        .filter((kpi) => savedNames.includes(kpi.name))
        .map((kpi) => this.createWidgetFromKpi(kpi));
    } else {
      // Default: show all KPIs
      this.widgets = this.kpis.map((kpi) => this.createWidgetFromKpi(kpi));
    }
    this.saveWidgetState();
    console.log('Initialized Widgets:', this.widgets);
  }

  // Helper to create a widget from a KPI
  private createWidgetFromKpi(kpi: Kpi): Widget {
    return {
      kpiId: Number(kpi.id),
      name: kpi.name,
      description: kpi.description,
      target: kpi.target,
      frequency: kpi.frequency,
      unit: kpi.unit,
      visualization: kpi.visualization,
      inputValue: undefined,
      inputSaved: false,
      isLoading: true,
    };
  }

  isKpiSelected(kpiName: string): boolean {
    return this.widgets.some((w) => w.name === kpiName);
  }

  toggleKpi(kpiName: string): void {
    const kpi = this.kpis.find((k) => k.name === kpiName);
    if (kpi && !this.isKpiSelected(kpiName)) {
      const newWidget = this.createWidgetFromKpi(kpi);
      this.widgets.push(newWidget);
      // Fetch data for the newly added widget
      this.fetchSingleWidgetData(newWidget);
    } else if (kpi) {
      this.widgets = this.widgets.filter((w) => w.name !== kpiName);
    }
    this.saveWidgetState();
    this.setupKpiCharts();
  }

  // Fetch data for a single widget
  private fetchSingleWidgetData(widget: Widget): void {
    const user = this.authService.getUser();
    if (!user) return;

    widget.isLoading = true;
    const now = new Date();

    this.authService
      .getPerformanceValueForPeriod(
        widget.kpiId,
        widget.frequency?.toLowerCase() || 'daily',
        now.toISOString()
      )
      .subscribe({
        next: (data) => {
          if (data && data.value !== null && data.value !== undefined) {
            widget.inputValue = Number(data.value);
            widget.inputSaved = true;
          }
          widget.isLoading = false;
        },
        error: () => {
          widget.isLoading = false;
        },
      });
  }

  // Save input value for a widget
  saveInput(widget: Widget) {
    const user = this.authService.getUser();
    if (!user) {
      alert('User session expired. Please log in again.');
      return;
    }
    const now = new Date();
    this.authService
      .upsertPerformanceData({
        user_id: user.id,
        kpi_id: widget.kpiId,
        value: widget.inputValue ?? 0,
        frequency: widget.frequency?.toLowerCase() || 'daily',
        date: now.toISOString(),
      })
      .subscribe({
        next: () => {
          widget.inputSaved = true;
          // Refresh performance data after save
          this.loadPerformanceHistory();
          // Show success message
          alert('Value saved successfully!');
        },
        error: (error) => {
          console.error('Error saving value:', error);
          alert('Failed to save value. Please try again.');
        },
      });
  }

  // Edit input value for a widget
  editInput(widget: Widget) {
    widget.inputSaved = false;
  }

  loadWidgetState(): void {
    // Only load widget selection (names)
    // Input values will be fetched from API in fetchWidgetPerformanceData()
    // This is just to preserve which KPIs the user selected
  }

  saveWidgetState(): void {
    // Only save the names of selected widgets
    const widgetNames = this.widgets.map((w) => w.name);
    localStorage.setItem('dashboardWidgetNames', JSON.stringify(widgetNames));
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
    this.kpiCharts.forEach((chart) => chart.destroy());
    this.kpiCharts = [];

    if (!this.kpiChartRefs || this.kpiChartRefs.length === 0) {
      console.warn('No kpiChartRefs available to render charts');
      return;
    }

    if (!this.widgets.length || !this.performanceHistory.length) {
      console.warn('Widgets or performance history not loaded yet:', {
        widgets: this.widgets,
        performanceHistory: this.performanceHistory,
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
        .filter((entry) => {
          const kpi = this.kpis.find((k) => k.name === widget.name);
          return kpi && kpi.id === entry.kpi_id;
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      if (kpiHistory.length === 0) {
        console.warn(`No history data for ${widget.name}`);
        return;
      }

      const labels = kpiHistory.map((entry) =>
        new Date(entry.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      );
      const data = kpiHistory.map((entry) => entry.value || 0);

      console.log(`Rendering chart for ${widget.name}:`, { labels, data });

      try {
        const datasets: any[] = [
          {
            label: 'Actual',
            data: data,
            borderColor: 'red',
            fill: false,
            tension: 0.4,
          },
        ];

        // Only add target line if target exists and is not 0
        if (widget.target && widget.target !== 0) {
          datasets.push({
            label: 'Target',
            data: Array(labels.length).fill(widget.target),
            borderColor: 'green',
            fill: false,
            tension: 0.4,
          });
        }

        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { title: { display: true, text: 'Time' } },
              y: { title: { display: true, text: 'Value' }, beginAtZero: true },
            },
            plugins: {
              legend: { display: true, position: 'top' },
            },
          },
        });

        this.kpiCharts.push(chart);
        console.log(`Chart rendered successfully for ${widget.name}`);
      } catch (error) {
        console.error(`Error rendering chart for ${widget.name}:`, error);
      }
    });
  }

  renderCombinedChart(): void {
    console.log('renderCombinedChart called', {
      hasChartRef: !!this.combinedKpiChartRef,
      performanceHistoryLength: this.performanceHistory.length,
      kpisLength: this.kpis.length,
      widgetsLength: this.widgets.length,
    });

    if (this.combinedChart) {
      this.combinedChart.destroy();
      this.combinedChart = undefined;
    }

    // Early return checks
    if (!this.combinedKpiChartRef) {
      console.log('Chart ref not available - waiting for widgets to load');
      return;
    }

    if (!this.performanceHistory.length) {
      console.warn('No performance history data available');
      return;
    }

    if (!this.kpis.length) {
      console.warn('No KPIs available');
      return;
    }

    const ctx = this.combinedKpiChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    // Filter data based on time range
    let filteredHistory = [...this.performanceHistory];
    if (this.chartTimeRange === 'custom') {
      // Custom date range
      if (this.chartStartDate) {
        const startDate = new Date(this.chartStartDate);
        filteredHistory = filteredHistory.filter(
          (entry) => new Date(entry.date) >= startDate
        );
      }
      if (this.chartEndDate) {
        const endDate = new Date(this.chartEndDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        filteredHistory = filteredHistory.filter(
          (entry) => new Date(entry.date) <= endDate
        );
      }
    } else if (this.chartTimeRange !== 'all') {
      const days = parseInt(this.chartTimeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredHistory = filteredHistory.filter(
        (entry) => new Date(entry.date) >= cutoffDate
      );
    }

    // Filter by selected KPIs if any are selected
    const kpisToShow =
      this.selectedKpiIds.length > 0
        ? this.kpis.filter((kpi) =>
            this.selectedKpiIds.includes(Number(kpi.id))
          )
        : this.kpis;

    if (filteredHistory.length === 0) {
      console.warn('No data in selected time range');
      return;
    }

    // Get all unique dates from filtered data
    const allDates = Array.from(
      new Set(filteredHistory.map((entry) => entry.date))
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const labels = allDates.map((date) =>
      new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    // One dataset per KPI
    const datasets = kpisToShow.map((kpi, index) => {
      const data = allDates.map((date) => {
        const entry = filteredHistory.find(
          (e) => e.kpi_id === kpi.id && e.date === date
        );
        return entry ? entry.value : null;
      });
      return {
        label: kpi.name,
        data: data,
        borderColor: this.kpiColors[index % this.kpiColors.length],
        backgroundColor:
          this.chartType === 'bar'
            ? this.kpiColors[index % this.kpiColors.length] + '80'
            : 'transparent',
        fill: false,
        tension: 0.4,
      };
    });

    this.combinedChart = new Chart(ctx, {
      type: this.chartType,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: 'Value' }, beginAtZero: true },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    });

    console.log('Combined chart rendered successfully!');
  }

  // Called when chart controls change
  onChartControlChange(): void {
    this.renderCombinedChart();
  }

  // Toggle KPI selection for chart
  toggleKpiInChart(kpiId: number | string | undefined): void {
    if (kpiId === undefined) return;
    const index = this.selectedKpiIds.indexOf(kpiId);
    if (index > -1) {
      this.selectedKpiIds.splice(index, 1);
    } else {
      this.selectedKpiIds.push(kpiId);
    }
    this.renderCombinedChart();
  }

  // Check if KPI is selected for chart
  isKpiSelectedInChart(kpiId: number | string | undefined): boolean {
    if (kpiId === undefined) return false;
    return (
      this.selectedKpiIds.length === 0 || this.selectedKpiIds.includes(kpiId)
    );
  }

  // Select all KPIs for chart
  selectAllKpisInChart(): void {
    this.selectedKpiIds = [];
    this.renderCombinedChart();
  }

  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  downloadMyKpiReport() {
    const user = this.authService.getUser();
    if (!user?.id) {
      alert('User session expired. Please log in again.');
      return;
    }
    // Get the KPI IDs from the widgets array
    const kpiIds = this.widgets.map((w) => w.kpiId);

    this.authService.downloadKpiReportForUser(kpiIds, user.id).subscribe(
      (response) => {
        const blob = new Blob([response.body!], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_kpi_report.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      (error) => {
        console.error('Download failed', error);
        alert('Failed to download report.');
      }
    );
  }

  // Calculate trend for a KPI comparing current to previous period
  getKpiTrend(kpiId: number): { direction: string; percentage: number } | null {
    const kpiData = this.performanceHistory
      .filter((entry) => entry.kpi_id === kpiId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (kpiData.length < 2) {
      return null;
    }

    const current = kpiData[0].value;
    const previous = kpiData[1].value;

    if (previous === 0) {
      return { direction: 'stable', percentage: 0 };
    }

    const percentChange = Math.round(((current - previous) / previous) * 100);
    let direction = 'stable';

    if (percentChange > 0) {
      direction = 'up';
    } else if (percentChange < 0) {
      direction = 'down';
    }

    return {
      direction,
      percentage: Math.abs(percentChange),
    };
  }

  // Calculate progress percentage towards target
  getProgressPercentage(widget: Widget): number {
    if (
      !widget.target ||
      widget.target === 0 ||
      widget.inputValue === undefined
    ) {
      return 0;
    }
    const progress = Math.round((widget.inputValue / widget.target) * 100);
    return Math.min(progress, 100); // Cap at 100%
  }

  // Setup individual sparkline charts for each KPI widget
  setupKpiSparklines(): void {
    setTimeout(() => {
      // Destroy existing charts
      this.kpiCharts.forEach((chart) => chart.destroy());
      this.kpiCharts = [];

      this.widgets.forEach((widget, index) => {
        const canvasId = `kpiChart-${widget.kpiId}`;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (!canvas) {
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return;
        }

        // Get data for this KPI
        const kpiData = this.performanceHistory
          .filter((entry) => entry.kpi_id === widget.kpiId)
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .slice(-10); // Last 10 data points

        if (kpiData.length === 0) {
          return;
        }

        const labels = kpiData.map((entry) =>
          new Date(entry.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        );
        const data = kpiData.map((entry) => entry.value);
        const color = this.kpiColors[index % this.kpiColors.length];

        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                data: data,
                borderColor: color,
                backgroundColor: color + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
              },
            },
            scales: {
              x: {
                display: false,
              },
              y: {
                display: false,
              },
            },
            interaction: {
              mode: 'nearest',
              axis: 'x',
              intersect: false,
            },
          },
        });

        this.kpiCharts.push(chart);
      });
    }, 100);
  }
}

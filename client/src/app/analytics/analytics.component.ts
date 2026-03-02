import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import {
  ChartData,
  ChartOptions,
  ChartType,
  ChartTypeRegistry,
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

interface KPI {
  name: string;
  description: string;
  unit: string;
  target?: number | null;
  frequency: string;
  visualization: string;
  data: { date: string; value: number }[];
  chartType?: ChartType;
  chartData?: ChartData;
  chartOptions?: ChartOptions;
}

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, BaseChartDirective, FormsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
})
export class AnalyticsComponent implements OnInit {
  kpis: KPI[] = [];
  allKpiData: KPI[] = []; // Store original data
  startDate: string = '';
  endDate: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.authService.getAnalytics().subscribe({
      next: (data) => {
        this.allKpiData = data; // Store original data
        this.applyDateFilter(); // Apply initial filter
      },
      error: (err) => {
        console.error('Failed to fetch KPIs', err);
      },
    });
  }

  applyDateFilter(): void {
    const start = this.startDate ? new Date(this.startDate) : null;
    const end = this.endDate ? new Date(this.endDate) : null;

    this.kpis = this.allKpiData.map((kpi: KPI) => {
      // Filter data by date range
      let filteredData = kpi.data;
      if (start || end) {
        filteredData = kpi.data.filter((entry) => {
          const entryDate = new Date(entry.date);
          if (start && entryDate < start) return false;
          if (end && entryDate > end) return false;
          return true;
        });
      }

      if (filteredData.length === 0) {
        // If no data in range, show empty chart
        filteredData = [{ date: new Date().toISOString(), value: 0 }];
      }

      // Sort data by date
      filteredData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Determine grouping based on date range
      const dateRange = this.getDateRangeDays(filteredData);
      const groupedData = this.groupDataByRange(filteredData, dateRange);

      const labels = groupedData.map((item) => item.label);
      const values = groupedData.map((item) => item.value);

      const chartType = this.getChartType(kpi.visualization);

      let finalChartData: ChartData;

      if (chartType === 'pie' || chartType === 'doughnut') {
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        const total = kpi.target || 100; // Use 100 as default if no target
        const remainder = Math.max(total - average, 0);

        finalChartData = {
          labels: ['Average', 'Remaining'],
          datasets: [
            {
              data: [average, remainder],
              backgroundColor: ['#60A5FA', '#E5E7EB'],
            },
          ],
        };
      } else {
        // For bar and line charts, add target line and color code values
        const datasets: any[] = [
          {
            label: kpi.name,
            data: values,
            backgroundColor:
              chartType === 'line'
                ? 'rgba(59,130,246,0.2)' // Blue fill for line charts
                : kpi.target
                ? values.map(
                    (val) =>
                      val >= kpi.target!
                        ? 'rgba(34,197,94,0.7)' // Green when meeting/exceeding target
                        : 'rgba(239,68,68,0.7)' // Red when below target
                  )
                : 'rgba(59,130,246,0.7)', // Default blue if no target
            borderColor:
              chartType === 'line'
                ? 'rgba(59,130,246,1)' // Blue border for line charts
                : kpi.target
                ? values.map((val) =>
                    val >= kpi.target!
                      ? 'rgba(34,197,94,1)'
                      : 'rgba(239,68,68,1)'
                  )
                : 'rgba(59,130,246,1)', // Default blue if no target
            borderWidth: 2,
            fill: chartType === 'line',
            tension: 0.4,
            // Point colors change based on target for line charts
            pointBackgroundColor:
              chartType === 'line' && kpi.target
                ? values.map(
                    (val) =>
                      val >= kpi.target!
                        ? 'rgba(34,197,94,1)' // Green point when meeting/exceeding target
                        : 'rgba(239,68,68,1)' // Red point when below target
                  )
                : chartType === 'line'
                ? 'rgba(59,130,246,1)' // Default blue points if no target
                : undefined,
            pointBorderColor:
              chartType === 'line' && kpi.target
                ? values.map((val) =>
                    val >= kpi.target!
                      ? 'rgba(34,197,94,1)'
                      : 'rgba(239,68,68,1)'
                  )
                : chartType === 'line'
                ? 'rgba(59,130,246,1)' // Default blue points if no target
                : undefined,
            pointRadius: chartType === 'line' ? 5 : undefined,
            pointHoverRadius: chartType === 'line' ? 7 : undefined,
          },
        ];

        // Add target line for reference
        if (kpi.target) {
          datasets.push({
            label: 'Target',
            data: new Array(values.length).fill(kpi.target),
            borderColor: 'rgba(251,191,36,1)', // Amber/yellow for target line
            backgroundColor: 'rgba(251,191,36,0.1)',
            borderWidth: 2,
            borderDash: [5, 5], // Dashed line
            pointRadius: 0, // No points on the line
            fill: false,
            type: chartType === 'bar' ? 'line' : undefined, // Force line type when base is bar
          });
        }

        finalChartData = {
          labels,
          datasets,
        };
      }

      return {
        ...kpi,
        chartType,
        chartData: finalChartData,
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = context.label || '';
                  const value =
                    chartType === 'pie' || chartType === 'doughnut'
                      ? context.parsed
                      : context.parsed.y;

                  if (chartType === 'pie' || chartType === 'doughnut') {
                    // Custom tooltip for pie/doughnut charts
                    if (label === 'Average') {
                      if (kpi.target) {
                        const status =
                          value >= kpi.target
                            ? '✓ Above target'
                            : '✗ Below target';
                        return `${label}: ${value.toFixed(1)} ${
                          kpi.unit
                        } (${status})`;
                      }
                      return `${label}: ${value.toFixed(1)} ${kpi.unit}`;
                    }
                    return `${label}: ${value.toFixed(1)} ${kpi.unit}`;
                  }

                  // Tooltip for bar/line charts
                  const datasetLabel = context.dataset.label || '';
                  if (datasetLabel === 'Target') {
                    return `Target: ${value} ${kpi.unit}`;
                  }
                  if (kpi.target) {
                    const status =
                      value >= kpi.target ? '✓ Above target' : '✗ Below target';
                    return `${datasetLabel}: ${value} ${kpi.unit} (${status})`;
                  }
                  return `${datasetLabel}: ${value} ${kpi.unit}`;
                },
              },
            },
          },
          scales:
            chartType === 'bar' || chartType === 'line'
              ? {
                  y: {
                    suggestedMax: kpi.target
                      ? Math.max(...values, kpi.target) * 1.1
                      : Math.max(...values) * 1.1,
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: kpi.unit || '',
                    },
                    ticks: kpi.target
                      ? {
                          stepSize: Math.ceil(kpi.target / 5),
                        }
                      : {},
                  },
                }
              : undefined,
        } as ChartOptions,
      };
    });
  }

  resetDateFilter(): void {
    // Clear date filters to show all data
    this.startDate = '';
    this.endDate = '';
    this.applyDateFilter();
  }

  getDateRangeDays(data: { date: string; value: number }[]): number {
    if (data.length === 0) return 0;
    const dates = data.map((d) => new Date(d.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  }

  groupDataByRange(
    data: { date: string; value: number }[],
    rangeDays: number
  ): { label: string; value: number }[] {
    if (data.length === 0) return [];

    // Decide grouping strategy based on range
    if (rangeDays <= 1) {
      // Today - show all data points
      return data.map((item) => ({
        label: new Date(item.date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        value: item.value,
      }));
    } else if (rangeDays <= 7) {
      // Week - show daily
      return data.map((item) => {
        const date = new Date(item.date);
        return {
          label: `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
            .getDate()
            .toString()
            .padStart(2, '0')}`,
          value: item.value,
        };
      });
    } else if (rangeDays <= 31) {
      // Month - show daily or group by week
      return data.map((item) => {
        const date = new Date(item.date);
        return {
          label: `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
            .getDate()
            .toString()
            .padStart(2, '0')}`,
          value: item.value,
        };
      });
    } else if (rangeDays <= 100) {
      // Quarter - group by week
      const grouped = new Map<string, { sum: number; count: number }>();
      data.forEach((item) => {
        const date = new Date(item.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week
        const weekKey = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

        if (!grouped.has(weekKey)) {
          grouped.set(weekKey, { sum: 0, count: 0 });
        }
        const existing = grouped.get(weekKey)!;
        existing.sum += item.value;
        existing.count += 1;
      });

      return Array.from(grouped.entries()).map(([label, data]) => ({
        label: `Week ${label}`,
        value: data.sum / data.count,
      }));
    } else {
      // Year or more - group by month
      const grouped = new Map<string, { sum: number; count: number }>();
      data.forEach((item) => {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}`;

        if (!grouped.has(monthKey)) {
          grouped.set(monthKey, { sum: 0, count: 0 });
        }
        const existing = grouped.get(monthKey)!;
        existing.sum += item.value;
        existing.count += 1;
      });

      return Array.from(grouped.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, data]) => {
          const [year, month] = label.split('-');
          const monthNames = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          return {
            label: `${monthNames[parseInt(month) - 1]} ${year}`,
            value: data.sum / data.count,
          };
        });
    }
  }

  setPresetFilter(preset: string): void {
    const today = new Date();
    const start = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      default:
        this.resetDateFilter();
        return;
    }

    this.startDate = start.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    this.applyDateFilter();
  }

  getChartType(visualization: string): keyof ChartTypeRegistry {
    switch (visualization) {
      case 'Bar':
        return 'bar';
      case 'Line':
        return 'line';
      case 'Pie':
        return 'pie';
      case 'Gauge':
        return 'doughnut'; // Fallback for gauge
      default:
        return 'bar'; // Fallback
    }
  }

  getUserRole(): string | null {
    return this.authService.getRole();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

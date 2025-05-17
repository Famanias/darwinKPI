import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  target: number;
  frequency: string;
  visualization: string;
  data: { date: string; value: number }[];
  chartType?: ChartType;
  chartData?: ChartData;
  chartOptions?: ChartOptions;
}

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
})
export class AnalyticsComponent implements OnInit {
  kpis: KPI[] = [];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.getAnalytics().subscribe({
      next: (data) => {
        this.kpis = data.map((kpi: KPI) => {
          const labels = kpi.data.map((entry) => {
            const date = new Date(entry.date);
            // Format as MM/DD, e.g. "05/17"
            return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
              .getDate()
              .toString()
              .padStart(2, '0')}`;
          });
          const values = kpi.data.map((entry) => entry.value);

          const chartType = this.getChartType(kpi.visualization);

          let finalChartData: ChartData;

          if (chartType === 'pie' || chartType === 'doughnut') {
            const average = values.reduce((a, b) => a + b, 0) / values.length;
            const total = kpi.target; // Assuming "target" is the max or goal total
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
            finalChartData = {
              labels,
              datasets: [
                {
                  label: kpi.name,
                  data: values,
                  backgroundColor: values.map((val) =>
                    val >= kpi.target
                      ? 'rgba(34,197,94,0.7)'
                      : 'rgba(59,130,246,0.5)'
                  ),
                  borderColor: 'rgba(59, 130, 246, 1)',
                  fill: chartType === 'line',
                },
              ],
            };
          }

          const chartData: ChartData = {
            labels,
            datasets: [
              {
                label: kpi.name,
                data: values,
                backgroundColor:
                  chartType === 'pie' || chartType === 'doughnut'
                    ? values.map(() => `hsl(${Math.random() * 360}, 70%, 60%)`)
                    : values.map((val) =>
                        val >= kpi.target
                          ? 'rgba(34,197,94,0.7)'
                          : 'rgba(59,130,246,0.5)'
                      ), // Green if ≥ target

                borderColor:
                  chartType === 'line' || chartType === 'bar'
                    ? 'rgba(59, 130, 246, 1)'
                    : undefined,
                fill: chartType === 'line',
              },
            ],
          };

          return {
            ...kpi,
            chartType,
            chartData: finalChartData,
            chartOptions: {
              responsive: true,
              maintainAspectRatio: false,
              scales:
                chartType === 'bar' || chartType === 'line'
                  ? {
                      y: {
                        suggestedMax: Math.max(...values, kpi.target), // Ceiling is at least the target
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: kpi.unit || '', // Optional: show unit on Y-axis
                        },
                        ticks: {
                          stepSize: Math.ceil(kpi.target / 5), // Optional: dynamic steps
                        },
                      },
                    }
                  : undefined,
            } as ChartOptions,
          };
        });
      },
      error: (err) => {
        console.error('Failed to fetch KPIs', err);
      },
    });
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

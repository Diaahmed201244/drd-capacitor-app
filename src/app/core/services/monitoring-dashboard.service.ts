import { Injectable } from "@angular/core";
import { BehaviorSubject, interval, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { MonitoringService } from "./monitoring.service";

export interface DashboardMetrics {
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
    activeUsers: number;
    apiCalls: number;
    uptime: number;
}

@Injectable({
    providedIn: "root",
})
export class MonitoringDashboardService {
    private metricsSubject = new BehaviorSubject<DashboardMetrics>({
        memoryUsage: 0,
        errorRate: 0,
        responseTime: 0,
        activeUsers: 0,
        apiCalls: 0,
        uptime: 0,
    });

    constructor(private monitoringService: MonitoringService) {
        this.initializeMetrics();
    }

    private initializeMetrics(): void {
        // Update metrics every minute
        interval(60000).subscribe(() => {
            this.updateMetrics();
        });
    }

    private async updateMetrics(): Promise<void> {
        const currentMetrics = await this.monitoringService.getCurrentMetrics();
        const activeUsers = await this.monitoringService.getActiveUsers();
        const apiCalls = await this.monitoringService.getApiCallCount();
        const uptime = await this.monitoringService.getUptime();

        this.metricsSubject.next({
            memoryUsage: currentMetrics.memoryUsage,
            errorRate: currentMetrics.errorRate,
            responseTime: currentMetrics.responseTime,
            activeUsers,
            apiCalls,
            uptime,
        });
    }

    getMetrics(): Observable<DashboardMetrics> {
        return this.metricsSubject.asObservable();
    }

    getMetricsHistory(): Observable<DashboardMetrics[]> {
        return this.monitoringService.getMetricsHistory().pipe(
            map((history) =>
                history.map((metric) => ({
                    memoryUsage: metric.memoryUsage,
                    errorRate: metric.errorRate,
                    responseTime: metric.responseTime,
                    activeUsers: metric.activeUsers,
                    apiCalls: metric.apiCalls,
                    uptime: metric.uptime,
                }))
            ),
        );
    }

    getAlertStatus(): Observable<boolean> {
        return this.monitoringService.getAlertStatus();
    }

    getPerformanceScore(): Observable<number> {
        return this.metricsSubject.pipe(
            map((metrics) => {
                const weights = {
                    memoryUsage: 0.2,
                    errorRate: 0.3,
                    responseTime: 0.3,
                    uptime: 0.2,
                };

                const score = (
                    (1 - metrics.memoryUsage) * weights.memoryUsage +
                    (1 - metrics.errorRate) * weights.errorRate +
                    (1 - (metrics.responseTime / 5000)) * weights.responseTime +
                    (metrics.uptime / 100) * weights.uptime
                ) * 100;

                return Math.round(score);
            }),
        );
    }
}

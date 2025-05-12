import { Injectable } from "@angular/core";
import * as Sentry from "@sentry/angular";
import { AnalyticsService } from "./analytics.service";

@Injectable({
    providedIn: "root",
})
export class MonitoringService {
    private readonly ALERT_THRESHOLDS = {
        errorRate: 0.05, // 5% error rate
        responseTime: 2000, // 2 seconds
        memoryUsage: 0.8, // 80% memory usage
    };

    constructor(private analytics: AnalyticsService) {
        this.setupPerformanceMonitoring();
    }

    private setupPerformanceMonitoring() {
        // Monitor memory usage
        setInterval(() => {
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize /
                    performance.memory.jsHeapSizeLimit;
                if (memoryUsage > this.ALERT_THRESHOLDS.memoryUsage) {
                    this.triggerAlert("high_memory_usage", {
                        usage: memoryUsage,
                        threshold: this.ALERT_THRESHOLDS.memoryUsage,
                    });
                }
            }
        }, 60000); // Check every minute

        // Monitor error rate
        let errorCount = 0;
        let totalRequests = 0;
        setInterval(() => {
            const errorRate = errorCount / totalRequests;
            if (errorRate > this.ALERT_THRESHOLDS.errorRate) {
                this.triggerAlert("high_error_rate", {
                    rate: errorRate,
                    threshold: this.ALERT_THRESHOLDS.errorRate,
                });
            }
            errorCount = 0;
            totalRequests = 0;
        }, 300000); // Check every 5 minutes
    }

    private triggerAlert(type: string, data: any) {
        // Send to Sentry
        Sentry.captureMessage(`Alert: ${type}`, {
            level: "warning",
            extra: data,
        });

        // Track in Analytics
        this.analytics.trackEvent("alert_triggered", {
            alert_type: type,
            ...data,
        });
    }

    trackRequest(duration: number) {
        if (duration > this.ALERT_THRESHOLDS.responseTime) {
            this.triggerAlert("slow_response", {
                duration,
                threshold: this.ALERT_THRESHOLDS.responseTime,
            });
        }
    }
}

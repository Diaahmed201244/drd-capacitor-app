import { Injectable } from "@angular/core";
import { LoggingService } from "./logging.service";

export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
}

export interface BenchmarkResult {
    name: string;
    metrics: PerformanceMetric[];
    summary: {
        min: number;
        max: number;
        avg: number;
        p95: number;
        p99: number;
    };
}

@Injectable({
    providedIn: "root",
})
export class PerformanceService {
    private metrics: Map<string, PerformanceMetric[]> = new Map();
    private readonly BENCHMARK_ITERATIONS = 100;
    private readonly WARMUP_ITERATIONS = 10;

    constructor(private loggingService: LoggingService) {}

    // Measure execution time of a function
    async measureExecutionTime<T>(
        name: string,
        fn: () => Promise<T> | T,
        iterations: number = this.BENCHMARK_ITERATIONS,
    ): Promise<BenchmarkResult> {
        const times: number[] = [];

        // Warmup
        for (let i = 0; i < this.WARMUP_ITERATIONS; i++) {
            await fn();
        }

        // Actual measurements
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            const end = performance.now();
            times.push(end - start);
        }

        return this.createBenchmarkResult(name, times);
    }

    // Measure memory usage
    measureMemoryUsage(): PerformanceMetric {
        if (!performance.memory) {
            return {
                name: "memory_usage",
                value: 0,
                unit: "bytes",
                timestamp: Date.now(),
            };
        }

        const metric: PerformanceMetric = {
            name: "memory_usage",
            value: performance.memory.usedJSHeapSize,
            unit: "bytes",
            timestamp: Date.now(),
        };

        this.addMetric("memory", metric);
        return metric;
    }

    // Measure network performance
    async measureNetworkPerformance(url: string): Promise<PerformanceMetric> {
        const start = performance.now();
        const response = await fetch(url);
        const end = performance.now();

        const metric: PerformanceMetric = {
            name: "network_performance",
            value: end - start,
            unit: "ms",
            timestamp: Date.now(),
        };

        this.addMetric("network", metric);
        return metric;
    }

    // Measure render performance
    measureRenderPerformance(): PerformanceMetric {
        const start = performance.now();
        // Force a reflow
        document.body.offsetHeight;
        const end = performance.now();

        const metric: PerformanceMetric = {
            name: "render_performance",
            value: end - start,
            unit: "ms",
            timestamp: Date.now(),
        };

        this.addMetric("render", metric);
        return metric;
    }

    // Get all metrics
    getAllMetrics(): Map<string, PerformanceMetric[]> {
        return new Map(this.metrics);
    }

    // Clear metrics
    clearMetrics(): void {
        this.metrics.clear();
    }

    // Get benchmark results
    getBenchmarkResults(): BenchmarkResult[] {
        const results: BenchmarkResult[] = [];
        this.metrics.forEach((metrics, name) => {
            const values = metrics.map((m) => m.value);
            results.push(this.createBenchmarkResult(name, values));
        });
        return results;
    }

    private createBenchmarkResult(
        name: string,
        values: number[],
    ): BenchmarkResult {
        const sorted = [...values].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        const p99Index = Math.floor(sorted.length * 0.99);

        const result: BenchmarkResult = {
            name,
            metrics: values.map((value, index) => ({
                name,
                value,
                unit: "ms",
                timestamp: Date.now() - (values.length - index),
            })),
            summary: {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                p95: sorted[p95Index],
                p99: sorted[p99Index],
            },
        };

        this.loggingService.info(`Benchmark result for ${name}`, result);
        return result;
    }

    private addMetric(category: string, metric: PerformanceMetric): void {
        if (!this.metrics.has(category)) {
            this.metrics.set(category, []);
        }
        this.metrics.get(category)!.push(metric);
    }

    // Start continuous monitoring
    startMonitoring(interval: number = 60000): void {
        setInterval(() => {
            this.measureMemoryUsage();
            this.measureRenderPerformance();
        }, interval);
    }

    // Stop continuous monitoring
    stopMonitoring(): void {
        // Implementation depends on how you want to handle the interval
    }
}

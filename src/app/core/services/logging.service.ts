import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import * as Sentry from "@sentry/angular";

export enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL",
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: any;
    userId?: string;
    sessionId?: string;
    requestId?: string;
}

@Injectable({
    providedIn: "root",
})
export class LoggingService {
    private readonly MAX_LOG_SIZE = 1000;
    private logs: LogEntry[] = [];

    constructor() {
        this.setupErrorHandling();
    }

    private setupErrorHandling(): void {
        window.onerror = (message, source, lineno, colno, error) => {
            this.error("Unhandled error", {
                message,
                source,
                lineno,
                colno,
                error,
            });
        };

        window.onunhandledrejection = (event) => {
            this.error("Unhandled promise rejection", { reason: event.reason });
        };
    }

    private createLogEntry(
        level: LogLevel,
        message: string,
        context?: any,
    ): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            userId: this.getCurrentUserId(),
            sessionId: this.getSessionId(),
            requestId: this.getRequestId(),
        };
    }

    private getCurrentUserId(): string | undefined {
        // Implement user ID retrieval logic
        return undefined;
    }

    private getSessionId(): string {
        return sessionStorage.getItem("sessionId") || "unknown";
    }

    private getRequestId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    private async sendToLogServer(entry: LogEntry): Promise<void> {
        if (environment.production) {
            try {
                // Send to logging server
                await fetch(`${environment.loggingServer}/logs`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(entry),
                });
            } catch (error) {
                console.error("Failed to send log to server:", error);
            }
        }
    }

    private addToLocalLogs(entry: LogEntry): void {
        this.logs.unshift(entry);
        if (this.logs.length > this.MAX_LOG_SIZE) {
            this.logs.pop();
        }
    }

    debug(message: string, context?: any): void {
        const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
        this.addToLocalLogs(entry);
        this.sendToLogServer(entry);
    }

    info(message: string, context?: any): void {
        const entry = this.createLogEntry(LogLevel.INFO, message, context);
        this.addToLocalLogs(entry);
        this.sendToLogServer(entry);
    }

    warn(message: string, context?: any): void {
        const entry = this.createLogEntry(LogLevel.WARN, message, context);
        this.addToLocalLogs(entry);
        this.sendToLogServer(entry);
    }

    error(message: string, context?: any): void {
        const entry = this.createLogEntry(LogLevel.ERROR, message, context);
        this.addToLocalLogs(entry);
        this.sendToLogServer(entry);
        Sentry.captureException(new Error(message), {
            extra: context,
        });
    }

    fatal(message: string, context?: any): void {
        const entry = this.createLogEntry(LogLevel.FATAL, message, context);
        this.addToLocalLogs(entry);
        this.sendToLogServer(entry);
        Sentry.captureMessage(message, {
            level: "fatal",
            extra: context,
        });
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
    }

    // Performance logging
    logPerformance(operation: string, duration: number, context?: any): void {
        this.info(`Performance: ${operation}`, {
            duration,
            ...context,
        });
    }

    // API request logging
    logApiRequest(
        method: string,
        url: string,
        status: number,
        duration: number,
    ): void {
        this.info(`API Request: ${method} ${url}`, {
            status,
            duration,
            method,
            url,
        });
    }

    // User action logging
    logUserAction(action: string, context?: any): void {
        this.info(`User Action: ${action}`, {
            action,
            ...context,
        });
    }
}

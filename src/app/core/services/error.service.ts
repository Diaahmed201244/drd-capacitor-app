import { Injectable } from "@angular/core";
import * as Sentry from "@sentry/angular";
import { BrowserTracing } from "@sentry/tracing";
import { environment } from "../../../environments/environment";

@Injectable({
    providedIn: "root",
})
export class ErrorService {
    constructor() {
        this.initializeSentry();
    }

    private initializeSentry() {
        Sentry.init({
            dsn: environment.sentryDsn,
            integrations: [
                new BrowserTracing({
                    tracingOrigins: ["localhost", environment.apiUrl],
                    routingInstrumentation: Sentry.routingInstrumentation,
                }),
            ],
            tracesSampleRate: 1.0,
            environment: environment.production ? "production" : "development",
        });
    }

    captureError(error: Error, context?: any) {
        Sentry.captureException(error, {
            extra: context,
        });
    }

    captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
        Sentry.captureMessage(message, {
            level,
        });
    }

    setUser(user: { id: string; email?: string; username?: string }) {
        Sentry.setUser(user);
    }

    clearUser() {
        Sentry.setUser(null);
    }
}

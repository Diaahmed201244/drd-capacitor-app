import { Injectable } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs/operators";
import { environment } from "../../../environments/environment";

declare let gtag: Function;

@Injectable({
    providedIn: "root",
})
export class AnalyticsService {
    constructor(private router: Router) {
        this.setupGoogleAnalytics();
    }

    private setupGoogleAnalytics() {
        // Load Google Analytics script
        const script = document.createElement("script");
        script.async = true;
        script.src =
            `https://www.googletagmanager.com/gtag/js?id=${environment.googleAnalyticsId}`;
        document.head.appendChild(script);

        // Initialize gtag
        window.dataLayer = window.dataLayer || [];
        gtag("js", new Date());
        gtag("config", environment.googleAnalyticsId, {
            "send_page_view": false,
        });

        // Track page views
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
        ).subscribe((event: NavigationEnd) => {
            gtag("config", environment.googleAnalyticsId, {
                "page_path": event.urlAfterRedirects,
            });
        });
    }

    trackEvent(eventName: string, eventParams?: object) {
        gtag("event", eventName, eventParams);
    }

    trackUserTiming(category: string, variable: string, value: number) {
        gtag("event", "timing_complete", {
            "name": variable,
            "value": value,
            "event_category": category,
        });
    }

    trackException(description: string, fatal: boolean = false) {
        gtag("event", "exception", {
            "description": description,
            "fatal": fatal,
        });
    }
}

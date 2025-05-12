import { AuthService } from "./services/auth.service";
import { CodeService } from "./services/code.service";
import { VideoService } from "./services/video.service";
import { UtilsService } from "./services/utils.service";
import { ThemeService } from "./services/theme.service";
import { environment } from "./environment";
import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-root",
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class AppComponent {
  private auth: AuthService;
  private code: CodeService;
  private video: VideoService;

  constructor(private router: Router) {
    this.auth = new AuthService();
    this.code = new CodeService();
    this.video = new VideoService();

    this.initializeApp();
  }

  private async initializeApp() {
    // Apply client features from environment
    if (environment.clientFeatures.contextMenuDisabled) {
      UtilsService.disableContextMenu();
    }

    if (environment.clientFeatures.reloadDisabled) {
      UtilsService.preventReload();
    }

    // Initialize theme
    ThemeService.observeColorScheme((isDark) => {
      ThemeService.setTheme(isDark);
    });

    // Set up periodic cleanup
    setInterval(() => {
      UtilsService.cleanupOldData();
    }, environment.cleanupInterval);

    // Initialize orientation handling
    if (environment.clientFeatures.orientationLock) {
      UtilsService.handleOrientationChange(
        () => this.video.enableTheatreMode(),
        () => this.video.disableTheatreMode(),
      );
    }

    // Initialize news ticker
    if (environment.clientFeatures.newsTickerEnabled) {
      ThemeService.initializeNewsTickerAnimation();
    }

    // Set up online/offline handlers
    window.addEventListener("online", () => {
      console.log("Browser is online");
      this.video.playVideo();
    });

    window.addEventListener("offline", () => {
      console.log("Browser is offline");
      this.video.pauseVideo();
    });

    // Initialize video player
    this.video.createPlayer("video-container");
  }

  public static getInstance(): AppComponent {
    if (!window.appInstance) {
      window.appInstance = new AppComponent(null);
    }
    return window.appInstance;
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  AppComponent.getInstance();
});

declare global {
  interface Window {
    appInstance: AppComponent;
  }
}

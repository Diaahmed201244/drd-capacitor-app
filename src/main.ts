import { defineCustomElements } from "@ionic/core/loader";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { AppModule } from "./app.module";

// Initialize Ionic components
defineCustomElements(window);

// Initialize Capacitor plugins
const initializeApp = async () => {
  if (Capacitor.isNativePlatform()) {
    // Set status bar style
    await StatusBar.setStyle({ style: Style.Dark });

    // Hide splash screen
    await SplashScreen.hide();
  }
};

// Initialize the app
initializeApp();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch((err) => console.error(err));

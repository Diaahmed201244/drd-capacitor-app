import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { RouteReuseStrategy } from "@angular/router";
import { IonicModule, IonicRouteStrategy } from "@ionic/angular";
import { AppComponent } from "./app.component";
import { HomePage } from "./pages/Home";
import { Room3DPage } from "./pages/Room3D";
import { AppRoutingModule } from "./app-routing.module";

@NgModule({
    declarations: [
        AppComponent,
        HomePage,
        Room3DPage,
    ],
    imports: [
        BrowserModule,
        IonicModule.forRoot(),
        AppRoutingModule,
    ],
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}

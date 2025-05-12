import { Component } from "@angular/core";
import { balanceService } from "../services/balanceService";
import { IonicPage, NavController } from "ionic-angular";

@IonicPage()
@Component({
  selector: "app-home",
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Home</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ion-padding">
        <h2>Welcome to Jungle World</h2>
        <p>Walk around and interact with animals and regions!</p>
        
        <ion-button expand="block" (click)="checkBalance()">
          Check Balance
        </ion-button>

        <ion-button expand="block" (click)="generateCode()">
          Generate Code
        </ion-button>

        <ion-button expand="block" (click)="convertCodes()">
          Convert Codes
        </ion-button>

        <ion-button expand="block" (click)="goTo3DRoom()">
          Test 3D Room
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: #f4f4f4;
    }
  `],
})
export class HomePage {
  constructor(public navCtrl: NavController) {}

  async checkBalance() {
    try {
      const balance = await balanceService.getBalance("current-user-id");
      console.log("Current balance:", balance);
    } catch (error) {
      console.error("Error checking balance:", error);
    }
  }

  async generateCode() {
    try {
      const code = await balanceService.generateCode("current-user-id");
      console.log("Generated code:", code);
    } catch (error) {
      console.error("Error generating code:", error);
    }
  }

  async convertCodes() {
    try {
      const result = await balanceService.convertCodesToBalance(
        "current-user-id",
        5,
      );
      console.log("Conversion result:", result);
    } catch (error) {
      console.error("Error converting codes:", error);
    }
  }

  goTo3DRoom() {
    this.navCtrl.push("Room3DPage");
  }
}

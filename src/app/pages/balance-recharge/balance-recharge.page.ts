import { Component, OnInit } from "@angular/core";
import { CoreService } from "../../core/services/core.service";

interface Transaction {
    date: Date;
    amount: number;
    status: "success" | "failed";
    isNew: boolean;
}

@Component({
    selector: "app-balance-recharge",
    templateUrl: "./balance-recharge.page.html",
    styleUrls: ["./balance-recharge.page.scss"],
})
export class BalanceRechargePage implements OnInit {
    balance: number = 0;
    quickAmounts: number[] = [10, 20, 50, 100];
    customAmount: number = 0;
    transactions: Transaction[] = [];
    showSuccessModal: boolean = false;
    showErrorModal: boolean = false;
    errorMessage: string = "";

    constructor(private core: CoreService) {}

    ngOnInit() {
        this.loadBalance();
        this.loadTransactions();
    }

    async loadBalance() {
        try {
            const user = await this.core.getCurrentUser();
            if (user) {
                // TODO: Implement balance fetching from your backend
                this.balance = 0; // Replace with actual balance
            }
        } catch (error) {
            console.error("Error loading balance:", error);
        }
    }

    async loadTransactions() {
        try {
            // TODO: Implement transaction history fetching from your backend
            this.transactions = []; // Replace with actual transactions
        } catch (error) {
            console.error("Error loading transactions:", error);
        }
    }

    async handleRecharge(amount: number) {
        try {
            const user = await this.core.getCurrentUser();
            if (!user) {
                throw new Error("User not authenticated");
            }

            // TODO: Implement actual recharge logic with your backend
            // For now, we'll simulate a successful recharge
            this.balance += amount;

            // Add transaction to history
            const newTransaction: Transaction = {
                date: new Date(),
                amount: amount,
                status: "success",
                isNew: true,
            };

            this.transactions.unshift(newTransaction);

            // Remove isNew flag after animation
            setTimeout(() => {
                newTransaction.isNew = false;
            }, 1000);

            // Show success modal
            this.showSuccessModal = true;

            // Reset custom amount if it was used
            if (amount === this.customAmount) {
                this.customAmount = 0;
            }
        } catch (error) {
            console.error("Error processing recharge:", error);
            this.errorMessage = error instanceof Error
                ? error.message
                : "An error occurred";
            this.showErrorModal = true;
        }
    }
}

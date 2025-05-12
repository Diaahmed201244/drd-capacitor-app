import { balanceService } from "../services/balanceService";

export const balanceUI = {
  async updateBalanceDisplay(userId: string) {
    const balance = await balanceService.getBalance(userId);
    const balanceElement = document.getElementById("balanceAmount");
    if (balanceElement) {
      balanceElement.textContent = balance.toFixed(2);
      balanceElement.parentElement?.classList.add("balance-glow");
      setTimeout(() => {
        balanceElement.parentElement?.classList.remove("balance-glow");
      }, 2000);
    }
  },

  async updateCodeCountDisplay(userId: string) {
    const codeCount = await balanceService.getCodeCount(userId);
    const codeCountElement = document.getElementById("codeCount");
    if (codeCountElement) {
      codeCountElement.textContent = codeCount.toString();
    }
  },

  addTransactionRow(type: string, amount: number) {
    const table = document.querySelector("#transactionTable tbody");
    if (!table) return;

    const row = document.createElement("tr");
    row.classList.add("transaction-new");

    const typeCell = document.createElement("td");
    typeCell.textContent = type;

    const amountCell = document.createElement("td");
    amountCell.textContent = `$${amount.toFixed(2)}`;

    const timeCell = document.createElement("td");
    timeCell.textContent = new Date().toLocaleTimeString();

    row.appendChild(typeCell);
    row.appendChild(amountCell);
    row.appendChild(timeCell);

    table.insertBefore(row, table.firstChild);
  },

  playSound(soundId: string) {
    const sound = document.getElementById(soundId) as HTMLAudioElement;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(console.error);
    }
  },

  showRechargeForm() {
    const form = document.getElementById("rechargeForm");
    if (form) {
      form.classList.remove("hidden");
    }
  },

  hideRechargeForm() {
    const form = document.getElementById("rechargeForm");
    if (form) {
      form.classList.add("hidden");
    }
  },
};

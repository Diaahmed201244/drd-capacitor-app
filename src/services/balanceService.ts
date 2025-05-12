import { supabase } from "../../supabase/supabaseClient";
import { codeSecurityService } from "./codeSecurityService";

export const balanceService = {
  async getBalance(userId: string) {
    const { data, error } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data.balance;
  },

  async updateBalance(userId: string, amount: number) {
    const { data: currentBalance } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const newBalance = (currentBalance?.balance || 0) + amount;

    const { error } = await supabase.from("user_balances").upsert({
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return newBalance;
  },

  async addTransaction(
    userId: string,
    type: string,
    amount: number,
    balanceAfter: number,
  ) {
    const { error } = await supabase.from("transactions").insert([
      {
        id: crypto.randomUUID(),
        user_id: userId,
        type,
        amount,
        status: "completed",
        balance_after: balanceAfter,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;
  },

  async getTransactions(userId: string) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async redeemCode(code: string, userId: string) {
    // First verify the code
    const { data: codeData, error: codeError } = await supabase
      .from("codes")
      .select("*")
      .eq("code", code)
      .eq("status", "unused")
      .single();

    if (codeError || !codeData) {
      throw new Error("Invalid or already used code");
    }

    // Update code status
    const { error: updateError } = await supabase
      .from("codes")
      .update({
        status: "used",
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq("code", code);

    if (updateError) throw updateError;

    // Update user balance
    const newBalance = await this.updateBalance(userId, codeData.amount);

    // Record transaction
    await this.addTransaction(
      userId,
      "code_redeem",
      codeData.amount,
      newBalance,
    );

    return {
      success: true,
      data: {
        amount: codeData.amount,
        new_balance: newBalance,
      },
    };
  },

  async getCodeCount(userId: string) {
    const { data, error } = await supabase
      .from("codes")
      .select("*", { count: "exact" })
      .eq("status", "unused")
      .eq("user_id", userId);

    if (error) throw error;
    return data.length;
  },

  async convertCodesToBalance(userId: string, codeCount: number) {
    try {
      // Start a transaction
      const { data: codes, error: codesError } = await supabase
        .from("codes")
        .select("*")
        .eq("status", "unused")
        .eq("used_by", null)
        .limit(codeCount);

      if (codesError) throw codesError;
      if (!codes || codes.length < codeCount) {
        throw new Error(
          `Not enough unused codes. You need ${codeCount} codes.`,
        );
      }

      // Calculate credit amount (10 credits per code)
      const creditAmount = codeCount * 10;

      // Update user balance
      const newBalance = await this.updateBalance(userId, creditAmount);

      // Mark codes as used
      const codeIds = codes.map((code) => code.id);
      const { error: updateError } = await supabase
        .from("codes")
        .update({
          status: "used",
          used_by: userId,
          used_at: new Date().toISOString(),
        })
        .in("id", codeIds);

      if (updateError) throw updateError;

      // Record transaction
      await this.addTransaction(
        userId,
        "code_conversion",
        creditAmount,
        newBalance,
      );

      return {
        success: true,
        data: {
          converted_codes: codeCount,
          credit_amount: creditAmount,
          new_balance: newBalance,
        },
      };
    } catch (error) {
      console.error("Code conversion error:", error);
      throw error;
    }
  },

  async getAvailableCodeCount(userId: string) {
    const { data, error } = await supabase
      .from("codes")
      .select("*", { count: "exact" })
      .eq("status", "unused")
      .eq("used_by", null)
      .eq("user_id", userId);

    if (error) throw error;
    return data.length;
  },

  async generateCode(userId: string) {
    try {
      const code = await codeSecurityService.generateCode(userId);
      return code;
    } catch (error) {
      console.error("Error generating code:", error);
      throw error;
    }
  },

  async checkGoldCodeSet(userId: string) {
    try {
      const result = await codeSecurityService.checkGoldCodePattern(userId);
      if (result.suspicious) {
        throw new Error(result.message);
      }
      return result.message;
    } catch (error) {
      console.error("Error checking gold code set:", error);
      throw error;
    }
  },
};

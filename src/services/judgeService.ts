import { supabase } from "../../supabase/supabaseClient";

interface JudgeDecision {
  approved: boolean;
  reason: string;
  confidence: number;
}

class JudgeService {
  private readonly OPENAI_API_KEY: string;
  private readonly OPENAI_API_URL =
    "https://api.openai.com/v1/chat/completions";

  constructor() {
    this.OPENAI_API_KEY = process.env["VITE_OPENAI_API_KEY"] || "";
    if (!this.OPENAI_API_KEY) {
      console.warn("OpenAI API key not found. Judge service will be limited.");
    }
  }

  private async queryGPT(prompt: string): Promise<string> {
    if (!this.OPENAI_API_KEY) {
      return "API key not configured. Manual review required.";
    }

    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                `You are a fair fraud detection judge for a code economy game.
              Analyze claims carefully and provide clear, logical decisions.
              Consider device fingerprints, IP addresses, and user behavior patterns.
              Format your response as JSON with fields: approved (boolean), reason (string), confidence (number 0-1).`,
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error querying GPT:", error);
      return "Error processing claim. Manual review required.";
    }
  }

  async evaluateClaim(claim: {
    userId: string;
    code: string;
    codeFingerprint: string;
    userFingerprint: string;
    reason: string;
    ipInfo: Record<string, any>;
  }): Promise<JudgeDecision> {
    const prompt = `
Evaluate this code claim:

- Claimed by user: ${claim.userId}
- Code: ${claim.code}
- Code fingerprint: ${claim.codeFingerprint}
- Claim fingerprint: ${claim.userFingerprint}
- IP Info: ${JSON.stringify(claim.ipInfo)}
- Reason: ${claim.reason}

Analyze the claim and provide a decision based on:
1. Fingerprint matching
2. IP address consistency
3. Claim reason plausibility
4. User behavior patterns

Respond in JSON format:
{
  "approved": boolean,
  "reason": "detailed explanation",
  "confidence": number between 0 and 1
}`;

    try {
      const gptResponse = await this.queryGPT(prompt);
      const decision = JSON.parse(gptResponse) as JudgeDecision;

      // Log the decision
      await supabase.from("judge_decisions").insert({
        claim_id: claim.code,
        user_id: claim.userId,
        decision: decision.approved,
        reason: decision.reason,
        confidence: decision.confidence,
        gpt_response: gptResponse,
        created_at: new Date().toISOString(),
      });

      return decision;
    } catch (error) {
      console.error("Error evaluating claim:", error);
      return {
        approved: false,
        reason: "Error processing claim. Manual review required.",
        confidence: 0,
      };
    }
  }

  async getJudgeHistory(userId: string) {
    try {
      const { data: decisions, error } = await supabase
        .from("judge_decisions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return decisions;
    } catch (error) {
      console.error("Error fetching judge history:", error);
      throw error;
    }
  }
}

export const judgeService = new JudgeService();

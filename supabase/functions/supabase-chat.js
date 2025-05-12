require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://obmufgumrrxjvgjquqro.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXVmZ3VtcnJ4anZnanF1cXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2NzY0MTUsImV4cCI6MjA1MzI1MjQxNX0.wUKntErBvsfTgX5FJZ45TdC697Hg63rgkQcI5P-3SpQ";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Store a chat message in the Supabase 'messages' table
 * @param {string} sender - The sender's username
 * @param {string} recipient - The recipient's username
 * @param {string} text - The message text
 */
async function storeMessage(sender, recipient, text) {
    if (!sender || !recipient || !text) {
        console.error("Missing sender, recipient, or text");
        return { error: "Missing sender, recipient, or text" };
    }
    try {
        const { data, error } = await supabase
            .from("messages")
            .insert([
                { sender, recipient, text, timestamp: new Date().toISOString() }
            ]);
        if (error) {
            console.error("Error storing message:", error.message || error);
            return { error };
        } else {
            console.log("Message stored:", data);
            return { data };
        }
    } catch (err) {
        console.error("Unexpected error storing message:", err);
        return { error: err };
    }
}

/**
 * Get a response from OpenAI ChatGPT API securely (server-side)
 * @param {string} userMessage - The user's message
 * @returns {Promise<string>} - The chatbot's response
 */
async function getChatGptResponse(userMessage) {
    const prompt = `You are a helpful assistant. Respond to the user’s message: ${userMessage}`;
    try {
        const response = await axios.post("https://api.openai.com/v1/completions", {
            model: "text-davinci-003",
            prompt: prompt,
            max_tokens: 100,
            temperature: 0.7,
            top_p: 1,
            n: 1,
            stop: ["\n"]
        }, {
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error("Error fetching from OpenAI:", error);
        return "Sorry, I couldn't get a response right now.";
    }
}

// Example usage (uncomment to test):
// storeMessage("Alice", "Bob", "Hello Bob!");
// getChatGptResponse("Hello, who won the world series in 2020?").then(response => console.log(response));

module.exports = { storeMessage, getChatGptResponse };

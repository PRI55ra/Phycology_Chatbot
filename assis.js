// chat.js
import { GoogleGenAI } from "@google/genai";
import readline from "readline";

// === NOTE: you asked to keep the same API key from your code ===
const ai = new GoogleGenAI({
    apiKey: "AIzaSyCESr85EWr8yiSxgO1MSokBfodaj_eWGVo",
});

// System prompt for the assistant
const SYSTEM_INSTRUCTION = `You are a gentle and supportive friend who talks about psychology.
When the user asks any psychology-related question, respond in a kind, understanding, and easy-to-grasp way.
Explain concepts with real-life examples and make the user feel comfortable, like a close friend would.
Keep answers short (about 100 words) so the user doesn't get bored. Always keep your tone warm, empathetic, and encouraging.
If the user asks something not related to psychology, politely guide them back to psychology topics. Never be rude.`;

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "You: ",
});

// We'll maintain a simple chatHistory string (keeps context between turns)
let chatHistory = `System: ${SYSTEM_INSTRUCTION}\n`;

// Helper that extracts text reliably from different SDK response shapes
function extractText(response) {
    // Common patterns
    if (!response) return "";
    if (typeof response === "string") return response;
    // older sample used response.text
    if (response.text) return response.text;
    // some SDKs return output array
    if (Array.isArray(response.output) && response.output.length) {
        // find first textual item
        for (const item of response.output) {
            if (typeof item === "string") return item;
            if (item.content && typeof item.content === "string") return item.content;
            if (item.content && Array.isArray(item.content)) {
                const t = item.content.map(c => c.text || c).join("\n");
                if (t) return t;
            }
        }
    }
    // try nested fields
    if (response.outputText) return response.outputText;
    if (response.result && response.result.outputText) return response.result.outputText;
    return JSON.stringify(response); // fallback (debug)
}

async function askAndRespond() {
    rl.prompt();

    for await (const line of rl) {
        const userInput = line.trim();

        if (!userInput) {
            rl.prompt();
            continue;
        }

        if (["exit", "quit", "bye"].includes(userInput.toLowerCase())) {
            console.log("Assistant: It was nice talking — take care! 👋");
            rl.close();
            break;
        }

        // Append user turn to history
        chatHistory += `User: ${userInput}\nAssistant:`;

        try {
            // Send the full history (system + previous turns + current user input)
            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                // sending content as a single string that includes system + conversation
                contents: chatHistory,
                config: {
                    // Keep assistant behavior consistent
                    systemInstruction: SYSTEM_INSTRUCTION,
                    // optional: limit length so replies stay ~100 words
                    maxOutputTokens: 220,
                },
            });

            const replyText = extractText(response);
            // show assistant reply
            console.log("\nAssistant:", replyText.trim(), "\n");

            // append assistant reply to history so next turns are contextual
            chatHistory += ` ${replyText.trim()}\n`;

        } catch (error) {
            console.error("❌ Error calling GoogleGenAI:", error);
            // don't crash the loop — let user continue
        }

        rl.prompt();
    }
}

askAndRespond();
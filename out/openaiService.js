"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeOpenAI = initializeOpenAI;
exports.isOpenAIConfigured = isOpenAIConfigured;
exports.getChatbotResponse = getChatbotResponse;
const openai_1 = __importDefault(require("openai"));
const scoreCalculator_1 = require("./scoreCalculator");
let openaiClient = null;
function initializeOpenAI() {
    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
        openaiClient = new openai_1.default({ apiKey });
    }
}
function isOpenAIConfigured() {
    return !!openaiClient;
}
async function getChatbotResponse(userMessage, habits) {
    if (!openaiClient) {
        return getLocalResponse(userMessage, habits);
    }
    try {
        const score = (0, scoreCalculator_1.calculateCodeScore)(habits);
        const habitsSummary = formatHabits(habits);
        const systemPrompt = `You are a helpful code mentor for a VS Code extension called "Habit Helper". Your role is to guide developers to understand and fix bad programming habits in their code.

IMPORTANT PRINCIPLES:
1. Never give the complete solution or write code for the user
2. Use the Socratic method - ask questions to guide them to the solution
3. Explain concepts and best practices
4. Be encouraging and supportive
5. Focus on helping them learn, not just fixing the issue

Current Code Status:
- Score: ${score.totalScore}/100 (Grade: ${score.grade})
- Errors: ${score.errorCount}, Warnings: ${score.warningCount}, Tips: ${score.infoCount}

Issues found in the code:
${habitsSummary}

When responding:
- Use markdown formatting with **bold** and *italic*
- Keep responses concise and helpful
- Provide hints rather than solutions
- Ask clarifying questions when appropriate
- Reference specific line numbers if relevant`;
        const response = await openaiClient.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        const content = response.choices[0]?.message?.content;
        return content || "I couldn't generate a response. Please try again.";
    }
    catch (error) {
        console.error("OpenAI API error:", error);
        return "I'm having trouble connecting to OpenAI. Falling back to local responses. Make sure your API key is valid.";
    }
}
function formatHabits(habits) {
    if (habits.length === 0) {
        return "No issues detected! ✨";
    }
    const errors = habits.filter(h => h.severity === "error");
    const warnings = habits.filter(h => h.severity === "warning");
    const infos = habits.filter(h => h.severity === "info");
    let summary = "";
    if (errors.length > 0) {
        summary += `\n**Errors (${errors.length}):**\n`;
        errors.slice(0, 3).forEach(h => {
            summary += `- Line ${h.line + 1}: ${h.message}\n`;
        });
    }
    if (warnings.length > 0) {
        summary += `\n**Warnings (${warnings.length}):**\n`;
        warnings.slice(0, 3).forEach(h => {
            summary += `- Line ${h.line + 1}: ${h.message}\n`;
        });
    }
    if (infos.length > 0) {
        summary += `\n**Tips (${infos.length}):**\n`;
        infos.slice(0, 3).forEach(h => {
            summary += `- Line ${h.line + 1}: ${h.message}\n`;
        });
    }
    return summary;
}
function getLocalResponse(userMessage, habits) {
    // Fallback to local responses if OpenAI is not available
    const msg = userMessage.toLowerCase();
    const score = (0, scoreCalculator_1.calculateCodeScore)(habits);
    if (msg.includes("error") || msg.includes("critical")) {
        const errors = habits.filter(h => h.severity === "error");
        if (errors.length > 0) {
            return `Found ${errors.length} error(s) in your code:\n\n${errors.map(e => `**Line ${e.line + 1}:** ${e.message}`).join("\n")}\n\nConsider researching best practices for these issues.`;
        }
        return "No errors found! ✨";
    }
    if (msg.includes("score") || msg.includes("how")) {
        return `Your code score is **${score.totalScore}/100** (Grade: **${score.grade}**)\n\n${score.feedback}`;
    }
    return "I'm ready to help! Ask me about your code issues, or use your OpenAI API key for more intelligent guidance.";
}
//# sourceMappingURL=openaiService.js.map
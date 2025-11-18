import * as vscode from "vscode";
import { Habit } from "./types/types";
import { calculateCodeScore } from "./scoreCalculator";
import { getChatbotResponse, isOpenAIConfigured } from "./openaiService";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class ChatbotProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "habitHelper.chatbotView";

  private _view?: vscode.WebviewView;
  private habits: Habit[] = [];
  private messages: ChatMessage[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });

    this.updateContent();
  }

  public setHabits(habits: Habit[]) {
    this.habits = habits;
  }

  private async handleMessage(message: any) {
    if (message.type === "userMessage") {
      const userMessage = message.text;
      this.messages.push({ role: "user", content: userMessage });

      // Generate AI response using OpenAI or local fallback
      let response = "Thinking...";
      try {
        response = await getChatbotResponse(userMessage, this.habits);
      } catch (error) {
        response = "Sorry, I encountered an error. Please try again.";
        console.error("Chatbot error:", error);
      }

      this.messages.push({ role: "assistant", content: response });
      this.updateContent();
    }
  }

  private updateContent() {
    if (!this._view) return;

    const messagesHTML = this.messages
      .map(
        (msg) => `
      <div class="message ${msg.role}">
        <div class="message-content">
          ${this.markdownToHTML(msg.content)}
        </div>
      </div>
    `
      )
      .join("");

    this._view.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Habit Helper Chatbot</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: transparent;
            color: var(--vscode-foreground);
            display: flex;
            flex-direction: column;
            height: 100vh;
            padding: 0;
          }

          .chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .message {
            display: flex;
            animation: slideIn 0.3s ease-out;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .message.user {
            justify-content: flex-end;
          }

          .message.assistant {
            justify-content: flex-start;
          }

          .message-content {
            max-width: 85%;
            padding: 10px 14px;
            border-radius: 8px;
            line-height: 1.5;
            word-wrap: break-word;
          }

          .message.user .message-content {
            background: var(--vscode-inputValidation-infoBorder);
            color: var(--vscode-input-foreground);
            border-radius: 16px 4px 16px 16px;
          }

          .message.assistant .message-content {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px 16px 16px 16px;
          }

          .message-content strong {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
          }

          .message-content em {
            color: var(--vscode-descriptionForeground);
          }

          .input-area {
            padding: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
          }

          input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-panel-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 6px;
            font-family: inherit;
            font-size: 13px;
          }

          input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
          }

          button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
          }

          button:hover {
            background: var(--vscode-button-hoverBackground);
          }

          button:active {
            opacity: 0.8;
          }

          .welcome-message {
            text-align: center;
            padding: 20px;
            opacity: 0.7;
          }

          ul, ol {
            margin-left: 20px;
            margin-top: 8px;
          }

          li {
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>
        <div class="chat-container">
          <div class="messages">
            ${messagesHTML || '<div class="welcome-message">👋 Hi! I\'m your Habit Helper Chatbot. Ask me about your code issues!</div>'}
          </div>
          <div class="input-area">
            <input type="text" id="messageInput" placeholder="Ask me about your code..." />
            <button id="sendBtn">Send</button>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          const messageInput = document.getElementById('messageInput');
          const sendBtn = document.getElementById('sendBtn');
          const messagesDiv = document.querySelector('.messages');

          function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            console.log('Sending message:', text);
            vscode.postMessage({ type: 'userMessage', text });
            messageInput.value = '';
            messageInput.focus();

            // Scroll to bottom
            setTimeout(() => {
              messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 100);
          }

          if (sendBtn) {
            sendBtn.addEventListener('click', () => {
              console.log('Send button clicked');
              sendMessage();
            });
          }
          
          if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                console.log('Enter key pressed');
                sendMessage();
              }
            });
          }

          if (messageInput) {
            messageInput.focus();
          }
        </script>
      </body>
      </html>
    `;
  }

  private markdownToHTML(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>")
      .replace(/- /g, "• ")
      .replace(/(\d+)\. /g, "$1. ");
  }
}

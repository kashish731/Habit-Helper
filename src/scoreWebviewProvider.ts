import * as vscode from "vscode";
import { Habit } from "./types/types";
import { calculateCodeScore, getScoreColor } from "./scoreCalculator";

export class ScoreWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "habitHelper.scoreView";

  private _view?: vscode.WebviewView;
  private habits: Habit[] = [];

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

    this.updateContent();
  }

  public updateScore(habits: Habit[]) {
    this.habits = habits;
    this.updateContent();
  }

  private updateContent() {
    if (!this._view) return;

    const score = calculateCodeScore(this.habits);
    const color = getScoreColor(score.totalScore);

    this._view.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Score</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            padding: 20px;
            background: transparent;
            color: var(--vscode-foreground);
          }

          .score-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            animation: slideIn 0.5s ease-out;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .score-circle {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${color}22, ${color}11);
            border: 3px solid ${color};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            box-shadow: 0 8px 24px ${color}33;
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% {
              box-shadow: 0 8px 24px ${color}33;
            }
            50% {
              box-shadow: 0 8px 32px ${color}55;
            }
          }

          .score-number {
            font-size: 56px;
            font-weight: 700;
            color: ${color};
            line-height: 1;
          }

          .score-max {
            font-size: 18px;
            color: var(--vscode-foreground);
            opacity: 0.7;
          }

          .grade-badge {
            font-size: 28px;
            font-weight: 700;
            color: ${color};
          }

          .feedback-text {
            text-align: center;
            font-size: 14px;
            color: var(--vscode-foreground);
            font-weight: 500;
            margin-top: 8px;
          }

          .stats {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-top: 16px;
          }

          .stat-item {
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-size: 12px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
          }

          .stat-label {
            opacity: 0.7;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .stat-value {
            font-size: 18px;
            font-weight: 700;
            margin-top: 4px;
          }

          .error { color: #F44336; }
          .warning { color: #FF9800; }
          .info { color: #2196F3; }

          .feedback-container {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            margin-top: 8px;
          }

          .feedback-emoji {
            font-size: 24px;
            margin-bottom: 8px;
          }

          .feedback-message {
            font-size: 13px;
            line-height: 1.5;
            color: var(--vscode-foreground);
          }
        </style>
      </head>
      <body>
        <div class="score-container">
          <div class="score-circle">
            <div class="score-number">${score.totalScore}</div>
            <div class="score-max">/100</div>
            <div class="grade-badge">${score.grade}</div>
          </div>

          <div class="stats">
            <div class="stat-item">
              <div class="stat-label">Errors</div>
              <div class="stat-value error">${score.errorCount}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Warnings</div>
              <div class="stat-value warning">${score.warningCount}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Info</div>
              <div class="stat-value info">${score.infoCount}</div>
            </div>
          </div>

          <div class="feedback-container">
            <div class="feedback-emoji">${score.feedback.split(" ")[score.feedback.split(" ").length - 1]}</div>
            <div class="feedback-message">${score.feedback}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

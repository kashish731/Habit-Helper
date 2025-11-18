import * as vscode from "vscode";
import { detectors } from "./detectors";
import { Habit } from "./types/types";
import { callLangflow } from "./langflow";
import { HabitTreeDataProvider } from "./habitTreeProvider";
import { ScoreWebviewProvider } from "./scoreWebviewProvider";
import { ChatbotProvider } from "./chatbotProvider";
import { initializeOpenAI } from "./openaiService";

function runAllDetectors(document: vscode.TextDocument): Habit[] {
  const results: Habit[] = [];
  for (const d of detectors) {
    try {
      const res = d.run(document);
      if (Array.isArray(res)) results.push(...res);
    } catch (err) {
      console.error("Detector error:", d.name, err);
    }
  }
  return results;
}

export function activate(context: vscode.ExtensionContext) {
  const diag = vscode.languages.createDiagnosticCollection("habits");
  context.subscriptions.push(diag);

  // Initialize OpenAI
  initializeOpenAI();
  console.log("OpenAI initialized for chatbot");

  // Create and register tree view provider
  const treeProvider = new HabitTreeDataProvider();
  vscode.window.registerTreeDataProvider("habitHelper.issuesView", treeProvider);

  // Create and register score webview provider
  const scoreProvider = new ScoreWebviewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ScoreWebviewProvider.viewType,
      scoreProvider
    )
  );

  // Create and register chatbot provider
  const chatbotProvider = new ChatbotProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatbotProvider.viewType,
      chatbotProvider
    )
  );
  const goToIssueCommand = vscode.commands.registerCommand(
    "habit-helper.goToIssue",
    (habit: Habit) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const position = new vscode.Position(habit.line, habit.startChar ?? 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    }
  );
  context.subscriptions.push(goToIssueCommand);
  const langflowCommand = vscode.commands.registerCommand(
    "habit-helper.sendToLangflow",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }

      const selectedText = editor.document.getText(editor.selection) || editor.document.getText();
      
      try {
        const statusMessage = await vscode.window.showInformationMessage(
          "🔄 Sending code to Langflow...",
          { modal: false }
        );
        
        console.log("Starting Langflow API call...");
        const response = await callLangflow(selectedText);
        
        console.log("Langflow response received:", response);
        
        // Format the response nicely
        const responseText = typeof response === "string" 
          ? response 
          : JSON.stringify(response, null, 2);
        
        vscode.window.showInformationMessage(
          `✅ Langflow: ${responseText.substring(0, 100)}...`,
          { modal: false }
        );
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("Full error:", error);
        vscode.window.showErrorMessage(
          `❌ Langflow Error: ${errorMsg}`,
          { modal: false }
        );
      }
    }
  );
  context.subscriptions.push(langflowCommand);

  // CodeLens Provider
  const clProvider = new (class implements vscode.CodeLensProvider {
    provideCodeLenses(doc: vscode.TextDocument) {
      const habits = runAllDetectors(doc);
      return habits.map((h) => {
        const pos = new vscode.Position(h.line, h.startChar ?? 0);
        return new vscode.CodeLens(new vscode.Range(pos, pos), {
          title: h.codeLensTitle ?? h.message,
          command: ""
        });
      });
    }
  })();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ scheme: "file" }, clProvider)
  );

  const analyze = (doc: vscode.TextDocument) => {
    if (!doc) return;
    const habits = runAllDetectors(doc);

    // Update tree view with habits
    treeProvider.refresh(habits, doc.fileName);

    // Update score webview
    scoreProvider.updateScore(habits);

    // Update chatbot context
    chatbotProvider.setHabits(habits);

    const diagnostics = habits.map((h) => {
      const start = new vscode.Position(h.line, h.startChar ?? 0);
      const end = new vscode.Position(h.line, h.endChar ?? (h.startChar ?? 0) + 1);
      const severity =
        h.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : h.severity === "info"
          ? vscode.DiagnosticSeverity.Information
          : vscode.DiagnosticSeverity.Warning;
      const diagItem = new vscode.Diagnostic(new vscode.Range(start, end), h.message, severity);
      diagItem.source = "habit-helper";
      return diagItem;
    });

    diag.set(doc.uri, diagnostics);
    // refresh codelenses (best effort)
    vscode.commands.executeCommand("editor.action.refreshCodeLenses");
  };

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => analyze(e.document)));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((doc) => analyze(doc)));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => analyze(doc)));

  if (vscode.window.activeTextEditor) {
    analyze(vscode.window.activeTextEditor.document);
  }

  console.log("habit-helper activated (optimized detectors)");
}

export function deactivate() {}

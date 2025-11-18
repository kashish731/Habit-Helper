"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const detectors_1 = require("./detectors");
const langflow_1 = require("./langflow");
const habitTreeProvider_1 = require("./habitTreeProvider");
const scoreWebviewProvider_1 = require("./scoreWebviewProvider");
const chatbotProvider_1 = require("./chatbotProvider");
const openaiService_1 = require("./openaiService");
function runAllDetectors(document) {
    const results = [];
    for (const d of detectors_1.detectors) {
        try {
            const res = d.run(document);
            if (Array.isArray(res))
                results.push(...res);
        }
        catch (err) {
            console.error("Detector error:", d.name, err);
        }
    }
    return results;
}
function activate(context) {
    const diag = vscode.languages.createDiagnosticCollection("habits");
    context.subscriptions.push(diag);
    // Initialize OpenAI
    (0, openaiService_1.initializeOpenAI)();
    console.log("OpenAI initialized for chatbot");
    // Create and register tree view provider
    const treeProvider = new habitTreeProvider_1.HabitTreeDataProvider();
    vscode.window.registerTreeDataProvider("habitHelper.issuesView", treeProvider);
    // Create and register score webview provider
    const scoreProvider = new scoreWebviewProvider_1.ScoreWebviewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(scoreWebviewProvider_1.ScoreWebviewProvider.viewType, scoreProvider));
    // Create and register chatbot provider
    const chatbotProvider = new chatbotProvider_1.ChatbotProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(chatbotProvider_1.ChatbotProvider.viewType, chatbotProvider));
    const goToIssueCommand = vscode.commands.registerCommand("habit-helper.goToIssue", (habit) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const position = new vscode.Position(habit.line, habit.startChar ?? 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
    });
    context.subscriptions.push(goToIssueCommand);
    const langflowCommand = vscode.commands.registerCommand("habit-helper.sendToLangflow", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor");
            return;
        }
        const selectedText = editor.document.getText(editor.selection) || editor.document.getText();
        try {
            const statusMessage = await vscode.window.showInformationMessage("🔄 Sending code to Langflow...", { modal: false });
            console.log("Starting Langflow API call...");
            const response = await (0, langflow_1.callLangflow)(selectedText);
            console.log("Langflow response received:", response);
            // Format the response nicely
            const responseText = typeof response === "string"
                ? response
                : JSON.stringify(response, null, 2);
            vscode.window.showInformationMessage(`✅ Langflow: ${responseText.substring(0, 100)}...`, { modal: false });
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            console.error("Full error:", error);
            vscode.window.showErrorMessage(`❌ Langflow Error: ${errorMsg}`, { modal: false });
        }
    });
    context.subscriptions.push(langflowCommand);
    // CodeLens Provider
    const clProvider = new (class {
        provideCodeLenses(doc) {
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
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file" }, clProvider));
    const analyze = (doc) => {
        if (!doc)
            return;
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
            const severity = h.severity === "error"
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
function deactivate() { }
//# sourceMappingURL=extension.js.map
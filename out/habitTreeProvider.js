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
exports.HabitItem = exports.HabitTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
const scoreCalculator_1 = require("./scoreCalculator");
class HabitTreeDataProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    habits = [];
    currentFile = "";
    refresh(habits, fileName) {
        this.habits = habits;
        this.currentFile = fileName;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show score first, then issues by severity
            const score = (0, scoreCalculator_1.calculateCodeScore)(this.habits);
            const items = [];
            // Add score card at the top
            items.push(new HabitItem(`${(0, scoreCalculator_1.getGradeEmoji)(score.grade)} Score: ${score.totalScore}/100 (${score.grade})`, vscode.TreeItemCollapsibleState.None, "score"));
            // Add feedback
            items.push(new HabitItem(score.feedback, vscode.TreeItemCollapsibleState.None, "feedback"));
            if (this.habits.length === 0) {
                return Promise.resolve(items);
            }
            // Group by severity
            const errors = this.habits.filter(h => h.severity === "error");
            const warnings = this.habits.filter(h => h.severity === "warning");
            const infos = this.habits.filter(h => h.severity === "info");
            if (errors.length > 0) {
                items.push(new HabitItem(`❌ Errors (${errors.length})`, vscode.TreeItemCollapsibleState.Expanded, "error", errors));
            }
            if (warnings.length > 0) {
                items.push(new HabitItem(`⚠️ Warnings (${warnings.length})`, vscode.TreeItemCollapsibleState.Expanded, "warning", warnings));
            }
            if (infos.length > 0) {
                items.push(new HabitItem(`💡 Info (${infos.length})`, vscode.TreeItemCollapsibleState.Expanded, "info", infos));
            }
            return Promise.resolve(items);
        }
        else if (element.habits) {
            // Show individual habits
            return Promise.resolve(element.habits.map((habit, index) => new HabitItem(`Line ${habit.line + 1}: ${habit.message}`, vscode.TreeItemCollapsibleState.None, element.severity, undefined, habit)));
        }
        return Promise.resolve([]);
    }
}
exports.HabitTreeDataProvider = HabitTreeDataProvider;
class HabitItem extends vscode.TreeItem {
    label;
    collapsibleState;
    severity;
    habits;
    habit;
    command;
    constructor(label, collapsibleState, severity, habits, habit, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.severity = severity;
        this.habits = habits;
        this.habit = habit;
        this.command = command;
        // Set icon based on severity or type
        if (severity === "error") {
            this.iconPath = new vscode.ThemeIcon("error");
            this.contextValue = "error";
        }
        else if (severity === "warning") {
            this.iconPath = new vscode.ThemeIcon("warning");
            this.contextValue = "warning";
        }
        else if (severity === "info") {
            this.iconPath = new vscode.ThemeIcon("info");
            this.contextValue = "info";
        }
        else if (severity === "success") {
            this.iconPath = new vscode.ThemeIcon("pass");
            this.contextValue = "success";
        }
        else if (severity === "score") {
            this.iconPath = new vscode.ThemeIcon("graph");
            this.contextValue = "score";
        }
        else if (severity === "feedback") {
            this.iconPath = new vscode.ThemeIcon("lightbulb");
            this.contextValue = "feedback";
        }
        // Add command to navigate to issue when clicked
        if (habit) {
            this.command = {
                command: "habit-helper.goToIssue",
                title: "Go to issue",
                arguments: [habit]
            };
            this.tooltip = habit.message;
        }
        this.description =
            habit && typeof habit.startChar === "number"
                ? `Col ${habit.startChar + 1}`
                : undefined;
    }
}
exports.HabitItem = HabitItem;
//# sourceMappingURL=habitTreeProvider.js.map
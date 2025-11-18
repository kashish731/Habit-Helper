import * as vscode from "vscode";
import { Habit } from "./types/types";
import { calculateCodeScore, getGradeEmoji } from "./scoreCalculator";

export class HabitTreeDataProvider implements vscode.TreeDataProvider<HabitItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<HabitItem | undefined | null | void> =
    new vscode.EventEmitter<HabitItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<HabitItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private habits: Habit[] = [];
  private currentFile: string = "";

  refresh(habits: Habit[], fileName: string): void {
    this.habits = habits;
    this.currentFile = fileName;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HabitItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: HabitItem): Thenable<HabitItem[]> {
    if (!element) {
      // Root level - show score first, then issues by severity
      const score = calculateCodeScore(this.habits);
      const items: HabitItem[] = [];

      // Add score card at the top
      items.push(
        new HabitItem(
          `${getGradeEmoji(score.grade)} Score: ${score.totalScore}/100 (${score.grade})`,
          vscode.TreeItemCollapsibleState.None,
          "score"
        )
      );

      // Add feedback
      items.push(
        new HabitItem(
          score.feedback,
          vscode.TreeItemCollapsibleState.None,
          "feedback"
        )
      );

      if (this.habits.length === 0) {
        return Promise.resolve(items);
      }

      // Group by severity
      const errors = this.habits.filter(h => h.severity === "error");
      const warnings = this.habits.filter(h => h.severity === "warning");
      const infos = this.habits.filter(h => h.severity === "info");

      if (errors.length > 0) {
        items.push(
          new HabitItem(
            `❌ Errors (${errors.length})`,
            vscode.TreeItemCollapsibleState.Expanded,
            "error",
            errors
          )
        );
      }

      if (warnings.length > 0) {
        items.push(
          new HabitItem(
            `⚠️ Warnings (${warnings.length})`,
            vscode.TreeItemCollapsibleState.Expanded,
            "warning",
            warnings
          )
        );
      }

      if (infos.length > 0) {
        items.push(
          new HabitItem(
            `💡 Info (${infos.length})`,
            vscode.TreeItemCollapsibleState.Expanded,
            "info",
            infos
          )
        );
      }

      return Promise.resolve(items);
    } else if (element.habits) {
      // Show individual habits
      return Promise.resolve(
        element.habits.map(
          (habit, index) =>
            new HabitItem(
              `Line ${habit.line + 1}: ${habit.message}`,
              vscode.TreeItemCollapsibleState.None,
              element.severity,
              undefined,
              habit
            )
        )
      );
    }

    return Promise.resolve([]);
  }
}

export class HabitItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly severity: string,
    public habits?: Habit[],
    public habit?: Habit,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);

    // Set icon based on severity or type
    if (severity === "error") {
      this.iconPath = new vscode.ThemeIcon("error");
      this.contextValue = "error";
    } else if (severity === "warning") {
      this.iconPath = new vscode.ThemeIcon("warning");
      this.contextValue = "warning";
    } else if (severity === "info") {
      this.iconPath = new vscode.ThemeIcon("info");
      this.contextValue = "info";
    } else if (severity === "success") {
      this.iconPath = new vscode.ThemeIcon("pass");
      this.contextValue = "success";
    } else if (severity === "score") {
      this.iconPath = new vscode.ThemeIcon("graph");
      this.contextValue = "score";
    } else if (severity === "feedback") {
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

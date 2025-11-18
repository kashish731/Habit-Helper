import * as vscode from "vscode";

export type Severity = "warning" | "info" | "error";

export interface Habit {
  id: string;
  message: string;
  line: number;            // 0-based
  startChar?: number;
  endChar?: number;
  severity?: Severity;
  codeLensTitle?: string;
  meta?: Record<string, any>;
}

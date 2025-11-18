import * as vscode from "vscode";
import { Habit } from "../types/types";

/**
 * Accurate deep nesting detector:
 * - Ignores single-line constructs: if() {}
 * - Ignores top-level blocks
 * - Only counts real nested blocks with multiple levels
 */

const controlKeywords = /\b(if|else if|else|for|while|switch|try|catch|finally)\b/;

export function runDeepNesting(document: vscode.TextDocument, threshold = 3): Habit[] {
  const habits: Habit[] = [];
  let level = 0;

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;
    const line = raw.trim();
    if (!line) continue;

    const opens = (raw.match(/{/g) || []).length;
    const closes = (raw.match(/}/g) || []).length;
    const hasControl = controlKeywords.test(line);

    const isSingleLine = hasControl && opens > 0 && closes > 0;

    // Ignore: if(...) {}  or for(...) {}
    if (isSingleLine) {
      continue;
    }

    // Count depth ONLY when block truly opens
    if (hasControl && opens > 0) {
      level++;
    }

    // Only flag true deep nesting (>= threshold and deeper than 1)
    if (level >= threshold) {
      habits.push({
        id: "deep-nesting",
        message: `Nesting level ${level} detected (≥ ${threshold}). Consider refactoring.`,
        line: i,
        startChar: 0,
        endChar: 0,
        severity: "info",
        codeLensTitle: `⚠️ Deep nesting (${level})`
      });
    }

    level = Math.max(0, level - closes);
  }

  return habits;
}

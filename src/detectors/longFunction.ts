import * as vscode from "vscode";
import { Habit } from "../types/types";

/**
 * Long-function/block detector:
 * - works for brace languages using { } by counting braces
 * - attempts to detect indent-based functions (Python) by scanning "def " lines and subsequent indent
 * - threshold default 25 lines
 */

const funcStartWords = /\b(function|def|fn|class|public|private|protected|void|static)\b/;

export function runLongFunction(document: vscode.TextDocument, threshold = 25): Habit[] {
  const habits: Habit[] = [];
  const n = document.lineCount;

  // 1) Brace-based scanning
  for (let i = 0; i < n; i++) {
    const line = document.lineAt(i).text;
    if (!funcStartWords.test(line)) continue;

    // find block by braces: count opening and closing braces
    let braceCount = 0;
    let start = i;
    let ended = false;
    for (let j = i; j < n; j++) {
      const l = document.lineAt(j).text;
      braceCount += (l.match(/{/g) || []).length;
      braceCount -= (l.match(/}/g) || []).length;
      if (l.trim() && j > i) { /* update last non-empty */ }
      if (braceCount <= 0 && (l.includes("}") || j > i + 0)) {
        const len = j - start + 1;
        if (len >= threshold) {
          habits.push({
            id: "long-function",
            message: `Block starting at line ${start + 1} is ${len} lines long (≥ ${threshold}).`,
            line: start,
            startChar: 0,
            endChar: 0,
            severity: "warning",
            codeLensTitle: `⚠️ Long block (${len} lines)`
          });
        }
        i = j; // skip forward
        ended = true;
        break;
      }
    }
    if (!ended) {
      // could be an indented block (python) — we'll handle below
    }
  }

  // 2) Indent-based scanning for Python-like "def" blocks
  for (let i = 0; i < n; i++) {
    const line = document.lineAt(i).text;
    if (!/^\s*def\s+\w+\s*\(.*\)\s*:/.test(line)) continue;
    const startIndent = line.match(/^\s*/)?.[0]?.length ?? 0;
    let end = i;
    for (let j = i + 1; j < n; j++) {
      const l = document.lineAt(j).text;
      const indent = l.match(/^\s*/)?.[0]?.length ?? 0;
      if (l.trim() === "") { end = j - 1; break; }
      if (indent <= startIndent) { end = j - 1; break; }
      end = j;
    }
    const length = end - i + 1;
    if (length >= threshold) {
      habits.push({
        id: "long-function",
        message: `Function starting at line ${i + 1} is ${length} lines long (≥ ${threshold}).`,
        line: i,
        severity: "warning",
        codeLensTitle: `⚠️ Long function (${length} lines)`
      });
    }
  }

  return habits;
}

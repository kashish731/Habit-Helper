import * as vscode from "vscode";
import { Habit } from "../types/types";

/**
 * Memory leaks detector
 * Detects common patterns that can cause memory leaks in multiple languages:
 * - C++: new without delete, new[] without delete[]
 * - JS/TS: Event listeners without cleanup, timers without clearance
 * - JS/TS: Global variables accumulating data, missing unsubscribe
 * - JS/TS: Circular references, not nullifying references
 */

export function runMemoryLeaks(document: vscode.TextDocument): Habit[] {
  const habits: Habit[] = [];

  // Track new allocations and their corresponding deletes
  const newAllocations = new Map<string, { line: number; isArray: boolean }>();
  const deletedVariables = new Set<string>();

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;
    const line = raw.trim();

    // ❌ C++ new allocation without delete
    const newMatch = /(\w+)\s*=\s*new\s+(\w+)(\[[^\]]*\])?/;
    const match = newMatch.exec(line);
    if (match) {
      const varName = match[1];
      const isArray = !!match[3];
      newAllocations.set(varName, { line: i, isArray });
      
      const col = raw.indexOf("new");
      habits.push({
        id: "cpp-new-allocation",
        message: `Memory allocated with "new"${isArray ? "[]" : ""}. Ensure "delete${isArray ? "[]" : ""}" is called.`,
        line: i,
        startChar: col,
        endChar: col + 3,
        severity: "warning",
        codeLensTitle: `⚠️ New allocation without delete`
      });
    }

    // ❌ C++ delete without checking if pointer is null
    const deleteMatch = /delete\s*(\[\])?\s*(\w+)/.exec(line);
    if (deleteMatch) {
      const varName = deleteMatch[2];
      const isArray = !!deleteMatch[1];
      deletedVariables.add(varName);

      // Check if delete[] is used for array or delete for non-array
      const allocationInfo = newAllocations.get(varName);
      if (allocationInfo && allocationInfo.isArray !== isArray) {
        const col = raw.indexOf("delete");
        const expectedOp = allocationInfo.isArray ? "delete[]" : "delete";
        habits.push({
          id: "delete-mismatch",
          message: `Mismatch: allocated with "new${allocationInfo.isArray ? "[]" : ""}" but deleting with "${expectedOp}". Use "delete${allocationInfo.isArray ? "[]" : ""}" instead.`,
          line: i,
          startChar: col,
          endChar: col + 6,
          severity: "error",
          codeLensTitle: `❌ Delete mismatch`
        });
      }

      // Check if pointer is set to null after delete
      if (!line.includes("= nullptr") && !line.includes("= null")) {
        const col = raw.indexOf("delete");
        habits.push({
          id: "delete-without-nullify",
          message: `Set pointer to nullptr after delete to avoid dangling pointers.`,
          line: i,
          startChar: col,
          endChar: col + 6,
          severity: "warning",
          codeLensTitle: `⚠️ Set to nullptr after delete`
        });
      }
    }

    // ❌ setInterval without corresponding clearInterval (JS/TS)
    const setIntervalMatch = /const\s+(\w+)\s*=\s*setInterval\s*\(/.exec(line);
    if (setIntervalMatch) {
      const varName = setIntervalMatch[1];
      newAllocations.set(varName, { line: i, isArray: false });
    }

    // ❌ setTimeout without corresponding clearTimeout (JS/TS)
    const setTimeoutMatch = /const\s+(\w+)\s*=\s*setTimeout\s*\(/.exec(line);
    if (setTimeoutMatch) {
      const varName = setTimeoutMatch[1];
      newAllocations.set(varName, { line: i, isArray: false });
    }

    // ✅ clearInterval/clearTimeout calls
    const clearMatch = /clear(?:Interval|Timeout)\s*\(\s*(\w+)\s*\)/.exec(line);
    if (clearMatch) {
      deletedVariables.add(clearMatch[1]);
    }

    // ❌ addEventListener without removeEventListener
    const addEventMatch = /addEventListener\s*\(\s*["']([^"']+)["']\s*,/.exec(line);
    if (addEventMatch) {
      const col = raw.indexOf("addEventListener");
      habits.push({
        id: "potential-memory-leak-listener",
        message: `Event listener added without cleanup. Ensure removeEventListener is called.`,
        line: i,
        startChar: col >= 0 ? col : 0,
        endChar: col >= 0 ? col + 17 : 17,
        severity: "warning",
        codeLensTitle: `⚠️ Missing removeEventListener`
      });
    }

    // ❌ Global variable accumulating data (array/object push without limits)
    const globalArrayPush = /\.push\s*\(/.exec(line);
    if (globalArrayPush && !line.includes("for") && !line.includes("while")) {
      const col = raw.indexOf("push");
      if (col >= 0) {
        habits.push({
          id: "unbounded-collection",
          message: `Unbounded collection growth detected. Consider adding size limits or cleanup logic.`,
          line: i,
          startChar: col,
          endChar: col + 4,
          severity: "info",
          codeLensTitle: `💡 Potential memory leak: unbounded array`
        });
      }
    }

    // ❌ Missing unsubscribe in RxJS
    const subscribeMatch = /\.subscribe\s*\(/.exec(line);
    if (subscribeMatch && !line.includes("unsubscribe")) {
      const col = raw.indexOf("subscribe");
      habits.push({
        id: "missing-unsubscribe",
        message: `Observable subscription detected. Ensure unsubscribe is called to prevent memory leaks.`,
        line: i,
        startChar: col,
        endChar: col + 9,
        severity: "warning",
        codeLensTitle: `⚠️ Missing unsubscribe`
      });
    }
  }

  // Check for undeleted allocations
  for (const [varName, info] of newAllocations.entries()) {
    if (!deletedVariables.has(varName) && !varName.includes("timer")) {
      const raw = document.lineAt(info.line).text;
      const col = raw.indexOf(varName);
      habits.push({
        id: "undeleted-allocation",
        message: `Memory allocated with "new${info.isArray ? "[]" : ""}" but never deleted. Potential memory leak.`,
        line: info.line,
        startChar: col >= 0 ? col : 0,
        endChar: col >= 0 ? col + varName.length : varName.length,
        severity: "error",
        codeLensTitle: `❌ Memory not freed: ${varName}`
      });
    }
  }

  return habits;
}

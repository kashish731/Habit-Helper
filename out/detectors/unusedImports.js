"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runUnusedImports = runUnusedImports;
/**
 * Unused imports detector
 * Detects import/require statements that are never used in the code
 * Supports:
 * - ES6 imports: import x from "module"
 * - CommonJS requires: const x = require("module")
 * - Named imports: import { a, b } from "module"
 * - Default + named: import x, { y } from "module"
 */
// Matches: import x from "module" or import { a, b } from "module"
const esImportRegex = /^import\s+(?:(?:\{[^}]*\})|(?:\*\s+as\s+\w+)|(?:\w+(?:\s*,\s*\{[^}]*\})?)|(?:\w+))\s+from\s+["']([^"']+)["']/;
// Matches: const x = require("module") or var x = require("module")
const commonjsRegex = /(?:const|var|let)\s+(\w+)\s*=\s*require\s*\(\s*["']([^"']+)["']\s*\)/;
// Extract imported variable names from import statement
function extractImportedNames(line) {
    const names = [];
    // Handle: import x from "..."
    let match = /import\s+(\w+)\s+from/.exec(line);
    if (match)
        names.push(match[1]);
    // Handle: import { a, b, c } from "..."
    match = /import\s+\{([^}]+)\}/.exec(line);
    if (match) {
        const items = match[1].split(",").map(item => {
            const parts = item.trim().split(" as ");
            return parts[parts.length - 1].trim();
        });
        names.push(...items);
    }
    // Handle: import * as name from "..."
    match = /import\s+\*\s+as\s+(\w+)/.exec(line);
    if (match)
        names.push(match[1]);
    // Handle: const x = require("...")
    match = /(?:const|var|let)\s+(\w+)\s*=\s*require/.exec(line);
    if (match)
        names.push(match[1]);
    return names.filter(n => n.length > 0);
}
// Check if a name is used in the document (excluding the import line)
function isNameUsed(document, name, excludeLine) {
    const nameRegex = new RegExp(`\\b${name}\\b`);
    for (let i = 0; i < document.lineCount; i++) {
        if (i === excludeLine)
            continue; // Skip the import line itself
        const line = document.lineAt(i).text;
        if (nameRegex.test(line)) {
            return true;
        }
    }
    return false;
}
function runUnusedImports(document) {
    const habits = [];
    for (let i = 0; i < document.lineCount; i++) {
        const raw = document.lineAt(i).text;
        const line = raw.trim();
        // Check for ES6 imports or CommonJS requires
        if (!line.startsWith("import") && !line.includes("require"))
            continue;
        const importedNames = extractImportedNames(line);
        for (const name of importedNames) {
            // Skip common built-in patterns
            if (["React", "PropTypes", "moment", "lodash", "_"].includes(name))
                continue;
            // Check if the imported name is actually used
            if (!isNameUsed(document, name, i)) {
                const col = raw.indexOf(name);
                habits.push({
                    id: "unused-import",
                    message: `Unused import "${name}". Remove or use it.`,
                    line: i,
                    startChar: col >= 0 ? col : 0,
                    endChar: col >= 0 ? col + name.length : name.length,
                    severity: "warning",
                    codeLensTitle: `⚠️ Unused import "${name}"`
                });
            }
        }
    }
    return habits;
}
//# sourceMappingURL=unusedImports.js.map
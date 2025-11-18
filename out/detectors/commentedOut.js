"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommentedOut = runCommentedOut;
/**
 * Detect commented-out code.
 * - Supports many comment prefixes (//, #, --, %)
 * - Detects block comment content that looks like code (/* ... *\/)
 * - Uses heuristics to avoid false positives (short comments, TODOs, URLs)
 */
const lineCommentPatterns = [/^\s*\/\//, /^\s*#(?!\s*include|\s*pragma|\s*define)/, /^\s*--/, /^\s*%/, /^\s*;/];
const codeLikeRegex = /[=();{}<>]|->|=>|\breturn\b|\bif\b|\bfor\b|\bwhile\b/;
const ignorePatterns = [/todo/i, /fixme/i, /https?:\/\//i, /^\s*\/\/\s*[-*]+\s*$/, /#\s*include|#\s*pragma|#\s*define/i];
function runCommentedOut(document) {
    const habits = [];
    // 1) Single-line comments
    for (let i = 0; i < document.lineCount; i++) {
        const raw = document.lineAt(i).text;
        const line = raw.trim();
        if (!line)
            continue;
        const isComment = lineCommentPatterns.some((p) => p.test(line));
        if (!isComment)
            continue;
        if (ignorePatterns.some((p) => p.test(line)))
            continue;
        // require it to *look like code*
        if (codeLikeRegex.test(line)) {
            habits.push({
                id: "commented-out-code",
                message: "Commented-out code detected — consider removing or restoring.",
                line: i,
                startChar: raw.indexOf(line),
                endChar: raw.indexOf(line) + line.length,
                severity: "warning",
                codeLensTitle: "⚠️ Commented-out code"
            });
        }
    }
    // 2) Block comments (/* ... */) - scan for start and end on file
    const full = document.getText();
    const blockRegex = /\/\*([\s\S]*?)\*\//g;
    let bm;
    while ((bm = blockRegex.exec(full)) !== null) {
        const content = bm[1];
        if (codeLikeRegex.test(content) && !ignorePatterns.some((p) => p.test(content))) {
            // determine start line of match
            const matchIndex = bm.index;
            const upTo = full.slice(0, matchIndex);
            const startLine = upTo.split(/\r\n|\r|\n/).length - 1;
            habits.push({
                id: "commented-out-block",
                message: "Block comment contains code-like content.",
                line: startLine,
                startChar: 0,
                endChar: 0,
                severity: "warning",
                codeLensTitle: "⚠️ Commented-out block"
            });
        }
    }
    return habits;
}
//# sourceMappingURL=commentedOut.js.map
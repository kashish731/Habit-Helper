"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectors = void 0;
const commentedOut_1 = require("./commentedOut");
const badVariableNames_1 = require("./badVariableNames");
const longFunction_1 = require("./longFunction");
const deepNesting_1 = require("./deepNesting");
const memoryLeaks_1 = require("./memoryLeaks");
const errorHandling_1 = require("./errorHandling");
const securityIssues_1 = require("./securityIssues");
exports.detectors = [
    { name: "commentedOut", run: commentedOut_1.runCommentedOut },
    { name: "badVariableNames", run: badVariableNames_1.runBadVariableNames },
    { name: "longFunction", run: longFunction_1.runLongFunction },
    { name: "deepNesting", run: deepNesting_1.runDeepNesting },
    { name: "memoryLeaks", run: memoryLeaks_1.runMemoryLeaks },
    { name: "errorHandling", run: errorHandling_1.runErrorHandling },
    { name: "securityIssues", run: securityIssues_1.runSecurityIssues },
];
//# sourceMappingURL=index.js.map
import { runCommentedOut } from "./commentedOut";
import { runBadVariableNames } from "./badVariableNames";
import { runLongFunction } from "./longFunction";
import { runDeepNesting } from "./deepNesting";
import { runMemoryLeaks } from "./memoryLeaks";
import { runErrorHandling } from "./errorHandling";
import { runSecurityIssues } from "./securityIssues";

export const detectors = [
  { name: "commentedOut", run: runCommentedOut },
  { name: "badVariableNames", run: runBadVariableNames },
  { name: "longFunction", run: runLongFunction },
  { name: "deepNesting", run: runDeepNesting },
  { name: "memoryLeaks", run: runMemoryLeaks },
  { name: "errorHandling", run: runErrorHandling },
  { name: "securityIssues", run: runSecurityIssues },
] as const;

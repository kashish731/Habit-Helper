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
exports.callLangflow = callLangflow;
const crypto = __importStar(require("crypto"));
const LANGFLOW_API_KEY = "sk-KOTssUD9qqMJrzbF3flTg0aUgkTZos6d0FJZYANRaMY";
const LANGFLOW_ENDPOINT = "http://localhost:7860/api/v1/run/d7fe41e4-9dfa-45b7-9920-832bea3e43bd";
async function callLangflow(input) {
    const payload = {
        output_type: "text",
        input_type: "text",
        input_value: input,
    };
    // Add session ID
    payload.session_id = crypto.randomUUID();
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LANGFLOW_API_KEY}`,
        },
        body: JSON.stringify(payload),
    };
    try {
        console.log("Calling Langflow at:", LANGFLOW_ENDPOINT);
        const response = await fetch(LANGFLOW_ENDPOINT, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Langflow response:", data);
        return data;
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Langflow API Error:", errorMsg);
        throw new Error(`Langflow API failed: ${errorMsg}`);
    }
}
//# sourceMappingURL=langflow.js.map
import * as crypto from "crypto";

const LANGFLOW_API_KEY = "sk-KOTssUD9qqMJrzbF3flTg0aUgkTZos6d0FJZYANRaMY";
const LANGFLOW_ENDPOINT = "http://localhost:7860/api/v1/run/d7fe41e4-9dfa-45b7-9920-832bea3e43bd";

export interface LangflowRequest {
  output_type: string;
  input_type: string;
  input_value: string;
}

export async function callLangflow(input: string): Promise<any> {
  const payload: LangflowRequest = {
    output_type: "text",
    input_type: "text",
    input_value: input,
  };

  // Add session ID
  (payload as any).session_id = crypto.randomUUID();

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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Langflow API Error:", errorMsg);
    throw new Error(`Langflow API failed: ${errorMsg}`);
  }
}

/**
 * llm.ts — LLM invocation wrapper
 * MIGRATION: was forge.manus.im proxy → now calls Google Gemini directly.
 * Interface is identical so all callers work unchanged.
 * Set GEMINI_API_KEY (Google AI Studio → API Keys).
 */
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";
export type TextContent  = { type: "text"; text: string };
export type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto"|"low"|"high" } };
export type FileContent  = { type: "file_url";  file_url: { url: string; mime_type?: string } };
export type MessageContent = string | TextContent | ImageContent | FileContent;
export type Message = { role: Role; content: MessageContent | MessageContent[]; name?: string; tool_call_id?: string };
export type Tool = { type: "function"; function: { name: string; description?: string; parameters?: Record<string,unknown> } };
export type ToolChoicePrimitive = "none"|"auto"|"required";
export type ToolChoiceByName   = { name: string };
export type ToolChoiceExplicit = { type: "function"; function: { name: string } };
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;
export type JsonSchema = { name: string; schema: Record<string,unknown>; strict?: boolean };
export type OutputSchema = JsonSchema;
export type ResponseFormat = {type:"text"} | {type:"json_object"} | {type:"json_schema"; json_schema: JsonSchema};
export type InvokeParams = {
  messages: Message[]; tools?: Tool[]; toolChoice?: ToolChoice; tool_choice?: ToolChoice;
  maxTokens?: number; max_tokens?: number; outputSchema?: OutputSchema; output_schema?: OutputSchema;
  responseFormat?: ResponseFormat; response_format?: ResponseFormat;
};
export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type InvokeResult = {
  id: string; created: number; model: string;
  choices: Array<{ index: number; message: { role: Role; content: string|Array<TextContent|ImageContent|FileContent>; tool_calls?: ToolCall[] }; finish_reason: string|null }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const MODEL = "gemini-2.5-flash";

const ensureArr = (v: MessageContent | MessageContent[]): MessageContent[] => Array.isArray(v) ? v : [v];
const normPart = (p: MessageContent): TextContent|ImageContent|FileContent =>
  typeof p === "string" ? {type:"text",text:p} : p as TextContent|ImageContent|FileContent;
const normMsg = (m: Message) => {
  if (m.role === "tool" || m.role === "function") {
    return { role: m.role, name: m.name, tool_call_id: m.tool_call_id, content: ensureArr(m.content).map(p => typeof p==="string"?p:JSON.stringify(p)).join("\n") };
  }
  const parts = ensureArr(m.content).map(normPart);
  return parts.length===1 && parts[0].type==="text"
    ? { role: m.role, name: m.name, content: (parts[0] as TextContent).text }
    : { role: m.role, name: m.name, content: parts };
};
const normTC = (tc: ToolChoice|undefined, tools: Tool[]|undefined) => {
  if (!tc) return undefined;
  if (tc==="none"||tc==="auto") return tc;
  if (tc==="required") { if (!tools?.length) throw new Error("required needs tools"); if (tools.length>1) throw new Error("required needs single tool"); return {type:"function",function:{name:tools[0].function.name}}; }
  if ("name" in tc) return {type:"function",function:{name:(tc as ToolChoiceByName).name}};
  return tc;
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const { messages, tools, toolChoice, tool_choice, outputSchema, output_schema, responseFormat, response_format } = params;
  const payload: Record<string,unknown> = {
    model: MODEL, messages: messages.map(normMsg), max_tokens: params.maxTokens ?? params.max_tokens ?? 8192,
  };
  if (tools?.length) payload.tools = tools;
  const tc = normTC(toolChoice??tool_choice, tools);
  if (tc) payload.tool_choice = tc;
  const schema = outputSchema ?? output_schema;
  const fmt = responseFormat ?? response_format;
  if (fmt) payload.response_format = fmt;
  else if (schema) payload.response_format = { type: "json_schema", json_schema: schema };
  const res = await fetch(`${GEMINI_BASE}/chat/completions`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(payload),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`LLM failed: ${res.status} – ${e}`); }
  return res.json() as Promise<InvokeResult>;
}

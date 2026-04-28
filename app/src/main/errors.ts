export class ToolError extends Error {
  constructor(message: string, public code = "TOOL_ERROR") {
    super(message);
  }
}

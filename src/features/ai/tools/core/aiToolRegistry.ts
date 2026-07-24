import { AITool } from "./AITool";

class AIToolRegistry {
  private tools: Map<string, AITool> = new Map();

  register(tool: AITool) {
    if (this.tools.has(tool.id)) {
      console.warn(`[AI Tool Registry] Tool ${tool.id} is already registered. Overwriting.`);
    }
    this.tools.set(tool.id, tool);
  }

  remove(toolId: string) {
    this.tools.delete(toolId);
  }

  disable(toolId: string) {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.enabled = false;
    }
  }

  getTool(toolId: string): AITool | undefined {
    return this.tools.get(toolId);
  }

  getAllEnabledTools(): AITool[] {
    return Array.from(this.tools.values()).filter((t) => t.enabled);
  }
}

export const aiToolRegistry = new AIToolRegistry();

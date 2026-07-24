import { aiToolRegistry } from "./core/aiToolRegistry";

// Import Tools
import { FindCustomerTool } from "./customers/FindCustomerTool";
import { CreateCustomerTool } from "./customers/CreateCustomerTool";
import { CreateProductTool } from "./products/CreateProductTool";
import { UpdateStockTool } from "./products/UpdateStockTool";
import { CreatePayableTool } from "./finance/CreatePayableTool";
import { CreateReceivableTool } from "./finance/CreateReceivableTool";
import { CreateTaskTool } from "./tasks/CreateTaskTool";
import { SyncShopeeTool } from "./marketplaces/SyncShopeeTool";
import { SaveMemoryTool } from "./memory/SaveMemoryTool";

// Register all tools automatically
const toolsToRegister = [
  new FindCustomerTool(),
  new CreateCustomerTool(),
  new CreateProductTool(),
  new UpdateStockTool(),
  new CreatePayableTool(),
  new CreateReceivableTool(),
  new CreateTaskTool(),
  new SyncShopeeTool(),
  new SaveMemoryTool()
];

for (const tool of toolsToRegister) {
  aiToolRegistry.register(tool);
}

export { aiToolRegistry };
export { AIToolExecutor } from "./core/aiToolExecutor";
export { AIExecutionPlanner } from "./core/aiExecutionPlanner";
export * from "./core/types";

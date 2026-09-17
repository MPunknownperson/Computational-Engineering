import type { CalculationContext, CalculationResult, FormulaDefinition, NetworkNode, ToolId, Values } from '../types';

export interface ToolModuleOutput {
  formulas: FormulaDefinition[];
  nodes: NetworkNode[];
}

export interface ToolModule {
  id: ToolId;
  name: string;
  description: string;
  dataInputs: string[];
  companionTools: ToolId[];
  build: (values: Values, context: CalculationContext, result: CalculationResult) => ToolModuleOutput;
}
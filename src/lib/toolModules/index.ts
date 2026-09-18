import type { ToolId } from '../types';
import type { ToolModule } from './types';
import { mortgageModule } from './mortgage';
import { taxModule } from './tax';
import { carModule } from './car';
import { compoundModule } from './compound';
import { transactionModule } from './transaction';
import { currencyModule } from './currency';
import { probabilityModule } from './probability';
import { scientificModule } from './scientific';
import { unitsModule } from './units';
import { bmiModule } from './bmi';

export const toolModules: Record<ToolId, ToolModule> = {
  mortgage: mortgageModule,
  tax: taxModule,
  car: carModule,
  compound: compoundModule,
  transaction: transactionModule,
  currency: currencyModule,
  probability: probabilityModule,
  scientific: scientificModule,
  units: unitsModule,
  bmi: bmiModule,
};

export function buildToolModule(tool: ToolId, ...args: Parameters<ToolModule['build']>) {
  const module = toolModules[tool];
  return {
    output: module.build(...args),
    summary: { id: module.id, name: module.name, description: module.description, dataInputs: module.dataInputs, companionTools: module.companionTools },
  };
}
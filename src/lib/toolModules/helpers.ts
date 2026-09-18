import { brand } from '../legal';
import type { CalculationResult, FormulaDefinition, Metric, NetworkNode } from '../types';

export const formula = (id: string, title: string, expression: string, purpose: string, active = true): FormulaDefinition => ({ id, title, expression, purpose, active });
export const node = (id: string, label: string, role: string, value: number | string, format: NetworkNode['format'], formulaNote: string, connections: string[] = []): NetworkNode => ({ id, label, role, institution: `${brand.name} deterministic engine`, value, format, formulaNote, connections });
export const metric = (result: CalculationResult, label: string): Metric['value'] => result.metrics.find(item => item.label === label)?.value ?? 0;
export const part = (result: CalculationResult, label: string) => result.breakdown.find(item => item.label === label)?.value ?? 0;
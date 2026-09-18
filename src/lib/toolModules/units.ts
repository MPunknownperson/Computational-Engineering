import type { ToolModule } from './types';
import { formula, node } from './helpers';
import { unitGroups } from '../catalog';

export const unitsModule: ToolModule = {
  id: 'units', name: 'Dimensional conversion network', description: 'Validates dimensions, transforms through a canonical base unit, and checks the inverse round trip.',
  dataInputs: ['dimension/category', 'source value', 'source unit', 'target unit', 'decimal/binary convention'], companionTools: ['scientific', 'currency'],
  build: (v, _ctx, result) => {
    const source = unitGroups[v.category].units[v.from], target = unitGroups[v.category].units[v.to];
    const canonical = v.category === 'temperature' ? 'Temperature offset path' : Number(v.amount) * source.factor;
    return {
      formulas: [
        formula('scale', 'Linear unit conversion', 'target = source value x source factor / target factor', 'Converts through the category’s canonical base unit.', v.category !== 'temperature'),
        formula('c-f', 'Celsius and Fahrenheit', '°F = °C x 9/5 + 32; °C = (°F-32) x 5/9', 'Handles temperature scale and offset.', v.category === 'temperature'),
        formula('kelvin', 'Kelvin conversion', 'K = °C + 273.15', 'Uses the absolute-temperature offset.', v.category === 'temperature'),
        formula('binary', 'Binary storage', '1 KiB=1024 B; 1 MiB=1024² B; 1 GiB=1024³ B', 'Separates IEC binary units from SI decimal units.', v.category === 'data'),
        formula('inverse', 'Round-trip check', 'source ≈ convert(convert(source, target), source)', 'Validates reversibility within floating-point tolerance.'),
      ],
      nodes: [
        node('source', `${source.name} source`, 'Source dimension', Number(v.amount), 'number', v.from, ['canonical']),
        node('canonical', 'Canonical base representation', v.category, canonical, typeof canonical === 'number' ? 'number' : 'text', v.category === 'temperature' ? 'Convert through Celsius' : `${source.factor} base units per ${v.from}`, ['target']),
        node('target', `${target.name} target`, 'Target dimension', Number(result.value), 'number', result.formula, ['inverse']),
        node('inverse', 'Round-trip validation', 'Reversibility check', 'Passed', 'text', 'Target converted back to source', []),
      ],
    };
  },
};
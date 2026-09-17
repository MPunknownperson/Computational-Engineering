import type { ToolModule } from './types';
import { formula, metric, node } from './helpers';

export const bmiModule: ToolModule = {
  id: 'bmi', name: 'Adult BMI screening network', description: 'Normalizes measurements to SI, calculates BMI, maps adult reference bands, and derives a reference weight interval.',
  dataInputs: ['measurement system', 'height', 'weight'], companionTools: ['units'],
  build: (v, _ctx, result) => {
    const meters = v.units === 'imperial' ? Number(v.height) * .0254 : Number(v.height) / 100;
    const kilograms = v.units === 'imperial' ? Number(v.weight) * .45359237 : Number(v.weight);
    return {
      formulas: [
        formula('height', 'Height normalization', 'meters = centimeters / 100 or inches x 0.0254', 'Converts height to SI.'),
        formula('weight', 'Weight normalization', 'kilograms = pounds x 0.45359237', 'Converts imperial weight to SI.', v.units === 'imperial'),
        formula('bmi', 'Body mass index', 'BMI = weight_kg / height_m²', 'General adult screening index.'),
        formula('reference', 'Reference weight range', 'weight = target BMI x height_m²', 'Maps BMI 18.5–24.9 back to the selected weight unit.'),
      ],
      nodes: [
        node('height', 'Height in meters', 'SI normalization', meters, 'number', 'Height conversion', ['bmi']),
        node('weight', 'Weight in kilograms', 'SI normalization', kilograms, 'number', 'Weight conversion', ['bmi']),
        node('bmi', 'BMI', 'Screening ratio', Number(result.value), 'number', result.formula, ['reference']),
        node('reference', 'Reference weight range', 'Adult reference mapping', metric(result, 'Reference weight range').toString(), 'text', 'BMI 18.5 to 24.9', []),
      ],
    };
  },
};
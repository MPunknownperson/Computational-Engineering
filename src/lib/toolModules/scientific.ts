import type { ToolModule } from './types';
import { formula, metric, node } from './helpers';

export const scientificModule: ToolModule = {
  id: 'scientific', name: 'Sandboxed expression network', description: 'Parses a restricted scalar expression tree or applies a numerically stable quadratic solver.',
  dataInputs: ['mode', 'expression', 'variables x/y', 'angle convention', 'quadratic coefficients'], companionTools: ['probability', 'units'],
  build: (v, _ctx, result) => ({
    formulas: [
      formula('expression', 'Parsed expression', v.expression || 'expression', 'Evaluates an allowlisted scalar syntax tree.', v.method === 'expression'),
      formula('trig', 'Angle conversion', 'radians = degrees x π / 180', 'Converts trigonometric inputs when degree mode is selected.', v.method === 'expression' && v.angle === 'degrees'),
      formula('discriminant', 'Quadratic discriminant', 'D = b² - 4ac', 'Determines whether roots are real, repeated, or complex.', v.method === 'quadratic'),
      formula('quadratic', 'Stable quadratic roots', 'q = -0.5(b + sign(b)sqrt(D)); x1=q/a; x2=c/q', 'Avoids cancellation from the textbook formula.', v.method === 'quadratic'),
    ],
    nodes: v.method === 'quadratic' ? [
      node('coefficients', 'Coefficients', 'Input polynomial', `a=${v.a}, b=${v.b}, c=${v.c}`, 'text', 'ax²+bx+c=0', ['discriminant']),
      node('discriminant', 'Discriminant', 'Root classification', Number(metric(result, 'Discriminant')), 'number', 'b²-4ac', ['roots']),
      node('roots', 'Solution', 'Stable root solve', result.value, result.format, result.formula, []),
    ] : [
      node('parse', 'Expression tree', 'Allowlisted parser', v.expression, 'text', 'No assignments, property access, or arbitrary functions', ['substitute']),
      node('substitute', 'Variables', 'Scope binding', `x=${v.x}, y=${v.y}; ${v.angle}`, 'text', 'Substitute values and angle convention', ['result']),
      node('result', 'Scalar result', 'IEEE 754 evaluation', result.value, result.format, result.formula, []),
    ],
  }),
};
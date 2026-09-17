import { parse } from 'mathjs';

const functions = new Set(['sqrt', 'cbrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'abs', 'log', 'log10', 'exp', 'floor', 'ceil', 'round', 'min', 'max']);
const allowedNodes = new Set(['ConstantNode', 'OperatorNode', 'ParenthesisNode', 'SymbolNode', 'FunctionNode']);
const symbols = new Set(['pi', 'e', 'x', 'y']);

export function evaluateExpression(expression: string, x = 0, y = 0, degrees = false): number {
  if (!expression.trim()) throw new Error('Enter an expression to calculate.');
  if (expression.length > 400) throw new Error('Keep expressions under 400 characters.');
  const node = parse(expression);
  let count = 0;
  // Allow scalar arithmetic only; assignments, property access, arrays, and parser calls are not executable.
  node.traverse(child => {
    if (++count > 100 || !allowedNodes.has(child.type)) throw new Error('Use a shorter scalar expression without assignments or arrays.');
    if (child.type === 'SymbolNode') {
      const name = (child as unknown as { name: string }).name;
      if (!symbols.has(name) && !functions.has(name)) throw new Error(`Unknown variable or function: ${name}. Use x, y, pi, or e.`);
    }
    if (child.type === 'FunctionNode' && !functions.has((child as unknown as { name: string }).name)) throw new Error('This function is not supported.');
    if (child.type === 'OperatorNode' && !['+', '-', '*', '/', '^', '%'].includes((child as unknown as { op: string }).op)) throw new Error('Use +, -, *, /, ^, or % for arithmetic.');
  });
  const scale = degrees ? Math.PI / 180 : 1;
  const scope = { x, y, sin: (a: number) => Math.sin(a * scale), cos: (a: number) => Math.cos(a * scale), tan: (a: number) => Math.tan(a * scale), asin: (a: number) => Math.asin(a) / scale, acos: (a: number) => Math.acos(a) / scale, atan: (a: number) => Math.atan(a) / scale };
  const result = node.compile().evaluate(scope);
  if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('The expression must have a finite real result. Check divisors and function domains.');
  return result;
}
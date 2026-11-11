import "server-only";
import { randomInt } from "node:crypto";
import type { MathTemplate } from "./definition";
export function chooseParameters(template: MathTemplate) {
  return Object.fromEntries(
    Object.entries(template.parameters).map(([key, p]) => {
      if (p.kind === "choices")
        return [key, p.values[randomInt(p.values.length)]];
      const count = Math.floor((p.max - p.min) / p.step + 1e-8) + 1;
      return [key, Number((p.min + randomInt(count) * p.step).toPrecision(12))];
    }),
  );
}
export function calculateMath(
  template: MathTemplate,
  parameters: Record<string, number>,
) {
  const stack: number[] = [];
  for (const token of template.expression) {
    if (typeof token === "number") stack.push(token);
    else if (typeof token === "object") {
      const value = parameters[token.param];
      if (value === undefined) throw Error("Missing math parameter");
      stack.push(value);
    } else if (token === "ceil") {
      const value = stack.pop();
      if (value === undefined) throw Error("Invalid math expression");
      stack.push(Math.ceil(value - Math.abs(value) * Number.EPSILON * 2));
    } else {
      const b = stack.pop(),
        a = stack.pop();
      if (a === undefined || b === undefined)
        throw Error("Invalid math expression");
      stack.push(
        token === "add" ? a + b : token === "multiply" ? a * b : a / b,
      );
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0]))
    throw Error("Invalid math expression");
  return stack[0];
}
export function withinMathTolerance(
  value: number,
  expected: number,
  exactInteger = false,
) {
  if (!Number.isFinite(value) || !Number.isFinite(expected) || value < 0)
    return false;
  if (exactInteger) return Number.isInteger(value) && value === expected;
  return (
    Math.abs(value - expected) <=
    Math.abs(expected) * 0.15 + Number.EPSILON * Math.max(1, Math.abs(expected))
  );
}
export const mathNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
export function fillNumbers(text: string, parameters: Record<string, number>) {
  return text.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/gu, (_, key: string) => {
    const value = parameters[key];
    if (value === undefined) throw Error("Unknown template parameter");
    return mathNumber(value);
  });
}

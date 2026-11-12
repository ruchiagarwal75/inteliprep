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

/** Check the authored grid as well as the range: old saved variants may use step=1. */
export function sameMathParameters(
  a: MathTemplate["parameters"],
  b: MathTemplate["parameters"],
) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    const left = a[key],
      right = b[key];
    if (!right || left.kind !== right.kind) return false;
    if (left.kind === "range" && right.kind === "range")
      return (
        left.min === right.min &&
        left.max === right.max &&
        left.step === right.step
      );
    return (
      left.kind === "choices" &&
      right.kind === "choices" &&
      left.values.length === right.values.length &&
      left.values.every((value, index) => value === right.values[index])
    );
  });
}
export function parametersMatch(
  template: MathTemplate,
  values: Record<string, number>,
) {
  if (Object.keys(values).length !== Object.keys(template.parameters).length)
    return false;
  return Object.entries(template.parameters).every(([key, p]) => {
    const value = values[key];
    if (value === undefined || !Number.isFinite(value)) return false;
    if (p.kind === "choices") return p.values.includes(value);
    const steps = (value - p.min) / p.step;
    return (
      value >= p.min &&
      value <= p.max &&
      Math.abs(steps - Math.round(steps)) < 1e-8
    );
  });
}

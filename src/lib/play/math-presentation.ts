import "server-only";
import type { DrillDefinition, DrillVariant } from "./definition";
import type { DrillResult } from "./public";
import { calculateMath } from "./math";
import type { MathTemplate } from "./definition";
import { mathNumber } from "./math";
const shortNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 }).format(value);
/** Presentation only. Correctness still uses the exact server calculation and tolerance. */
export function friendlyMathAnswer(value: number, unit: string, exact = false) {
  if (exact) return `${mathNumber(value)} ${unit}`;
  let amount = Number(value.toPrecision(3)),
    label = unit;
  if (unit === "millions of tokens per day") {
    amount *= 1000000;
    label = "tokens per day";
  }
  if (unit === "GB" && amount >= 1000)
    return `about ${shortNumber(amount / 1000)} TB`;
  for (const [scale, name] of [
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ] as const) {
    if (amount >= scale)
      return `about ${shortNumber(amount / scale)} ${name} ${label}`;
  }
  return `about ${shortNumber(amount)} ${label}`;
}
type Part = { text: string; precedence: number };
export function workedMath(
  template: MathTemplate,
  values: Record<string, number>,
  expected: string,
) {
  const stack: Part[] = [];
  // Token totals are displayed as tokens rather than a large count of millions.
  const tokens =
    template.canonicalUnit === "millions of tokens per day" &&
    template.expression.at(-1) === "divide" &&
    template.expression.at(-2) === 1000000
      ? template.expression.slice(0, -2)
      : template.expression;
  for (const token of tokens) {
    if (typeof token === "number")
      stack.push({ text: mathNumber(token), precedence: 4 });
    else if (typeof token === "object") {
      const value = values[token.param];
      if (value === undefined) throw Error("Missing math input");
      stack.push({ text: mathNumber(value), precedence: 4 });
    } else if (token === "ceil") {
      const value = stack.pop();
      if (!value) throw Error("Invalid math expression");
      stack.push({ text: `round up (${value.text})`, precedence: 4 });
    } else {
      const right = stack.pop(),
        left = stack.pop();
      if (!left || !right) throw Error("Invalid math expression");
      const precedence = token === "add" ? 1 : 2;
      const a = left.precedence < precedence ? `(${left.text})` : left.text;
      const b =
        right.precedence < precedence ||
        (token === "divide" && right.precedence === precedence)
          ? `(${right.text})`
          : right.text;
      stack.push({
        text: `${a} ${token === "add" ? "+" : token === "multiply" ? "x" : "/"} ${b}`,
        precedence,
      });
    }
  }
  if (stack.length !== 1) throw Error("Invalid math expression");
  return `${stack[0].text} = ${expected}`;
}
export function mathExplanation(text: string, values: Record<string, number>) {
  return text.replace(/\b[a-zA-Z][a-zA-Z0-9]*\b/gu, (key) =>
    values[key] === undefined ? key : mathNumber(values[key]),
  );
}

/** Reformat legacy saved results on read without changing their grades or stored JSON. */
export function presentDrillResult(
  drill: DrillDefinition,
  variant: DrillVariant,
  result: DrillResult,
): DrillResult {
  if (drill.type !== "math") return result;
  const expected = friendlyMathAnswer(
    calculateMath(drill.math, variant.parameters),
    drill.math.canonicalUnit,
    drill.math.exactInteger,
  );
  return {
    ...result,
    expected,
    why: mathExplanation(drill.why, variant.parameters),
    formula: workedMath(drill.math, variant.parameters, expected),
  };
}

import { expect, it } from "vitest";
import { DrillActivityOrder } from "./drill-activity-order";
it("orders rapid pauses and resumes even if the clock moves backwards", () => {
  const order = new DrillActivityOrder();
  expect(order.next(0, 100)).toBe(100);
  expect(order.next(0, 100)).toBe(101);
  expect(order.next(0, 50)).toBe(102);
  expect(order.next(200, 50)).toBe(201);
  expect(new DrillActivityOrder().next(201, 50)).toBe(202);
});

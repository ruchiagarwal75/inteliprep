import { afterAll, beforeAll, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { migrationBody } from "../scripts/migration-sql.mjs";
import { startPlayPostgres } from "./fixtures/play-postgres";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());
it("rolls a dropped constraint back if its replacement fails", async () => {
  await fixture.operator.unsafe(
    "create table public.constraint_fixture(value integer constraint positive_value check(value > 0));insert into public.constraint_fixture(value) values(1)",
  );
  const change =
    "begin;\nalter table public.constraint_fixture drop constraint positive_value;\nalter table public.constraint_fixture add constraint positive_value check(value < 0);\ncommit;";
  await expect(
    fixture.operator.begin((sql) => sql.unsafe(migrationBody(change))),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    fixture.operator.unsafe(
      "insert into public.constraint_fixture(value) values(-1)",
    ),
  ).rejects.toMatchObject({ code: "23514" });
  expect(
    await fixture.operator.unsafe(
      "select value from public.constraint_fixture",
    ),
  ).toEqual([{ value: 1 }]);
});
it("accepts the matched outer wrapper inside the CLI transaction and rejects incomplete wrappers", () => {
  expect(migrationBody("begin;\nselect 1;\ncommit;\n")).toBe("select 1;");
  expect(migrationBody("select 1;")).toBe("select 1;");
  expect(() => migrationBody("begin;\nselect 1;")).toThrow("Unpaired");
  expect(() => migrationBody("select 1;\ncommit;")).toThrow("Unpaired");
});

it("requires new constraint replacements to be wrapped, while preserving applied migration bytes", () => {
  const legacy: Readonly<Record<string, string>> = {
    "20261112213851_play_course_long_lessons.sql":
      "8f10a2f09ca7de7bbf6bf42cafd0382ea9203605fda63c567b77e5fc9eae51f2",
    "20261111073325_feedback_input_preference.sql":
      "f7f1ee0fe6e75d72e2ad980ed9c783ee1291dbe907d84f71fafbc2dddc228981",
    "20261112233202_play_course_primer.sql":
      "be5b191b0778a60053918808ee56c757735a7371e7f66961cc178a68c9ae98e1",
  };
  for (const name of readdirSync("supabase/migrations").filter((name) =>
    name.endsWith(".sql"),
  )) {
    const source = readFileSync(`supabase/migrations/${name}`, "utf8");
    if (!/drop\s+constraint/iu.test(source)) continue;
    if (legacy[name]) {
      expect(createHash("sha256").update(source).digest("hex")).toBe(
        legacy[name],
      );
      continue;
    }
    const lines = source.trim().split(/\r?\n/u);
    expect(lines[0].trim()).toMatch(/^begin;$/iu);
    expect(lines.at(-1)?.trim()).toMatch(/^commit;$/iu);
  }
});

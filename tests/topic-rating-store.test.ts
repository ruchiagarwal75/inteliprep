import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import {
  saveTopicRating,
  topicRatingStatus,
} from "@/lib/play/topic-rating-store";

let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
const first = randomUUID(),
  later = randomUUID(),
  incomplete = randomUUID(),
  otherFirst = randomUUID();
beforeAll(async () => {
  fixture = await startPlayPostgres();
  await fixture.operator.unsafe(
    "create schema interview_admin; grant usage on schema interview_admin to mockmeai_reporting",
  );
  const migration = await readFile(
    "supabase/migrations/20261115012705_first_topic_ratings.sql",
    "utf8",
  );
  for (let n = 0; n < 2; n++) await fixture.operator.unsafe(migration);
  for (const [id, owner, level, done] of [
    [first, user, 0, "2026-11-01"],
    [later, user, 1, "2026-11-02"],
    [incomplete, user, 2, null],
    [otherFirst, other, 0, "2026-11-01"],
  ] as const)
    await fixture.operator`insert into practice_game.play_sessions(id,user_id,request_id,topic,level,mode,completed_at)
      values(${id},${owner},${randomUUID()},'rag-course',${level},'level',${done})`;
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
it("only offers the first completed quiz, including Topic 0", async () => {
  expect(await topicRatingStatus(user, first)).toEqual({ eligible: true });
  expect(await topicRatingStatus(user, later)).toEqual({ eligible: false });
  expect(await topicRatingStatus(user, incomplete)).toEqual({
    eligible: false,
  });
  for (const sessionId of [later, incomplete])
    await expect(
      saveTopicRating(user, { sessionId, action: "rate", stars: 5 }),
    ).rejects.toMatchObject({ status: 409 });
});
it("does not expose or write someone else's quiz", async () => {
  await expect(topicRatingStatus(user, otherFirst)).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    saveTopicRating(user, { sessionId: otherFirst, action: "skip" }),
  ).rejects.toMatchObject({ status: 404 });
});
it("keeps one immutable rating through retries and racing tabs", async () => {
  await saveTopicRating(user, { sessionId: first, action: "rate", stars: 4 });
  await Promise.all([
    saveTopicRating(user, { sessionId: first, action: "rate", stars: 1 }),
    saveTopicRating(user, { sessionId: first, action: "skip" }),
  ]);
  const rows =
    await fixture.operator`select stars,skipped,level from interview_admin.topic_ratings where user_id=${user}`;
  expect(rows).toEqual([{ stars: 4, skipped: false, level: 0 }]);
  expect(await topicRatingStatus(user, first)).toEqual({ eligible: false });
});
it("records a skip without rating or changing quiz rewards", async () => {
  const before =
    await fixture.operator`select * from practice_game.points_ledger`;
  await saveTopicRating(other, { sessionId: otherFirst, action: "skip" });
  await saveTopicRating(other, {
    sessionId: otherFirst,
    action: "rate",
    stars: 5,
  });
  expect(
    await fixture.operator`select stars,skipped from interview_admin.topic_ratings where user_id=${other}`,
  ).toEqual([{ stars: null, skipped: true }]);
  expect(await topicRatingStatus(other, otherFirst)).toEqual({
    eligible: false,
  });
  expect(
    await fixture.operator`select * from practice_game.points_ledger`,
  ).toEqual(before);
});
it("keeps RLS enabled and browser roles out, and grants no runtime update/delete", async () => {
  const [flags] = await fixture.operator`select
    (select relrowsecurity from pg_class where oid='interview_admin.topic_ratings'::regclass) as rls,
    has_table_privilege('anon','interview_admin.topic_ratings','SELECT') as anon_read,
    has_table_privilege('authenticated','interview_admin.topic_ratings','INSERT') as browser_write,
    has_table_privilege('mockmeai_reporting','interview_admin.topic_ratings','UPDATE') as runtime_update,
    has_table_privilege('mockmeai_reporting','interview_admin.topic_ratings','DELETE') as runtime_delete`;
  expect(flags).toEqual({
    rls: true,
    anon_read: false,
    browser_write: false,
    runtime_update: false,
    runtime_delete: false,
  });
  await expect(fixture.operator`insert into interview_admin.topic_ratings(id,user_id,session_id,topic,level,environment,stars,skipped)
    values(${randomUUID()},${user},${first},'rag-course',0,'invalid',6,false)`).rejects.toMatchObject(
    { code: "23514" },
  );
});

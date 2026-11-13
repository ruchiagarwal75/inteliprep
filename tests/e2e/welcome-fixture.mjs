const names = [
  "welcomeLightDesktop",
  "welcomeDarkDesktop",
  "welcomeLightPhone",
  "welcomeDarkPhone",
  "welcomeSkip1",
  "welcomeSkip2",
  "welcomeSkip3",
  "welcomeSkip4",
  "welcomeStart",
  "welcomeKeys",
  "welcomeExisting",
  "welcomeRetry",
];
export const welcomeAccounts = Object.fromEntries(
  names.map((name, index) => [
    name,
    {
      id: `a11c0000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      email: `${name.toLowerCase()}@example.invalid`,
    },
  ]),
);
export async function seedWelcomeFixtures(sql) {
  await sql`insert into practice_game.level_progress(user_id,topic,level,status,passed_at) values(${welcomeAccounts.welcomeExisting.id},'rag-course',0,'passed',now())`;
}
export async function welcomeFixtureSnapshot(sql, name) {
  const account = welcomeAccounts[name];
  if (!account) throw Error("Unknown welcome fixture");
  const state =
    await sql`select welcome_seen_at from practice_game.welcome_state where user_id=${account.id}`;
  const runs =
    await sql`select id,kind,outcome,panel,topic_started_at from practice_game.welcome_runs where user_id=${account.id} order by created_at`;
  const events =
    await sql`select event,panel,count(*)::int as count from practice_game.play_events where user_id=${account.id} group by event,panel`;
  return { state, runs, events };
}

// Synthetic accounts only. Never use an owner or hosted Auth identity for QA.
export const bossAccounts = {
  bossLocked: {
    id: "b0550000-0000-4000-8000-000000000001",
    email: "boss-locked@example.invalid",
  },
  bossReady: {
    id: "b0550000-0000-4000-8000-000000000002",
    email: "boss-ready@example.invalid",
  },
  bossProgress: {
    id: "b0550000-0000-4000-8000-000000000003",
    email: "boss-progress@example.invalid",
  },
  bossUsed: {
    id: "b0550000-0000-4000-8000-000000000004",
    email: "boss-used@example.invalid",
  },
  bossProRetry: {
    id: "b0550000-0000-4000-8000-000000000005",
    email: "boss-pro-retry@example.invalid",
  },
  bossDefeated: {
    id: "b0550000-0000-4000-8000-000000000006",
    email: "boss-defeated@example.invalid",
  },
  bossFlow: {
    id: "b0550000-0000-4000-8000-000000000007",
    email: "boss-flow@example.invalid",
  },
  bossNotify: {
    id: "b0550000-0000-4000-8000-000000000008",
    email: "boss-notify@example.invalid",
  },
  bossWonLightDesktop: {
    id: "b0550000-0000-4000-8000-000000000009",
    email: "boss-won-light-desktop@example.invalid",
  },
  bossWonDarkDesktop: {
    id: "b0550000-0000-4000-8000-000000000010",
    email: "boss-won-dark-desktop@example.invalid",
  },
  bossWonLightPhone: {
    id: "b0550000-0000-4000-8000-000000000011",
    email: "boss-won-light-phone@example.invalid",
  },
  bossWonDarkPhone: {
    id: "b0550000-0000-4000-8000-000000000012",
    email: "boss-won-dark-phone@example.invalid",
  },
};
/** @param {keyof typeof bossAccounts} name */
export function bossSessionId(name) {
  return bossAccounts[name].id.replace("b0550000", "b0551111");
}
export async function bossFixtureSnapshot(sql, name) {
  if (!Object.hasOwn(bossAccounts, name)) throw Error("Unknown boss fixture");
  const [row] =
    await sql`select session_id as "sessionId",started_at as "startedAt",deadline_at as "deadlineAt",ended_at as "endedAt",score,signal from practice_game.boss_attempts where user_id=${bossAccounts[name].id} order by started_at desc limit 1`;
  return row ?? null;
}
export async function seedBossFixtures(sql) {
  for (const [name, account] of Object.entries(bossAccounts)) {
    await sql`insert into practice_game.player_profiles(user_id,chosen_level,zone_set) values(${account.id},'mid',true) on conflict do nothing`;
    if (name !== "bossLocked") {
      for (let level = 0; level <= 9; level++)
        await sql`insert into practice_game.level_progress(user_id,topic,level,status,best_score,best_stars,passed_at) values(${account.id},'rag-course',${level},'passed',1,3,now()-interval '1 day')`;
      await sql`insert into practice_game.topic_readiness(user_id,topic,state,last_activity_at,ready_at) values(${account.id},'rag-course','practice_ready',now(),now())`;
    }
    const won = name === "bossDefeated" || name.startsWith("bossWon");
    const running = name === "bossProgress";
    if (!won && !running && name !== "bossUsed" && name !== "bossProRetry")
      continue;
    const sessionId = account.id.replace("b0550000", "b0551111");
    const pro = name === "bossProRetry";
    const started = new Date(Date.now() - (running ? 5 : 55) * 60_000);
    const deadline = new Date(started.getTime() + 45 * 60_000);
    const ended = running ? null : deadline;
    await sql`insert into practice_game.mock_access(user_id,plan,free_boss_used_at,free_boss_session_id,world_cleared_seen_at) values(${account.id},${pro ? "pro" : "free"},${pro ? null : started},${pro ? null : sessionId},${name === "bossDefeated" ? ended : null})`;
    await sql`insert into practice_game.boss_attempts(session_id,user_id,request_id,access_plan,started_at,deadline_at,ended_at,graded_at,score,signal,passed) values(${sessionId},${account.id},${account.id.replace("b0550000", "b0552222")},${pro ? "pro" : "free"},${started},${deadline},${ended},${ended},${running ? null : won ? 0.75 : 0.5},${running ? null : won ? "yes" : "no"},${won})`;
    await sql`insert into interview_admin.interviews(id,user_id,environment,is_test,coverage,problem_id,level,status,started_at,deadline_at,last_activity_at,ended_at,feedback_status) values(${sessionId},${account.id},'test',true,'full','enterprise-rag-assistant','mid',${running ? "unfinished" : "completed"},${started},${deadline},${ended ?? started},${ended},'none')`;
    if (won) {
      await sql`update practice_game.topic_readiness set state='interview_ready',verified_level='mid' where user_id=${account.id} and topic='rag-course'`;
      await sql`insert into practice_game.badges(user_id,badge_id) values(${account.id},'rag-interview')`;
    }
  }
}

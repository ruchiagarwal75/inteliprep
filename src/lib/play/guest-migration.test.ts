import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  startPlayPostgres,
  PLAY_TEST_USER,
} from "../../../tests/fixtures/play-postgres";
it("allows a linked Google provider, rejects guests and revocation, and retains UUID-owned progress", async () => {
  const db = await startPlayPostgres();
  try {
    await db.operator.unsafe(
      `create schema if not exists interview_admin; create table interview_admin.beta_invites(email text primary key, approved boolean not null); grant usage on schema interview_admin to authenticated; grant select on interview_admin.beta_invites to authenticated; create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;`,
    );
    await db.operator.unsafe(
      await readFile(
        "supabase/migrations/20261117015144_guest_google_invite_check.sql",
        "utf8",
      ),
    );
    async function invited(claims: object) {
      return db.operator.begin(async (tx) => {
        await tx.unsafe("set local role authenticated");
        await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: PLAY_TEST_USER, email: "qa@example.invalid", ...claims })},true)`;
        const [row] = await tx`select public.is_beta_invited() as allowed`;
        return row.allowed;
      });
    }
    const linked = {
      is_anonymous: false,
      app_metadata: { provider: "anonymous", providers: ["google"] },
    };
    expect(await invited({ ...linked, is_anonymous: true })).toBe(false);
    expect(
      await invited({
        app_metadata: { provider: "anonymous" },
        user_metadata: { provider: "google", providers: ["google"] },
      }),
    ).toBe(false);
    expect(await invited(linked)).toBe(true);
    await db.operator`insert into interview_admin.beta_invites values('qa@example.invalid',false)`;
    expect(await invited(linked)).toBe(false);
    await db.operator`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${crypto.randomUUID()},${PLAY_TEST_USER},10,'drill','guest-answer')`;
    await db.operator`insert into practice_game.level_progress(user_id,topic,level,status,best_score,best_stars,passed_at) values(${PLAY_TEST_USER},'rag-course',0,'passed',1,3,now())`;
    // Upgrade never changes the owner UUID. Both sessions read the same RLS rows.
    for (const anonymous of [true, false]) {
      const result = await db.operator.begin(async (tx) => {
        await tx.unsafe("set local role authenticated");
        await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: PLAY_TEST_USER, is_anonymous: anonymous })},true)`;
        const points =
          await tx`select delta from practice_game.points_ledger where user_id=${PLAY_TEST_USER}`;
        const stars =
          await tx`select best_stars from practice_game.level_progress where user_id=${PLAY_TEST_USER}`;
        return { points, stars };
      });
      expect(result.points.map((r) => r.delta)).toEqual([10]);
      expect(result.stars.map((r) => r.best_stars)).toEqual([3]);
    }
  } finally {
    await db.close();
  }
});

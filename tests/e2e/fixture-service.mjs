import { createServer } from "node:https";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

export const fixtureOrigin = "https://127.0.0.1:4444";
const jwtSecret = "mockmeai-ci-only-auth-fixture-not-a-production-key";
const accounts = {
  invited: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "browser-smoke@example.invalid",
  },
  uninvited: {
    id: "22222222-2222-4222-8222-222222222222",
    email: "not-invited@example.invalid",
  },
};
function session(account) {
  const user = {
    ...account,
    aud: "authenticated",
    role: "authenticated",
    created_at: new Date().toISOString(),
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "Browser Smoke" },
    is_anonymous: false,
  };
  const now = Math.floor(Date.now() / 1000);
  const data = [
    { alg: "HS256", typ: "JWT" },
    {
      sub: user.id,
      email: user.email,
      aud: "authenticated",
      role: "authenticated",
      iss: fixtureOrigin + "/auth/v1",
      iat: now,
      exp: now + 3600,
      is_anonymous: false,
    },
  ]
    .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
    .join(".");
  return {
    access_token:
      data +
      "." +
      createHmac("sha256", jwtSecret).update(data).digest("base64url"),
    refresh_token: "ci-only-refresh-token",
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user,
  };
}
function authenticatedUser(header) {
  try {
    const token = header?.replace(/^Bearer /u, "");
    const [head, claims, signature] = token.split(".");
    const expected = createHmac("sha256", jwtSecret)
      .update(head + "." + claims)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return;
    const data = JSON.parse(Buffer.from(claims, "base64url").toString());
    if (data.exp <= Date.now() / 1000) return;
    const account = Object.values(accounts).find(
      (value) => value.id === data.sub,
    );
    if (account) return session(account).user;
  } catch {
    /* Invalid fixture tokens are rejected just like an external Auth service. */
  }
}
function inputData(body) {
  if (typeof body.input === "string") return JSON.parse(body.input);
  const content = body.input?.[0]?.content;
  return JSON.parse(
    typeof content === "string"
      ? content
      : (content?.find((value) => value.type === "input_text")?.text ?? "{}"),
  );
}
export function startFixtureService(key, cert) {
  let modelCalls = 0;
  const approved = new Set([accounts.invited.id]);
  const service = createServer(
    { key: readFileSync(key), cert: readFileSync(cert) },
    async (req, res) => {
      const url = new URL(req.url, fixtureOrigin);
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:3100");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
      );
      if (req.method === "OPTIONS") {
        res.writeHead(204).end();
        return;
      }
      const json = (status, body) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (url.pathname === "/fixture/session")
        return json(
          200,
          session(
            accounts[url.searchParams.get("account")] ?? accounts.invited,
          ),
        );
      if (url.pathname === "/fixture/stats") return json(200, { modelCalls });
      if (url.pathname === "/fixture/invitation" && req.method === "POST") {
        let raw = "";
        for await (const chunk of req) raw += chunk;
        const body = JSON.parse(raw);
        const account = accounts[body.account];
        if (!account || typeof body.approved !== "boolean")
          return json(400, {});
        if (body.approved) approved.add(account.id);
        else approved.delete(account.id);
        return json(200, { updated: true });
      }
      if (url.pathname === "/auth/v1/user") {
        const user = authenticatedUser(req.headers.authorization);
        return json(
          user ? 200 : 401,
          user ?? { msg: "Invalid fixture session" },
        );
      }
      if (url.pathname === "/auth/v1/logout") {
        res.writeHead(204).end();
        return;
      }
      if (url.pathname === "/rest/v1/rpc/is_beta_invited") {
        const user = authenticatedUser(req.headers.authorization);
        if (!user) return json(401, { message: "Invalid fixture session" });
        return json(200, approved.has(user.id));
      }
      if (url.pathname !== "/v1/responses")
        return json(404, { error: "Unknown fixture request" });
      if (req.headers.authorization !== "Bearer ci-fake-model-key")
        return json(401, { error: "Unexpected fixture credential" });
      modelCalls++;
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      let text =
        "Measuring the baseline will help you test that assumption. What workload and response-time goals would you clarify first?";
      if (body.text?.format?.name === "stage_coverage") {
        text = JSON.stringify({
          criteria: inputData(body).criteria.map((value) => ({
            criterionIndex: value.index,
            met: false,
            messageIndex: -1,
            quote: "",
          })),
        });
      } else if (body.text?.format?.name === "interview_scorecard") {
        const data = inputData(body);
        text = JSON.stringify({
          summary:
            "This short practice run does not provide enough evidence for an overall score.",
          signal: "insufficient_evidence",
          areas: data.private_rubric.map((value) => ({
            areaIndex: value.areaIndex,
            score: null,
            rationale:
              "This short run does not establish enough evidence to assess this area.",
            evidence: [],
          })),
          strengths: [],
          gaps: [],
          nextProblemId: "url-shortener",
          practiceFocus:
            "Practice a full explanation and validate the design with concrete measurements.",
        });
      }
      const response = {
        id: "resp_ci_fixture",
        object: "response",
        created_at: Math.floor(Date.now() / 1000),
        status: "completed",
        model: body.model,
        output: [
          {
            id: "msg_ci_fixture",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text, annotations: [] }],
          },
        ],
        usage: {
          input_tokens: 50,
          output_tokens: 30,
          total_tokens: 80,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens_details: { reasoning_tokens: 0 },
        },
      };
      if (body.stream) {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        for (const event of [
          { type: "response.output_text.delta", delta: text },
          { type: "response.completed", response },
        ])
          res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        res.end();
      } else json(200, response);
    },
  );
  return new Promise((resolve) =>
    service.listen(4444, "127.0.0.1", () => resolve(service)),
  );
}

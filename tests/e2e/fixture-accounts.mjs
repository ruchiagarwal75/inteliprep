// Each independent story has its own account and real request-limit budget.
export const fixtureAccounts = {
  admin: {
    id: "99999999-9999-4999-8999-999999999999",
    email: "owner@example.invalid",
  },
  invited: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "browser-smoke@example.invalid",
  },
  uninvited: {
    id: "22222222-2222-4222-8222-222222222222",
    email: "not-invited@example.invalid",
  },
  recovery: {
    id: "33333333-3333-4333-8333-333333333333",
    email: "recovery@example.invalid",
  },
  expiry: {
    id: "44444444-4444-4444-8444-444444444444",
    email: "expiry@example.invalid",
  },
  archive: {
    id: "55555555-5555-4555-8555-555555555555",
    email: "archive@example.invalid",
  },
  layout: {
    id: "66666666-6666-4666-8666-666666666666",
    email: "layout@example.invalid",
  },
  preferences: {
    id: "77777777-7777-4777-8777-777777777777",
    email: "preferences@example.invalid",
  },
  explanation: {
    id: "88888888-8888-4888-8888-888888888888",
    email: "explanation@example.invalid",
  },
  fonts: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "fonts@example.invalid",
  },
  signout: {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    email: "signout@example.invalid",
  },
};

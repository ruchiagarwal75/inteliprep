import { bossAccounts } from "./boss-fixture.mjs";
import { welcomeAccounts } from "./welcome-fixture.mjs";
// Each independent story has its own account and real request-limit budget.
export const fixtureAccounts = {
  ...bossAccounts,
  ...welcomeAccounts,
  fixes5FeedbackDarkDesktop: {
    id: "60606060-6060-4060-8060-606060606060",
    email: "fixes5-feedback-dark-desktop@example.invalid",
  },
  fixes5FeedbackLightPhone: {
    id: "59595959-5959-4959-8959-595959595959",
    email: "fixes5-feedback-light-phone@example.invalid",
  },
  fixes5FeedbackDarkPhone: {
    id: "58585858-5858-4858-8858-585858585858",
    email: "fixes5-feedback-dark-phone@example.invalid",
  },
  fixes5Feedback: {
    id: "61616161-6161-4161-8161-616161616161",
    email: "fixes5-feedback@example.invalid",
  },
  content4Quiz: {
    id: "62626262-6262-4262-8262-626262626262",
    email: "content4-quiz@example.invalid",
  },
  content4Slides: {
    id: "63636363-6363-4363-8363-636363636363",
    email: "content4-slides@example.invalid",
  },
  content3Quiz: {
    id: "64646464-6464-4464-8464-646464646464",
    email: "content3-quiz@example.invalid",
  },
  content3Slides: {
    id: "65656565-6565-4565-8565-656565656565",
    email: "content3-slides@example.invalid",
  },
  content2Quiz: {
    id: "77767676-7676-4676-8676-767676767676",
    email: "content2-quiz@example.invalid",
  },
  content2Slides: {
    id: "76767676-7676-4676-8676-767676767676",
    email: "content2-slides@example.invalid",
  },
  fixes4Replay: {
    id: "75757575-7575-4575-8575-757575757575",
    email: "fixes4-replay@example.invalid",
  },
  fixes4Learn: {
    id: "71717171-7171-4171-8171-717171717171",
    email: "fixes4-learn@example.invalid",
  },
  fixes4Quiz: {
    id: "72727272-7272-4272-8272-727272727272",
    email: "fixes4-quiz@example.invalid",
  },
  fixes4Path: {
    id: "73737373-7373-4373-8373-737373737373",
    email: "fixes4-path@example.invalid",
  },
  fixes4Unlock: {
    id: "74747474-7474-4474-8474-747474747474",
    email: "fixes4-unlock@example.invalid",
  },
  primerFresh: {
    id: "81818181-8181-4181-8181-818181818181",
    email: "primer-fresh@example.invalid",
  },
  primerSlides: {
    id: "82828282-8282-4282-8282-828282828282",
    email: "primer-slides@example.invalid",
  },
  primerLegacy: {
    id: "83838383-8383-4383-8383-838383838383",
    email: "primer-legacy@example.invalid",
  },
  courseTimer: {
    id: "86868686-8686-4868-8686-868686868686",
    email: "course-timer@example.invalid",
  },
  courseOverlay: {
    id: "87878787-8787-4787-8787-878787878787",
    email: "course-overlay@example.invalid",
  },
  courseLayout: {
    id: "89898989-8989-4989-8989-898989898989",
    email: "course-layout@example.invalid",
  },
  courseReview: {
    id: "90909090-9090-4090-8090-909090909090",
    email: "course-review@example.invalid",
  },
  courseDiagrams: {
    id: "98989898-9898-4898-8898-989898989898",
    email: "course-diagrams@example.invalid",
  },
  courseFresh: {
    id: "97979797-9797-4797-8797-979797979797",
    email: "course-fresh@example.invalid",
  },
  courseRestored: {
    id: "96969696-9696-4696-8696-969696969696",
    email: "course-restored@example.invalid",
  },
  courseContinue: {
    id: "95959595-9595-4595-8595-959595959595",
    email: "course-continue@example.invalid",
  },
  courseNavigation: {
    id: "94949494-9494-4494-8494-949494949494",
    email: "course-navigation@example.invalid",
  },
  playPixelFixes: {
    id: "93939393-9393-4393-8393-939393939393",
    email: "pixel-fixes@example.invalid",
  },
  playThinking: {
    id: "92929292-9292-4292-8292-929292929292",
    email: "thinking@example.invalid",
  },
  playGame: {
    id: "91919191-9191-4191-8191-919191919191",
    email: "game@example.invalid",
  },
  playRound: {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    email: "play-round@example.invalid",
  },
  play: {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    email: "play@example.invalid",
  },
  theme: {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    email: "theme@example.invalid",
  },
  genai: {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    email: "genai@example.invalid",
  },
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

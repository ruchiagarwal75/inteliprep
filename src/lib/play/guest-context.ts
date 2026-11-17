import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { PlayError } from "./errors";
import { guestTopicAllowed } from "./guest-policy";
import { GUEST_SIGN_IN_MESSAGE } from "./guest-policy";

const guest = new AsyncLocalStorage<boolean>();
export const withPlayGuest = <T>(anonymous: boolean, work: () => T) =>
  guest.run(anonymous, work);
export const currentPlayGuest = () => guest.getStore() === true;
export class GuestAccessError extends PlayError {
  constructor() {
    super(GUEST_SIGN_IN_MESSAGE, 403);
  }
}
export function requireGuestTopic(topic: string, level: number) {
  if (currentPlayGuest() && !guestTopicAllowed(topic, level))
    throw new GuestAccessError();
}

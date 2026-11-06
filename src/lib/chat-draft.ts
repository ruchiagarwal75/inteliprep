export const MAX_CHAT_LENGTH = 8_000;
export function boundedChatDraft(value: string) {
  return value.slice(0, MAX_CHAT_LENGTH);
}

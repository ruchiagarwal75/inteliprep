export function candidateDisplayName(profile?: {
  name?: string;
  email?: string;
  nameIsCustom?: boolean;
}) {
  const name = profile?.name || profile?.email?.split("@")[0] || "Your account";
  // Explicit display names and intentional mixed case retain the user's spelling.
  if (profile?.nameIsCustom || name !== name.toLocaleLowerCase()) return name;
  return name.replace(
    /(^|[\s'-])(\p{L})/gu,
    (_, space: string, letter: string) => space + letter.toLocaleUpperCase(),
  );
}

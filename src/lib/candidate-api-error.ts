/** Only the app's verified account boundary may issue these response markers. */
export const CANDIDATE_AUTH_ERROR_HEADER = "X-Interview-Auth-Error";
export const CANDIDATE_AUTH_REQUIRED = "sign_in_required";
export const CANDIDATE_ACCOUNT_CHANGED = "account_changed";

export function isCandidateAuthFailure(response: Response): boolean {
  const code = response.headers.get(CANDIDATE_AUTH_ERROR_HEADER);
  return (
    (response.status === 401 && code === CANDIDATE_AUTH_REQUIRED) ||
    (response.status === 403 && code === CANDIDATE_ACCOUNT_CHANGED)
  );
}

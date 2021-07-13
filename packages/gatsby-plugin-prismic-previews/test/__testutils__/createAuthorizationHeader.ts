export const createAuthorizationHeader = (
  accessToken?: string,
): string | undefined =>
  accessToken != null ? `Token ${accessToken}` : undefined

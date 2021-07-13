import * as msw from 'msw'

// TODO: Uncomment when the Authorization header can be used
// @see Related issue - {@link https://github.com/prismicio/issue-tracker-wroom/issues/351}
// import { createAuthorizationHeader } from "./createAuthorizationHeader";

export const isValidAccessToken = (
  accessToken: string | undefined,
  req: msw.RestRequest,
): boolean => {
  // TODO: Uncomment when the Authorization header can be used
  // @see Related issue - {@link https://github.com/prismicio/issue-tracker-wroom/issues/351}
  // return typeof accessToken === "string"
  // 	? req.headers.get("Authorization") ===
  // 			createAuthorizationHeader(accessToken)
  // 	: true;
  return typeof accessToken === 'string'
    ? req.url.searchParams.get('access_token') === accessToken
    : true
}

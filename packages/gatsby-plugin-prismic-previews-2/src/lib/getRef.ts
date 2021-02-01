import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import Prismic from 'prismic-javascript'

import { Client } from './createClient'
import { getCookie } from './getCookie'

// Returns the master ref. Requires a network request to fetch the repository's
// current state.
const getMasterRef = (client: Client): TE.TaskEither<Error, string> =>
  pipe(
    TE.tryCatch(
      () => client.getApi(),
      (error) => error as Error,
    ),
    TE.map((x) => x.masterRef.ref),
  )

/**
 * Returns the Prismic ref for the environment. The ref is determined using the
 * following priority:
 *
 * 1. The environment's Prismic Preview cookie
 * 2. The master ref (i.e. latest ref)
 *
 * @param client A Prismic client for the environment created using `createClient`.
 *
 * @returns The Prismic ref for the environment.
 */
export const getRef = (client: Client): TE.TaskEither<Error, string> =>
  pipe(
    TE.fromIOEither(getCookie(Prismic.previewCookie)),
    TE.orElse(() => getMasterRef(client)),
  )
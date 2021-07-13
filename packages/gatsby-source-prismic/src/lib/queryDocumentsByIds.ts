import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import { Dependencies } from '../types'

/**
 * Queries a list of documents by their IDs from a Prismic repository using the
 * environment's configuration. The following fields from the environment's
 * `pluginOptions` are used, in addition to those used in `createClient`:
 *
 * - `pluginOptions.releaseID`: Prismic Release ID from which to fetch
 *   documents. If not provided, the master ref is used.
 *
 * - `pluginOptions.fetchLinks`: List of document link fields to fetch.
 *
 * - `pluginOptions.lang`: Language of documents to fetch. If not provided, all
 *   languages are fetched.
 *
 * @returns List of Prismic documents.
 */
export const queryDocumentsByIds = (
  ids: string[],
): RTE.ReaderTaskEither<Dependencies, Error, prismicT.PrismicDocument[]> =>
  pipe(
    RTE.ask<Dependencies>(),
    RTE.chain((env) => RTE.fromTask(() => env.prismicClient.getAllByIDs(ids))),
  )

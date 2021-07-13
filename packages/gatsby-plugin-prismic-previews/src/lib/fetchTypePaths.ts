import * as gatsby from 'gatsby'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import {
  BuildTypePathsStoreFilenameEnv,
  buildTypePathsStoreFilename,
} from './buildTypePathsStoreFilename'
import { fetchJSON } from './fetchJSON'
import { TypePathsStore } from '../types'

export type FetchTypePathsStoreEnv = BuildTypePathsStoreFilenameEnv

const buildTypePathsStoreURL: RTE.ReaderTaskEither<
  BuildTypePathsStoreFilenameEnv,
  never,
  string
> = pipe(
  RTE.ask<BuildTypePathsStoreFilenameEnv>(),
  RTE.chain(() => buildTypePathsStoreFilename),
  RTE.map((filename) => gatsby.withAssetPrefix(`/static/${filename}`)),
)

export const fetchTypePaths: RTE.ReaderTaskEither<
  FetchTypePathsStoreEnv,
  Error,
  TypePathsStore
> = pipe(
  RTE.ask<BuildTypePathsStoreFilenameEnv>(),
  RTE.bind('url', () => buildTypePathsStoreURL),
  RTE.chain((scope) =>
    RTE.fromTaskEither(
      fetchJSON<TypePathsStore>(scope.url, {
        // We opt out of the cache to ensure we always fetch the latest type
        // paths. Since the URL to the type paths JSON file is always the
        // same (a hashed version of the repository name), some servers may
        // not properly cache bust the resource.
        //
        // Type paths are only fetched at bootstrap so the additional
        // network time this imposes should be minimal.
        cache: 'no-cache',
      }),
    ),
  ),
)

import * as React from 'react'
import * as prismic from 'ts-prismic'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as T from 'fp-ts/Task'
import * as A from 'fp-ts/Array'
import * as R from 'fp-ts/Record'
import * as IO from 'fp-ts/IO'
import { constVoid, pipe } from 'fp-ts/function'
import ky from 'ky'

import { buildQueryParams } from './lib/buildQueryParams'
import { extractPreviewRefRepositoryName } from './lib/extractPreviewRefRepositoryName'
import { getCookie } from './lib/getCookie'
import { getURLSearchParam } from './lib/getURLSearchParam'
import { isPreviewResolverSession } from './lib/isPreviewResolverSession'

import { LinkResolver, PrismicRepositoryConfigs } from './types'
import { usePrismicPreviewContext } from './usePrismicPreviewContext'
import { PrismicContextActionType, PrismicContextState } from './context'

export type UsePrismicPreviewResolverFn = () => Promise<void>

export interface UsePrismicPreviewResolverState {
  state: 'INIT' | 'RESOLVING' | 'RESOLVED' | 'FAILED'
  path?: string
  error?: Error
}

enum UsePrismicPreviewResolverActionType {
  BeginResolving = 'BeginResolving',
  Resolved = 'Resolved',
  Fail = 'Fail',
}

type UsePrismicPreviewResolverAction =
  | {
      type: UsePrismicPreviewResolverActionType.BeginResolving
    }
  | {
      type: UsePrismicPreviewResolverActionType.Resolved
      payload: string
    }
  | {
      type: UsePrismicPreviewResolverActionType.Fail
      payload: Error
    }

const initialLocalState: UsePrismicPreviewResolverState = {
  state: 'INIT',
  path: undefined,
}

const localReducer = (
  state: UsePrismicPreviewResolverState,
  action: UsePrismicPreviewResolverAction,
): UsePrismicPreviewResolverState => {
  switch (action.type) {
    case UsePrismicPreviewResolverActionType.BeginResolving: {
      return {
        ...initialLocalState,
        state: 'RESOLVING',
      }
    }

    case UsePrismicPreviewResolverActionType.Resolved: {
      return {
        ...state,
        state: 'RESOLVED',
        path: action.payload,
      }
    }

    case UsePrismicPreviewResolverActionType.Fail: {
      return {
        ...initialLocalState,
        state: 'FAILED',
        error: action.payload,
      }
    }
  }
}

interface UsePrismicPreviewResolverProgramEnv {
  setActiveRepositoryName(repositoryName: string): IO.IO<void>
  beginResolving: IO.IO<void>
  resolved(path: string): IO.IO<void>
  pluginOptionsStore: PrismicContextState['pluginOptionsStore']
  repositoryConfigs: PrismicRepositoryConfigs
}

const previewResolverProgram: RTE.ReaderTaskEither<
  UsePrismicPreviewResolverProgramEnv,
  Error,
  void
> = pipe(
  RTE.ask<UsePrismicPreviewResolverProgramEnv>(),

  // Only continue if this is a preview session.
  RTE.chainFirst(() => RTE.fromIOEither(isPreviewResolverSession)),

  RTE.bindW('documentId', () =>
    pipe(
      getURLSearchParam('documentId'),
      RTE.fromOption(() => new Error('documentId URL parameter not present')),
    ),
  ),

  RTE.bindW('previewRef', () =>
    pipe(
      RTE.fromIOEither(getCookie(prismic.cookie.preview)),
      RTE.mapLeft(() => new Error('preview cookie not present')),
    ),
  ),

  RTE.bindW('repositoryName', (env) =>
    pipe(
      env.previewRef,
      extractPreviewRefRepositoryName,
      RTE.fromOption(() => new Error('Invalid preview ref')),
    ),
  ),

  RTE.chainFirst((env) =>
    RTE.fromIO(env.setActiveRepositoryName(env.repositoryName)),
  ),

  RTE.bindW('repositoryConfig', (env) =>
    pipe(
      env.repositoryConfigs,
      A.findFirst((config) => config.repositoryName === env.repositoryName),
      RTE.fromOption(
        () =>
          new Error(
            `A configuration object could not be found for repository "${env.repositoryName}". Check that the repository is configured in your app's usePrismicPreviewResolver.`,
          ),
      ),
    ),
  ),

  RTE.bindW('repositoryPluginOptions', (env) =>
    pipe(
      env.pluginOptionsStore,
      R.lookup(env.repositoryName),
      RTE.fromOption(
        () =>
          new Error(
            `Plugin options could not be found for repository "${env.repositoryName}". Check that the repository is configured in your app's gatsby-config.js`,
          ),
      ),
    ),
  ),

  // Start resolving.
  RTE.chainFirst((env) => RTE.fromIO(env.beginResolving)),

  RTE.bind('params', (env) => () =>
    buildQueryParams({
      lang: env.repositoryPluginOptions.lang,
      fetchLinks: env.repositoryPluginOptions.fetchLinks,
      graphQuery: env.repositoryPluginOptions.graphQuery,
      accessToken: env.repositoryPluginOptions.accessToken,
    }),
  ),
  RTE.bind('url', (env) =>
    RTE.right(
      prismic.buildQueryURL(
        env.repositoryPluginOptions.apiEndpoint,
        env.previewRef,
        prismic.predicate.at('document.id', env.documentId),
        env.params,
      ),
    ),
  ),
  RTE.bind('res', (env) =>
    RTE.fromTaskEither(
      TE.tryCatch(
        () => ky(env.url).json<prismic.Response.Query>(),
        (error) => error as Error,
      ),
    ),
  ),
  RTE.bindW('document', (env) =>
    pipe(
      A.head(env.res.results),
      RTE.fromOption(() => new Error('Document could not be found.')),
    ),
  ),
  RTE.bind('path', (env) =>
    RTE.right(env.repositoryConfig.linkResolver(env.document)),
  ),

  // End resolving.
  RTE.chainFirst((env) => RTE.fromIO(env.resolved(env.path))),

  RTE.map(constVoid),
)

export type UsePrismicPreviewResolverRepositoryConfig = {
  /**
   * Link Resolver for the repository. This should be the same Link Resolver
   * provided to `gatsby-source-prismic`'s plugin options.
   */
  linkResolver: LinkResolver
}

/**
 * React hook that determines the destination URL for a Prismic preview session.
 *
 * @param repositoryConfigs Configuration that determines how the destination URL is resolved.
 */
export const usePrismicPreviewResolver = (
  repositoryConfigs: PrismicRepositoryConfigs,
): readonly [UsePrismicPreviewResolverState, UsePrismicPreviewResolverFn] => {
  const [contextState, contextDispatch] = usePrismicPreviewContext()
  const [localState, localDispatch] = React.useReducer(
    localReducer,
    initialLocalState,
  )

  const resolvePreview = React.useCallback(async (): Promise<void> => {
    await pipe(
      previewResolverProgram({
        setActiveRepositoryName: (repositoryName: string) => () =>
          contextDispatch({
            type: PrismicContextActionType.SetActiveRepositoryName,
            payload: { repositoryName },
          }),
        beginResolving: () =>
          localDispatch({
            type: UsePrismicPreviewResolverActionType.BeginResolving,
          }),
        resolved: (path) => () =>
          localDispatch({
            type: UsePrismicPreviewResolverActionType.Resolved,
            payload: path,
          }),
        pluginOptionsStore: contextState.pluginOptionsStore,
        // TODO: This may cause infinite rerenders.
        repositoryConfigs: repositoryConfigs,
      }),
      TE.fold(
        (error) =>
          T.fromIO(() =>
            localDispatch({
              type: UsePrismicPreviewResolverActionType.Fail,
              payload: error,
            }),
          ),
        () => T.of(void 0),
      ),
    )()
  }, [repositoryConfigs, contextDispatch, contextState.pluginOptionsStore])

  return React.useMemo(() => [localState, resolvePreview] as const, [
    localState,
    resolvePreview,
  ])
}

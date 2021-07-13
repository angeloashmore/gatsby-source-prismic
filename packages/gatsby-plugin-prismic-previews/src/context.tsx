import * as React from 'react'
import * as IOE from 'fp-ts/IOEither'
import * as IO from 'fp-ts/IO'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/function'

import { getCookie } from './lib/getCookie'
import { sprintf } from './lib/sprintf'
import { ssrPluginOptionsStore } from './lib/setPluginOptionsOnWindow'

import {
  COOKIE_ACCESS_TOKEN_NAME,
  WINDOW_PLUGIN_OPTIONS_KEY,
  WINDOW_PROVIDER_PRESENCE_KEY,
} from './constants'
import {
  PluginOptions,
  PrismicAPIDocumentNodeInput,
  PrismicUnpublishedRepositoryConfigs,
  TypePathsStore,
} from './types'

declare global {
  interface Window {
    [WINDOW_PROVIDER_PRESENCE_KEY]: boolean
  }
}

/**
 * Populate a plugin options' `accessToken` value with one stored in a persisted
 * cookie, if available. If an access token already exists in the plugin
 * options, that token takes priority.
 */
const populateAccessToken = (
  pluginOptions: PluginOptions,
): IO.IO<PluginOptions> =>
  pipe(
    IOE.Do,
    IOE.chain(
      IOE.fromPredicate(
        () => pluginOptions.accessToken == null,
        () => new Error('Access token is already populated'),
      ),
    ),
    IOE.bind('cookieName', () =>
      IOE.of(sprintf(COOKIE_ACCESS_TOKEN_NAME, pluginOptions.repositoryName)),
    ),
    IOE.bindW('accessToken', (scope) => getCookie(scope.cookieName)),
    IOE.map((scope) => ({ ...pluginOptions, accessToken: scope.accessToken })),
    IOE.getOrElse(() => IO.of(pluginOptions)),
  )

/**
 * Determines if a value is a Gatsby node for a Prismic document.
 *
 * @param value Value to check.
 *
 * @returns `true` if value is a Gatsby node for a Prismic document, `false` otherwise.
 */
const isPrismicAPIDocumentNodeInput = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
): value is PrismicAPIDocumentNodeInput =>
  typeof value === 'object' && 'prismicId' in value

export type PrismicContextValue = readonly [
  PrismicContextState,
  React.Dispatch<PrismicContextAction>,
]

export enum PrismicPreviewState {
  IDLE = 'IDLE',
  RESOLVING = 'RESOLVING',
  RESOLVED = 'RESOLVED',
  BOOTSTRAPPING = 'BOOTSTRAPPING',
  ACTIVE = 'ACTIVE',
  PROMPT_FOR_ACCESS_TOKEN = 'PROMPT_FOR_ACCESS_TOKEN',
  FAILED = 'FAILED',
  NOT_PREVIEW = 'NOT_PREVIEW',
}

export type PrismicContextState = {
  /** The repository name of the preview session, if active. */
  activeRepositoryName: string | undefined
  /** The repository name of the preview session, if active. */
  previewState: PrismicPreviewState
  /** The error if the preview produced a failure. */
  error?: Error
  /** The resolved preview path if entered from a preview resolver page. */
  resolvedPath?: string
  /** Determines if all preview content has been fetched and prepared. */
  isBootstrapped: boolean
  /** Record of Prismic document nodes keyed by their `prismicId` field. */
  nodes: Record<string, PrismicAPIDocumentNodeInput>
  /** Record of plugin options keyed by their repository name. */
  pluginOptionsStore: Record<string, PluginOptions>
  /** Record of type paths keyed by their repository name. */
  typePathsStore: Record<string, TypePathsStore>
  /** Configuration for each repository */
  repositoryConfigs: PrismicUnpublishedRepositoryConfigs
}

export enum PrismicContextActionType {
  SetActiveRepositoryName = 'SetActiveRepositoryName',
  SetAccessToken = 'SetAccessToken',
  AppendNodes = 'AppendNodes',
  AppendTypePaths = 'AppendTypePaths',

  StartResolving = 'StartResolving',
  Resolved = 'Resolved',

  StartBootstrapping = 'StartBootstrapping',
  Bootstrapped = 'Bootstrapped',

  Failed = 'Failed',
  NotAPreview = 'NotAPreview',
  PromptForAccessToken = 'PromptForAccessToken',

  GoToIdle = 'GoToIdle',
}

export type PrismicContextAction =
  | {
      type: PrismicContextActionType.SetActiveRepositoryName
      payload: { repositoryName: string }
    }
  | {
      type: PrismicContextActionType.SetAccessToken
      payload: { repositoryName: string; accessToken: string }
    }
  | {
      type: PrismicContextActionType.AppendNodes
      payload: { nodes: unknown[] }
    }
  | {
      type: PrismicContextActionType.AppendTypePaths
      payload: { repositoryName: string; typePaths: TypePathsStore }
    }
  | {
      type: PrismicContextActionType.StartResolving
    }
  | {
      type: PrismicContextActionType.Resolved
      payload: { path: string }
    }
  | {
      type: PrismicContextActionType.StartBootstrapping
    }
  | {
      type: PrismicContextActionType.Bootstrapped
    }
  | {
      type: PrismicContextActionType.NotAPreview
    }
  | {
      type: PrismicContextActionType.PromptForAccessToken
    }
  | {
      type: PrismicContextActionType.Failed
      payload: { error: Error }
    }
  | {
      type: PrismicContextActionType.Failed
      payload: { error: Error }
    }
  | {
      type: PrismicContextActionType.GoToIdle
    }

export const contextReducer = (
  state: PrismicContextState,
  action: PrismicContextAction,
): PrismicContextState => {
  switch (action.type) {
    case PrismicContextActionType.SetActiveRepositoryName: {
      return {
        ...state,
        activeRepositoryName: action.payload.repositoryName,
      }
    }

    case PrismicContextActionType.AppendNodes: {
      const nodes = action.payload.nodes.reduce(
        (acc: PrismicContextState['nodes'], node) => {
          if (isPrismicAPIDocumentNodeInput(node)) {
            acc[node.prismicId] = node
          }

          return acc
        },
        { ...state.nodes },
      )

      return { ...state, nodes }
    }

    case PrismicContextActionType.AppendTypePaths: {
      return {
        ...state,
        typePathsStore: {
          ...state.typePathsStore,
          [action.payload.repositoryName]: action.payload.typePaths,
        },
      }
    }

    case PrismicContextActionType.SetAccessToken: {
      const repositoryName = action.payload.repositoryName

      return {
        ...state,
        pluginOptionsStore: {
          ...state.pluginOptionsStore,
          [repositoryName]: {
            ...state.pluginOptionsStore[repositoryName],
            accessToken: action.payload.accessToken,
          },
        },
      }
    }

    case PrismicContextActionType.StartResolving: {
      return {
        ...state,
        previewState: PrismicPreviewState.RESOLVING,
      }
    }

    case PrismicContextActionType.Resolved: {
      return {
        ...state,
        previewState: PrismicPreviewState.RESOLVED,
        resolvedPath: action.payload.path,
      }
    }

    case PrismicContextActionType.StartBootstrapping: {
      return {
        ...state,
        previewState: PrismicPreviewState.BOOTSTRAPPING,
        isBootstrapped: false,
      }
    }

    case PrismicContextActionType.Bootstrapped: {
      return {
        ...state,
        previewState: PrismicPreviewState.ACTIVE,
        isBootstrapped: true,
      }
    }

    case PrismicContextActionType.Failed: {
      return {
        ...state,
        previewState: PrismicPreviewState.FAILED,
        error: action.payload.error,
      }
    }

    case PrismicContextActionType.NotAPreview: {
      return {
        ...state,
        previewState: PrismicPreviewState.NOT_PREVIEW,
      }
    }

    case PrismicContextActionType.PromptForAccessToken: {
      return {
        ...state,
        previewState: PrismicPreviewState.PROMPT_FOR_ACCESS_TOKEN,
      }
    }

    case PrismicContextActionType.GoToIdle: {
      return {
        ...state,
        previewState: PrismicPreviewState.IDLE,
      }
    }
  }
}

const defaultInitialState: PrismicContextState = {
  activeRepositoryName: undefined,
  previewState: PrismicPreviewState.IDLE,
  isBootstrapped: false,
  nodes: {},
  pluginOptionsStore: {},
  typePathsStore: {},
  repositoryConfigs: [],
}

const createInitialState = (
  repositoryConfigs = defaultInitialState.repositoryConfigs,
): IO.IO<PrismicContextState> =>
  pipe(
    typeof window === 'undefined'
      ? ssrPluginOptionsStore
      : window[WINDOW_PLUGIN_OPTIONS_KEY],
    R.map(populateAccessToken),
    R.sequence(IO.Applicative),
    IO.map((pluginOptionsStore) => ({
      ...defaultInitialState,
      repositoryConfigs,
      pluginOptionsStore,
    })),
  )

const defaultContextValue: PrismicContextValue = [
  defaultInitialState,
  () => void 0,
]

export const PrismicContext = React.createContext(defaultContextValue)

export type PrismicProviderProps = {
  repositoryConfigs?: PrismicUnpublishedRepositoryConfigs
  children?: React.ReactNode
}

export const PrismicPreviewProvider = ({
  repositoryConfigs,
  children,
}: PrismicProviderProps): JSX.Element => {
  const initialState = createInitialState(repositoryConfigs)()
  const reducerTuple = React.useReducer(contextReducer, initialState)

  React.useLayoutEffect(() => {
    window[WINDOW_PROVIDER_PRESENCE_KEY] = true
  }, [])

  return (
    <PrismicContext.Provider value={reducerTuple}>
      {children}
    </PrismicContext.Provider>
  )
}

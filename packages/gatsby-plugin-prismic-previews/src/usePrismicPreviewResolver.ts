import * as React from 'react'
import * as prismic from '@prismicio/client'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'

import { extractPreviewRefRepositoryName } from './lib/extractPreviewRefRepositoryName'
import { getPreviewRef } from './lib/getPreviewRef'
import { isPreviewResolverSession } from './lib/isPreviewResolverSession'
import { sprintf } from './lib/sprintf'

import { PrismicRepositoryConfigs } from './types'
import {
  MISSING_PLUGIN_OPTIONS_MSG,
  MISSING_REPOSITORY_CONFIG_MSG,
} from './constants'
import {
  PrismicContextActionType,
  PrismicContextState,
  PrismicPreviewState,
} from './context'
import { usePrismicPreviewContext } from './usePrismicPreviewContext'

export type UsePrismicPreviewResolverFn = () => Promise<void>

export const usePrismicPreviewResolver = (
  repositoryConfigs: PrismicRepositoryConfigs = [],
): UsePrismicPreviewResolverFn => {
  const [contextState, contextDispatch] = usePrismicPreviewContext()

  const contextStateRef = React.useRef<PrismicContextState>(contextState)

  // We need to update the ref anytime contextState changes to ensure lazy
  // functions get the latest data.
  React.useEffect(() => {
    contextStateRef.current = contextState
  }, [contextState])

  return React.useCallback(async (): Promise<void> => {
    if (contextState.previewState !== PrismicPreviewState.IDLE) {
      // No op. Resolving should only happen at IDLE.
      return
    }

    if (E.isLeft(isPreviewResolverSession())) {
      return contextDispatch({
        type: PrismicContextActionType.NotAPreview,
      })
    }

    const previewRef = getPreviewRef()
    if (E.isLeft(previewRef)) {
      return contextDispatch({
        type: PrismicContextActionType.Failed,
        payload: { error: new Error('Preview cookie not present') },
      })
    }

    const repositoryName = extractPreviewRefRepositoryName(previewRef.right)
    if (O.isNone(repositoryName)) {
      return contextDispatch({
        type: PrismicContextActionType.Failed,
        payload: { error: new Error('Invalid preview ref') },
      })
    }

    contextDispatch({
      type: PrismicContextActionType.SetActiveRepositoryName,
      payload: { repositoryName: repositoryName.value },
    })

    // TODO: Deeply merge repository configs
    const resolvedRepositoryConfigs = [
      ...repositoryConfigs,
      ...contextState.repositoryConfigs,
    ]
    const repositoryConfig = resolvedRepositoryConfigs.find(
      (config) => config.repositoryName === repositoryName.value,
    )
    if (!repositoryConfig) {
      return contextDispatch({
        type: PrismicContextActionType.Failed,
        payload: {
          error: new Error(
            sprintf(
              MISSING_REPOSITORY_CONFIG_MSG,
              repositoryName.value,
              'withPrismicPreview and withPrismicUnpublishedPreview',
            ),
          ),
        },
      })
    }

    const repositoryPluginOptions =
      contextState.pluginOptionsStore[repositoryName.value]
    if (!repositoryPluginOptions) {
      return contextDispatch({
        type: PrismicContextActionType.Failed,
        payload: {
          error: new Error(
            sprintf(MISSING_PLUGIN_OPTIONS_MSG, repositoryName.value),
          ),
        },
      })
    }

    // Begin resolving stage.
    contextDispatch({
      type: PrismicContextActionType.StartResolving,
    })

    const endpoint =
      repositoryPluginOptions.apiEndpoint ??
      prismic.getEndpoint(repositoryName.value)
    const client = prismic.createClient(endpoint, {
      accessToken: repositoryPluginOptions.accessToken,
      defaultParams: {
        lang: repositoryPluginOptions.lang,
        fetchLinks: repositoryPluginOptions.fetchLinks,
        graphQuery: repositoryPluginOptions.graphQuery,
      },
    })
    client.enableAutoPreviews()

    let path: string
    try {
      path = await client.resolvePreviewURL({
        linkResolver: repositoryConfig.linkResolver,
        defaultURL: '/',
      })
    } catch (error) {
      if (
        error instanceof prismic.ForbiddenError &&
        repositoryPluginOptions.promptForAccessToken
      ) {
        return contextDispatch({
          type: PrismicContextActionType.PromptForAccessToken,
        })
      } else {
        return contextDispatch({
          type: PrismicContextActionType.Failed,
          payload: { error },
        })
      }
    }

    contextDispatch({
      type: PrismicContextActionType.Resolved,
      payload: { path },
    })
  }, [
    contextDispatch,
    contextState.pluginOptionsStore,
    contextState.previewState,
    contextState.repositoryConfigs,
    repositoryConfigs,
  ])
}

import * as React from 'react'
import * as gatsbyPrismic from 'gatsby-source-prismic'
import * as prismic from '@prismicio/client'
import * as prismicT from '@prismicio/types'
import * as RE from 'fp-ts/ReaderEither'
import * as Re from 'fp-ts/Reader'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { createNodeHelpers } from 'gatsby-node-helpers'
import md5 from 'tiny-hashes/md5'

import { defaultFieldTransformer } from './lib/defaultFieldTransformer'
import { extractPreviewRefRepositoryName } from './lib/extractPreviewRefRepositoryName'
import { fetchTypePaths } from './lib/fetchTypePaths'
import { getPreviewRef } from './lib/getPreviewRef'
import { isPreviewSession } from './lib/isPreviewSession'
import { proxyDocumentNodeInput } from './lib/proxyDocumentNodeInput'
import { serializePath } from './lib/serializePath'
import { sprintf } from './lib/sprintf'

import {
  Mutable,
  PrismicAPIDocumentNodeInput,
  PrismicRepositoryConfigs,
} from './types'
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

export type UsePrismicPreviewBootstrapFn = () => void

/**
 * React hook that bootstraps a Prismic preview session. When the returned
 * bootstrap function is called, the preiew session will be scoped to this
 * hook's Prismic repository. All documents from the repository will be fetched
 * using the preview session's documents.
 *
 * @param repositoryConfigs Configuration that determines how the bootstrap function runs.
 */
export const usePrismicPreviewBootstrap = (
  repositoryConfigs: PrismicRepositoryConfigs = [],
): UsePrismicPreviewBootstrapFn => {
  const [contextState, contextDispatch] = usePrismicPreviewContext()

  // A ref to the latest contextState is setup specifically for getTypePath
  // which is populated during the program's runtime. Since
  // contextState.typePaths is empty at all times during the program's run due
  // to closures, we need to opt out of the closure and use a ref.
  //
  // If you have a better idea how to handle this, please share!
  const contextStateRef = React.useRef<PrismicContextState>(contextState)

  // We need to update the ref anytime contextState changes to ensure lazy
  // functions get the latest data.
  React.useEffect(() => {
    contextStateRef.current = contextState
  }, [contextState])

  return React.useCallback(async (): Promise<void> => {
    if (
      (contextState.previewState !== PrismicPreviewState.IDLE &&
        contextState.previewState !== PrismicPreviewState.RESOLVED) ||
      contextState.isBootstrapped
    ) {
      // No op. Bootstrapping should only happen once.
      return
    }

    if (E.isLeft(isPreviewSession())) {
      return contextDispatch({
        type: PrismicContextActionType.NotAPreview,
      })
    }

    const previewRef = getPreviewRef()
    if (E.isLeft(previewRef)) {
      return contextDispatch({
        type: PrismicContextActionType.Failed,
        payload: { error: previewRef.left },
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

    const createNodeId = (input: string): string => md5(input)
    const createContentDigest = <T>(input: T): string =>
      md5(JSON.stringify(input))
    const nodeHelpers = createNodeHelpers({
      typePrefix: [
        gatsbyPrismic.GLOBAL_TYPE_PREFIX,
        repositoryPluginOptions.typePrefix,
      ]
        .filter(Boolean)
        .join(' '),
      fieldPrefix: gatsbyPrismic.GLOBAL_TYPE_PREFIX,
      createNodeId,
      createContentDigest,
    })

    // Begin bootstrap phase.
    contextDispatch({
      type: PrismicContextActionType.StartBootstrapping,
    })

    const typePaths = await fetchTypePaths({
      repositoryName: repositoryName.value,
    })()
    if (E.isLeft(typePaths)) {
      return contextDispatch({
        type: PrismicContextActionType.Failed,
        payload: { error: typePaths.left },
      })
    }

    contextDispatch({
      type: PrismicContextActionType.AppendTypePaths,
      payload: {
        repositoryName: repositoryName.value,
        typePaths: typePaths.right,
      },
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

    let allDocuments: prismicT.PrismicDocument[]
    try {
      allDocuments = await client.getAll()
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

    const allNodes = allDocuments.map(
      (doc) =>
        nodeHelpers.createNodeFactory(doc.type)(
          doc,
        ) as PrismicAPIDocumentNodeInput,
    )

    const allProxiedNodesOrError = pipe(
      allNodes,
      A.map((nodeInput) => proxyDocumentNodeInput(nodeInput)),
      RE.sequenceArray,
      RE.getOrElseW((error) => Re.of(error)),
    )({
      createContentDigest,
      nodeHelpers,
      linkResolver: repositoryConfig.linkResolver,
      getTypePath: (path) =>
        contextStateRef.current.typePathsStore[repositoryName.value][
          serializePath(path)
        ],
      getNode: (id) => contextStateRef.current.nodes[id],
      imageImgixParams: repositoryPluginOptions.imageImgixParams,
      imagePlaceholderImgixParams:
        repositoryPluginOptions.imagePlaceholderImgixParams,
      htmlSerializer: repositoryConfig.htmlSerializer,
      transformFieldName:
        repositoryConfig.transformFieldName ?? defaultFieldTransformer,
    })
    if (allProxiedNodesOrError instanceof Error) {
      return contextDispatch({
        type: PrismicContextActionType.Failed,
        payload: { error: allProxiedNodesOrError },
      })
    }

    contextDispatch({
      type: PrismicContextActionType.AppendNodes,
      payload: {
        nodes: allProxiedNodesOrError as Mutable<typeof allProxiedNodesOrError>,
      },
    })

    contextDispatch({
      type: PrismicContextActionType.Bootstrapped,
    })
  }, [
    repositoryConfigs,
    contextState.repositoryConfigs,
    contextState.pluginOptionsStore,
    contextState.previewState,
    contextState.isBootstrapped,
    contextDispatch,
  ])
}

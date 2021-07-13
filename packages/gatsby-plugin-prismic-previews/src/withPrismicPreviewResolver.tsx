import * as React from 'react'
import * as gatsby from 'gatsby'

import { getComponentDisplayName } from './lib/getComponentDisplayName'

import { PrismicRepositoryConfigs } from './types'
import { usePrismicPreviewResolver } from './usePrismicPreviewResolver'
import { usePrismicPreviewContext } from './usePrismicPreviewContext'

import {
  PrismicContextActionType,
  PrismicContextState,
  PrismicPreviewState,
} from './context'
import { PrismicPreviewUI } from './components/PrismicPreviewUI'

export interface WithPrismicPreviewResolverProps {
  isPrismicPreview: boolean | null
  prismicPreviewPath: PrismicContextState['resolvedPath']
}

export type WithPrismicPreviewResolverConfig = {
  autoRedirect?: boolean
  navigate?: typeof gatsby.navigate
}

/**
 * A React higher order component (HOC) that wraps a Gatsby page to
 * automatically setup a Prismic preview resolver page. It can automatically
 * redirect an editor to the previewed document's page.
 *
 * @param WrappedComponent The Gatsby page component.
 * @param usePrismicPreviewResolverConfig Configuration determining how the preview session is resolved.
 * @param config Configuration determining how the HOC handes the resolved preview.
 *
 * @returns `WrappedComponent` with automatic Prismic preview resolving.
 */
export const withPrismicPreviewResolver = <TProps extends gatsby.PageProps>(
  WrappedComponent: React.ComponentType<
    TProps & WithPrismicPreviewResolverProps
  >,
  repositoryConfigs: PrismicRepositoryConfigs,
  config: WithPrismicPreviewResolverConfig = {},
): React.ComponentType<TProps> => {
  const WithPrismicPreviewResolver = (props: TProps): React.ReactElement => {
    const [contextState, contextDispatch] = usePrismicPreviewContext()
    const resolvePreview = usePrismicPreviewResolver(repositoryConfigs)

    const isPreview =
      contextState.previewState === PrismicPreviewState.IDLE
        ? null
        : contextState.previewState !== PrismicPreviewState.NOT_PREVIEW

    const afterAccessTokenSet = React.useCallback(() => {
      contextDispatch({ type: PrismicContextActionType.GoToIdle })
      resolvePreview()
    }, [resolvePreview, contextDispatch])

    React.useEffect(() => {
      resolvePreview()
    }, [resolvePreview])

    React.useEffect(() => {
      if (contextState.resolvedPath && (config.autoRedirect ?? true)) {
        const navigate = config.navigate || gatsby.navigate

        navigate(contextState.resolvedPath)
      }
    }, [contextState.resolvedPath])

    return (
      <>
        <WrappedComponent
          {...props}
          isPrismicPreview={isPreview}
          prismicPreviewPath={contextState.resolvedPath}
        />
        <PrismicPreviewUI afterAccessTokenSet={afterAccessTokenSet} />
      </>
    )
  }

  const wrappedComponentName = getComponentDisplayName(WrappedComponent)
  WithPrismicPreviewResolver.displayName = `withPrismicPreviewResolver(${wrappedComponentName})`

  return WithPrismicPreviewResolver
}

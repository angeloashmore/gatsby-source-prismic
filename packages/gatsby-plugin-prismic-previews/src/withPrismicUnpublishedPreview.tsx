import * as React from 'react'
import * as gatsby from 'gatsby'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Record'
import { constNull, pipe } from 'fp-ts/function'

import { camelCase } from './lib/camelCase'
import { getComponentDisplayName } from './lib/getComponentDisplayName'
import { getNodesForPath } from './lib/getNodesForPath'

import {
  PrismicUnpublishedRepositoryConfig,
  PrismicUnpublishedRepositoryConfigs,
  UnknownRecord,
} from './types'
import { usePrismicPreviewBootstrap } from './usePrismicPreviewBootstrap'
import { usePrismicPreviewContext } from './usePrismicPreviewContext'
import { PrismicContextActionType, PrismicPreviewState } from './context'
import { PrismicPreviewUI } from './components/PrismicPreviewUI'

/**
 * A convenience function to create a `componentResolver` function from a record
 * mapping a Prismic document type to a React component.
 *
 * In most cases, this convenience function is sufficient to provide a working
 * unpublished preview experience.
 *
 * @param componentMap A record mapping a Prismic document type to a React component.
 *
 * @returns A `componentResolver` function that can be passed to `withPrismicUnpublishedPreview`'s configuration.
 */
export const componentResolverFromMap =
  (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    componentMap: Record<string, React.ComponentType<any>>,
  ): PrismicUnpublishedRepositoryConfig['componentResolver'] =>
  (nodes) =>
    pipe(
      A.head(nodes),
      O.bindTo('node'),
      O.bind('type', (env) => O.some(env.node.type)),
      O.chain((env) => R.lookup(env.type, componentMap)),
      O.getOrElseW(constNull),
    )

/**
 * A `dataResolver` function that assumes the first matching node for the page's
 * URL is the primary document. The document is added to the page's `data` prop
 * using the Prismic document's type formatted using Gatsby's camel-cased query
 * convention.
 */
export const defaultDataResolver: PrismicUnpublishedRepositoryConfig['dataResolver'] =
  (nodes, data) =>
    pipe(
      A.head(nodes),
      O.bindTo('node'),
      O.bind('key', (env) => O.some(camelCase(env.node.internal.type))),
      O.fold(
        () => data,
        (env) => ({
          ...data,
          [env.key]: env.node,
        }),
      ),
    )

const useNodesForPath = (path: string) => {
  const [contextState] = usePrismicPreviewContext()

  return React.useMemo(
    () => getNodesForPath(path, contextState.nodes),
    [path, contextState.nodes],
  )
}

const useActiveRepositoryConfig = (
  repositoryConfigs: PrismicUnpublishedRepositoryConfigs = [],
) => {
  const [contextState] = usePrismicPreviewContext()

  return React.useMemo(
    () =>
      [...repositoryConfigs, ...contextState.repositoryConfigs].find(
        (config) => config.repositoryName === contextState.activeRepositoryName,
      ),
    [
      contextState.activeRepositoryName,
      contextState.repositoryConfigs,
      repositoryConfigs,
    ],
  )
}

/**
 * A React higher order component (HOC) that wraps a Gatsby page to
 * automatically display a template for an unpublished Prismic document. This
 * HOC should be used on your app's 404 page (usually `src/pages/404.js`).
 *
 * @param WrappedComponent The Gatsby page component.
 * @param usePrismicPreviewBootstrapConfig Configuration determining how the preview session is managed.
 * @param config Configuration determining how the HOC handes previewed content.
 *
 * @returns `WrappedComponent` with automatic unpublished Prismic preview data.
 */
export const withPrismicUnpublishedPreview = <
  TStaticData extends UnknownRecord,
  TProps extends gatsby.PageProps<TStaticData>,
>(
  WrappedComponent: React.ComponentType<TProps>,
  repositoryConfigs?: PrismicUnpublishedRepositoryConfigs,
): React.ComponentType<TProps> => {
  const WithPrismicUnpublishedPreview = (props: TProps): React.ReactElement => {
    const [contextState, contextDispatch] = usePrismicPreviewContext()
    const bootstrapPreview = usePrismicPreviewBootstrap(repositoryConfigs)
    const nodesForPath = useNodesForPath(props.location.pathname)
    const repositoryConfig = useActiveRepositoryConfig(repositoryConfigs)

    const ResolvedComponent = React.useMemo(
      () =>
        repositoryConfig?.componentResolver(nodesForPath) ?? WrappedComponent,
      [repositoryConfig, nodesForPath],
    )

    const resolvedData = React.useMemo(() => {
      const dataResolver = repositoryConfig?.dataResolver || defaultDataResolver

      return dataResolver(nodesForPath, props.data)
    }, [repositoryConfig?.dataResolver, nodesForPath, props.data])

    const afterAccessTokenSet = React.useCallback(() => {
      contextDispatch({ type: PrismicContextActionType.GoToIdle })
      bootstrapPreview()
    }, [bootstrapPreview, contextDispatch])

    React.useEffect(() => {
      bootstrapPreview()
    }, [bootstrapPreview])

    return contextState.previewState === PrismicPreviewState.ACTIVE ? (
      <ResolvedComponent {...props} data={resolvedData} />
    ) : (
      <>
        <WrappedComponent {...props} />
        <PrismicPreviewUI afterAccessTokenSet={afterAccessTokenSet} />
      </>
    )
  }

  const wrappedComponentName = getComponentDisplayName(WrappedComponent)
  WithPrismicUnpublishedPreview.displayName = `withPrismicUnpublishedPreview(${wrappedComponentName})`

  return WithPrismicUnpublishedPreview
}

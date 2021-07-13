import * as React from 'react'
import * as gatsby from 'gatsby'

import { getComponentDisplayName } from './lib/getComponentDisplayName'

import { PrismicRepositoryConfigs, UnknownRecord } from './types'
import { usePrismicPreviewBootstrap } from './usePrismicPreviewBootstrap'
import { useMergePrismicPreviewData } from './useMergePrismicPreviewData'
import { PrismicPreviewUI } from './components/PrismicPreviewUI'
import { usePrismicPreviewContext } from './usePrismicPreviewContext'
import { PrismicContextActionType } from './context'

export interface WithPrismicPreviewProps<
  TStaticData extends UnknownRecord = UnknownRecord,
> {
  isPrismicPreview: boolean | null
  prismicPreviewOriginalData: TStaticData
}

export type WithPrismicPreviewConfig = {
  mergePreviewData?: boolean
}

/**
 * A React higher order component (HOC) that wraps a Gatsby page to
 * automatically merge previewed content during a Prismic preview session.
 *
 * @param WrappedComponent The Gatsby page component.
 * @param usePrismicPreviewBootstrapConfig Configuration determining how the preview session is managed.
 * @param config Configuration determining how the HOC handes previewed content.
 *
 * @returns `WrappedComponent` with automatic Prismic preview data.
 */
export const withPrismicPreview = <
  TStaticData extends UnknownRecord,
  TProps extends gatsby.PageProps<TStaticData>,
>(
  WrappedComponent: React.ComponentType<
    TProps & WithPrismicPreviewProps<TStaticData>
  >,
  repositoryConfigs: PrismicRepositoryConfigs = [],
  config: WithPrismicPreviewConfig = {},
): React.ComponentType<TProps> => {
  const WithPrismicPreview = (props: TProps): React.ReactElement => {
    const [, contextDispatch] = usePrismicPreviewContext()
    const bootstrapPreview = usePrismicPreviewBootstrap(repositoryConfigs)
    const mergedData = useMergePrismicPreviewData(props.data, {
      skip: config.mergePreviewData,
    })

    const afterAccessTokenSet = React.useCallback(() => {
      contextDispatch({ type: PrismicContextActionType.GoToIdle })
      bootstrapPreview()
    }, [bootstrapPreview, contextDispatch])

    React.useEffect(() => {
      bootstrapPreview()
    }, [bootstrapPreview])

    return (
      <>
        <WrappedComponent
          {...props}
          data={mergedData.data}
          isPrismicPreview={mergedData.isPreview}
          prismicPreviewOriginalData={props.data}
        />
        <PrismicPreviewUI afterAccessTokenSet={afterAccessTokenSet} />
      </>
    )
  }

  const wrappedComponentName = getComponentDisplayName(WrappedComponent)
  WithPrismicPreview.displayName = `withPrismicPreview(${wrappedComponentName})`

  return WithPrismicPreview
}

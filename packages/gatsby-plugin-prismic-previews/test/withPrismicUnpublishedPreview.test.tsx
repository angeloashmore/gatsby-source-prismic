import test from 'ava'
import * as assert from 'assert'
import * as mswNode from 'msw/node'
import * as gatsbyPrismic from 'gatsby-source-prismic'
import * as prismic from '@prismicio/client'
import * as prismicH from '@prismicio/helpers'
import * as cookie from 'es-cookie'
import * as gatsby from 'gatsby'
import * as React from 'react'
import * as tlr from '@testing-library/react'
import { createNodeHelpers } from 'gatsby-node-helpers'
import globalJsdom from 'global-jsdom'
import md5 from 'tiny-hashes/md5'

import { clearAllCookies } from './__testutils__/clearAllCookies'
import { createAPIQueryMockedRequest } from './__testutils__/createAPIQueryMockedRequest'
import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPageProps } from './__testutils__/createPageProps'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { createPreviewRef } from './__testutils__/createPreviewRef'
import { createPreviewURL } from './__testutils__/createPreviewURL'
import { createPrismicAPIQueryResponse } from './__testutils__/createPrismicAPIQueryResponse'
import { createTypePathsMockedRequest } from './__testutils__/createTypePathsMockedRequest'
import { polyfillKy } from './__testutils__/polyfillKy'

import {
  PluginOptions,
  PrismicAPIDocumentNodeInput,
  PrismicPreviewProvider,
  PrismicRepositoryConfigs,
  PrismicUnpublishedRepositoryConfigs,
  UnknownRecord,
  WithPrismicPreviewProps,
  componentResolverFromMap,
  withPrismicPreview,
  withPrismicUnpublishedPreview,
} from '../src'
import { onClientEntry } from '../src/on-client-entry'
import { createPrismicAPIDocumentNodeInput } from './__testutils__/createPrismicAPIDocumentNodeInput'
import { createPrismicAPIDocument } from './__testutils__/createPrismicAPIDocument'

const nodeHelpers = createNodeHelpers({
  typePrefix: 'Prismic prefix',
  fieldPrefix: 'Prismic',
  createNodeId: (id) => md5(id),
  createContentDigest: (input) => md5(JSON.stringify(input)),
})

const server = mswNode.setupServer()
test.before(() => {
  polyfillKy()
  globalJsdom(undefined, {
    url: 'https://example.com',
    pretendToBeVisual: true,
  })
  server.listen({ onUnhandledRequest: 'error' })
  globalThis.__PATH_PREFIX__ = 'https://example.com'
})
test.beforeEach(() => {
  clearAllCookies()
  window.history.replaceState(null, '', createPreviewURL())
})
test.afterEach(() => tlr.cleanup())
test.after(() => {
  server.close()
})

const createRepositoryConfigs = (
  pluginOptions: PluginOptions,
): PrismicUnpublishedRepositoryConfigs => {
  const baseConfigs: PrismicRepositoryConfigs = [
    {
      repositoryName: pluginOptions.repositoryName,
      linkResolver: (doc): string => `/${doc.uid}`,
    },
  ]

  return baseConfigs.map((config) => ({
    ...config,
    componentResolver: componentResolverFromMap({
      type: withPrismicPreview(Page, baseConfigs),
    }),
  }))
}

const NotFoundPage = <TProps extends UnknownRecord = UnknownRecord>(
  props: gatsby.PageProps<TProps>,
) => (
  <div>
    <div data-testid="component-name">NotFoundPage</div>
    <div data-testid="data">{JSON.stringify(props.data)}</div>
  </div>
)

const Page = <TProps extends UnknownRecord = UnknownRecord>(
  props: gatsby.PageProps<TProps> & WithPrismicPreviewProps<TProps>,
) => (
  <div>
    <div data-testid="component-name">Page</div>
    <div data-testid="isPrismicPreview">
      {props.isPrismicPreview === null
        ? 'null'
        : props.isPrismicPreview.toString()}
    </div>
    <div data-testid="prismicPreviewOriginalData">
      {JSON.stringify(props.prismicPreviewOriginalData)}
    </div>
    <div data-testid="data">{JSON.stringify(props.data)}</div>
  </div>
)

const createTree = (
  pageProps: gatsby.PageProps,
  repositoryConfigs: PrismicUnpublishedRepositoryConfigs,
) => {
  const WrappedPage = withPrismicUnpublishedPreview(
    NotFoundPage,
    repositoryConfigs,
  )

  return (
    <PrismicPreviewProvider>
      {/*
       // @ts-expect-error - Partial pageResources provided */}
      <WrappedPage {...pageProps} />
    </PrismicPreviewProvider>
  )
}

test.serial('renders the 404 page if not a preview', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  const queryResponse = createPrismicAPIQueryResponse()
  const queryResponseNodes = queryResponse.results.map(
    (doc) =>
      nodeHelpers.createNodeFactory(doc.type)(
        doc,
      ) as PrismicAPIDocumentNodeInput,
  )

  // Need to use the query results nodes rather than new documents to ensure
  // the IDs match.
  const staticData = {
    previewable: { ...queryResponseNodes[0] },
    nonPreviewable: { ...queryResponseNodes[1] },
  }
  staticData.previewable._previewable = queryResponseNodes[0].prismicId
  // Marking this data as "old" and should be replaced during the merge.
  staticData.previewable.uid = 'old'

  const pageProps = createPageProps(staticData)
  const repositoryConfigs = createRepositoryConfigs(pluginOptions)
  const tree = createTree(pageProps, repositoryConfigs)

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const result = tlr.render(tree)

  // Because a preview ref was not set, preview data was not fetched. The
  // component should render the base 404 component and data.
  t.true(result.getByTestId('component-name').textContent === 'NotFoundPage')
  t.true(
    result.getByTestId('data').textContent === JSON.stringify(pageProps.data),
  )
})

test.serial('merges data if preview data is available', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  const repositoryConfigs = createRepositoryConfigs(pluginOptions)

  const ref = createPreviewRef(pluginOptions.repositoryName)
  cookie.set(prismic.cookie.preview, ref)

  const queryResponse = createPrismicAPIQueryResponse()
  const queryResponseNodes = queryResponse.results.map((doc) => {
    const node = nodeHelpers.createNodeFactory(doc.type)(
      doc,
    ) as PrismicAPIDocumentNodeInput

    return {
      ...node,
      url: prismicH.asLink(
        prismicH.documentToLinkField(doc),
        repositoryConfigs[0].linkResolver,
      ),
      alternate_languages: node.alternate_languages.map(
        (alternativeLanguage) => ({
          ...alternativeLanguage,
          raw: alternativeLanguage,
        }),
      ),
    }
  })

  // We'll use the first node as an unpublished preview. The unpublished HOC
  // should see this URL and find the node with a matching URL.
  window.history.replaceState(null, '', queryResponseNodes[0].url)

  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse, { ref }))
  server.use(
    createTypePathsMockedRequest('a9101d270279c16322571b8448d7a329.json', {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
    }),
  )

  // Need to use the query results nodes rather than new documents to ensure
  // the IDs match.
  const staticData = {
    previewable: { ...queryResponseNodes[0] },
    nonPreviewable: { ...queryResponseNodes[1] },
  }
  // @ts-expect-error - _previewable doesn't exist on standard PrismicDocument
  staticData.previewable._previewable = queryResponseNodes[0].prismicId
  // Marking this data as "old" and should be replaced during the merge.
  staticData.previewable.uid = 'old'

  const pageProps = createPageProps(staticData)
  const tree = createTree(pageProps, repositoryConfigs)

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const result = tlr.render(tree)

  await tlr.waitFor(() =>
    assert.ok(result.getByTestId('component-name').textContent === 'Page'),
  )

  const propData = JSON.parse(result.getByTestId('data').textContent ?? '{}')
  const mergedData = {
    ...staticData,
    previewable: {
      __typename: 'PrismicPrefixType',
      ...queryResponseNodes[0],
    },
    prismicPrefixType: {
      __typename: 'PrismicPrefixType',
      ...queryResponseNodes[0],
    },
  }
  t.deepEqual(propData, mergedData)
})

test('componentResolverFromMap returns componentResolver', (t) => {
  const fooDoc = { ...createPrismicAPIDocument(), type: 'foo' }
  const fooNode = createPrismicAPIDocumentNodeInput({}, fooDoc)
  const FooComp = () => <div />

  const barDoc = { ...createPrismicAPIDocument(), type: 'bar' }
  const barNode = createPrismicAPIDocumentNodeInput({}, barDoc)
  const BarComp = () => <div />

  const componentResolver = componentResolverFromMap({
    foo: FooComp,
    bar: BarComp,
  })

  t.true(componentResolver([fooNode]) === FooComp)
  t.true(componentResolver([barNode]) === BarComp)

  // It should use the first node to resolve the component.
  t.true(componentResolver([fooNode, barNode]) === FooComp)
  t.true(componentResolver([barNode, fooNode]) === BarComp)
})

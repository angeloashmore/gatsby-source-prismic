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
  UnknownRecord,
  WithPrismicPreviewConfig,
  WithPrismicPreviewProps,
  withPrismicPreview,
} from '../src'
import { onClientEntry } from '../src/on-client-entry'

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
  // console.error = sinon.stub()
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
): PrismicRepositoryConfigs => [
  {
    repositoryName: pluginOptions.repositoryName,
    linkResolver: (doc): string => `/${doc.uid}`,
  },
]

const Page = <TProps extends UnknownRecord = UnknownRecord>(
  props: gatsby.PageProps<TProps> & WithPrismicPreviewProps<TProps>,
) => (
  <div>
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
  repositoryConfigs: PrismicRepositoryConfigs,
  config?: WithPrismicPreviewConfig,
) => {
  const WrappedPage = withPrismicPreview(Page, repositoryConfigs, config)

  return (
    <PrismicPreviewProvider>
      {/*
       // @ts-expect-error - Partial pageResources provided */}
      <WrappedPage {...pageProps} />
    </PrismicPreviewProvider>
  )
}

test.serial(
  'does not merge data if no preview data is available',
  async (t) => {
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
    const config = createRepositoryConfigs(pluginOptions)
    const tree = createTree(pageProps, config)

    // @ts-expect-error - Partial gatsbyContext provided
    await onClientEntry(gatsbyContext, pluginOptions)
    const result = tlr.render(tree)

    // Because a preview ref was not set, preview data was not fetched. The
    // component should render static data.
    t.true(
      result.getByTestId('data').textContent ===
        result.getByTestId('prismicPreviewOriginalData').textContent,
    )
  },
)

test.serial('merges data if preview data is available', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

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
        config[0].linkResolver,
      ),
      alternate_languages: node.alternate_languages.map(
        (alternativeLanguage) => ({
          ...alternativeLanguage,
          raw: alternativeLanguage,
        }),
      ),
    }
  })

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
  const tree = createTree(pageProps, config)

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const result = tlr.render(tree)

  await tlr.waitFor(() =>
    assert.ok(
      result.getByTestId('data').textContent !==
        result.getByTestId('prismicPreviewOriginalData').textContent,
    ),
  )

  const propData = JSON.parse(result.getByTestId('data').textContent ?? '{}')
  const mergedData = {
    ...staticData,
    previewable: {
      __typename: 'PrismicPrefixType',
      ...queryResponseNodes[0],
    },
  }
  t.deepEqual(propData, mergedData)
})

test.serial('handles custom types without a data field', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  const config = createRepositoryConfigs(pluginOptions)

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
        config[0].linkResolver,
      ),
      alternate_languages: node.alternate_languages.map(
        (alternativeLanguage) => ({
          ...alternativeLanguage,
          raw: alternativeLanguage,
        }),
      ),
    }
  })

  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse, { ref }))
  server.use(
    createTypePathsMockedRequest('eac4669530f66bef76da4016f1111055.json', {
      type: gatsbyPrismic.PrismicSpecialType.Document,
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
  const tree = createTree(pageProps, config)

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const result = tlr.render(tree)

  await tlr.waitFor(() =>
    assert.ok(
      result.getByTestId('data').textContent !==
        result.getByTestId('prismicPreviewOriginalData').textContent,
    ),
  )

  const propData = JSON.parse(result.getByTestId('data').textContent ?? '{}')
  const mergedData = {
    ...staticData,
    previewable: {
      __typename: 'PrismicPrefixType',
      ...queryResponseNodes[0],
    },
  }
  t.deepEqual(propData, mergedData)
})

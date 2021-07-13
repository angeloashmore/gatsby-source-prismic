import test from 'ava'
import * as mswNode from 'msw/node'
import * as gatsbyPrismic from 'gatsby-source-prismic'
import * as prismic from '@prismicio/client'
import * as cookie from 'es-cookie'
import * as assert from 'assert'
import { renderHook, act, cleanup } from '@testing-library/react-hooks'
import { createNodeHelpers } from 'gatsby-node-helpers'
import md5 from 'tiny-hashes/md5'
import browserEnv from 'browser-env'

import { clearAllCookies } from './__testutils__/clearAllCookies'
import { createAPIQueryMockedRequest } from './__testutils__/createAPIQueryMockedRequest'
import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { createPreviewRef } from './__testutils__/createPreviewRef'
import { createPrismicAPIDocumentNodeInput } from './__testutils__/createPrismicAPIDocumentNodeInput'
import { createPrismicAPIQueryResponse } from './__testutils__/createPrismicAPIQueryResponse'
import { createTypePathsMockedRequest } from './__testutils__/createTypePathsMockedRequest'
import { polyfillKy } from './__testutils__/polyfillKy'

import {
  PrismicAPIDocumentNodeInput,
  PrismicPreviewProvider,
  useMergePrismicPreviewData,
  usePrismicPreviewBootstrap,
  usePrismicPreviewContext,
  PluginOptions,
  PrismicRepositoryConfigs,
  PrismicPreviewState,
} from '../src'
import { onClientEntry } from '../src/gatsby-browser'

const createStaticData = () => {
  const previewable = createPrismicAPIDocumentNodeInput({ text: 'static' })
  previewable._previewable = previewable.prismicId

  const nonPreviewable = createPrismicAPIDocumentNodeInput({ text: 'static' })

  return { previewable, nonPreviewable }
}

const createRepositoryConfigs = (
  pluginOptions: PluginOptions,
): PrismicRepositoryConfigs => [
  {
    repositoryName: pluginOptions.repositoryName,
    linkResolver: (doc): string => `/${doc.uid}`,
  },
]

const nodeHelpers = createNodeHelpers({
  typePrefix: 'Prismic prefix',
  fieldPrefix: 'Prismic',
  createNodeId: (id) => md5(id),
  createContentDigest: (input) => md5(JSON.stringify(input)),
})

const server = mswNode.setupServer()
test.before(() => {
  polyfillKy()
  browserEnv(['window', 'document'])
  server.listen({ onUnhandledRequest: 'error' })
  window.requestAnimationFrame = function (callback) {
    return setTimeout(callback, 0)
  }
  globalThis.__PATH_PREFIX__ = 'https://example.com'
})
test.beforeEach(() => {
  clearAllCookies()
})
test.afterEach(() => {
  cleanup()
})
test.after(() => {
  server.close()
})

test.serial('does not merge if no preview data is available', async (t) => {
  const pluginOptions = createPluginOptions(t)
  const gatsbyContext = createGatsbyContext()
  const staticData = createStaticData()

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const { result } = renderHook(() => useMergePrismicPreviewData(staticData), {
    wrapper: PrismicPreviewProvider,
  })

  t.false(result.current.isPreview)
  t.true(result.current.data === staticData)
})

test.serial(
  'merges data only where `_previewable` field matches',
  async (t) => {
    const pluginOptions = createPluginOptions(t)
    const gatsbyContext = createGatsbyContext()
    const config = createRepositoryConfigs(pluginOptions)
    const queryResponse = createPrismicAPIQueryResponse()

    const ref = createPreviewRef(pluginOptions.repositoryName)
    cookie.set(prismic.cookie.preview, ref)

    const queryResponseNodes = queryResponse.results.map(
      (doc) =>
        nodeHelpers.createNodeFactory(doc.type)(
          doc,
        ) as PrismicAPIDocumentNodeInput,
    )

    server.use(
      createAPIQueryMockedRequest(pluginOptions, queryResponse, { ref }),
    )
    server.use(
      createTypePathsMockedRequest('d26c1607b46a831c5d238303c3cbf489.json', {
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
    staticData.previewable._previewable = queryResponseNodes[0].prismicId
    // Marking this data as "old" and should be replaced during the merge.
    staticData.previewable.uid = 'old'

    // @ts-expect-error - Partial gatsbyContext provided
    await onClientEntry(gatsbyContext, pluginOptions)

    const { result, waitFor } = renderHook(
      () => {
        const context = usePrismicPreviewContext()
        const bootstrap = usePrismicPreviewBootstrap(config)
        const mergedData = useMergePrismicPreviewData(staticData)

        return { bootstrap, context, mergedData }
      },
      { wrapper: PrismicPreviewProvider },
    )

    act(() => {
      result.current.bootstrap()
    })

    await waitFor(() =>
      assert.ok(
        result.current.context[0].previewState ===
          PrismicPreviewState.BOOTSTRAPPING,
      ),
    )
    await waitFor(() =>
      assert.ok(
        result.current.context[0].previewState === PrismicPreviewState.ACTIVE,
      ),
    )

    t.true(result.current.mergedData.isPreview)
    t.true(
      result.current.mergedData.data.previewable.uid ===
        queryResponseNodes[0].uid,
    )
  },
)

test.todo('recursively merges data')

test('allows skipping', async (t) => {
  const pluginOptions = createPluginOptions(t)
  const gatsbyContext = createGatsbyContext()
  const config = createRepositoryConfigs(pluginOptions)
  const queryResponse = createPrismicAPIQueryResponse()

  const ref = createPreviewRef(pluginOptions.repositoryName)
  cookie.set(prismic.cookie.preview, ref)

  const queryResponseNodes = queryResponse.results.map(
    (doc) =>
      nodeHelpers.createNodeFactory(doc.type)(
        doc,
      ) as PrismicAPIDocumentNodeInput,
  )

  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse, { ref }))
  server.use(
    createTypePathsMockedRequest('87ec42108faaca92ab06c427cf0b3b9d.json', {
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
  staticData.previewable._previewable = queryResponseNodes[0].prismicId
  // Marking this data as "old" and should be replaced during the merge.
  staticData.previewable.uid = 'old'

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)

  const { result, waitFor } = renderHook(
    () => {
      const context = usePrismicPreviewContext()
      const bootstrap = usePrismicPreviewBootstrap(config)
      const mergedData = useMergePrismicPreviewData(staticData, { skip: true })

      return { bootstrap, context, mergedData }
    },
    { wrapper: PrismicPreviewProvider },
  )

  act(() => {
    result.current.bootstrap()
  })

  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState ===
        PrismicPreviewState.BOOTSTRAPPING,
    ),
  )
  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState === PrismicPreviewState.ACTIVE,
    ),
  )

  t.false(result.current.mergedData.isPreview)
  t.true(result.current.mergedData.data === staticData)
})

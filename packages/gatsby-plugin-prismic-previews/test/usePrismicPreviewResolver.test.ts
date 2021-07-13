import test from 'ava'
import * as mswNode from 'msw/node'
import * as prismic from '@prismicio/client'
import * as cookie from 'es-cookie'
import * as assert from 'assert'
import { renderHook, act, cleanup } from '@testing-library/react-hooks'
import browserEnv from 'browser-env'

import { clearAllCookies } from './__testutils__/clearAllCookies'
import { createAPIQueryMockedRequest } from './__testutils__/createAPIQueryMockedRequest'
import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { createPreviewRef } from './__testutils__/createPreviewRef'
import { createPrismicAPIDocument } from './__testutils__/createPrismicAPIDocument'
import { createPrismicAPIQueryResponse } from './__testutils__/createPrismicAPIQueryResponse'
import { navigateToPreviewResolverURL } from './__testutils__/navigateToPreviewResolverURL'
import { polyfillKy } from './__testutils__/polyfillKy'

import {
  PluginOptions,
  PrismicPreviewProvider,
  usePrismicPreviewResolver,
  PrismicRepositoryConfigs,
  usePrismicPreviewContext,
  PrismicPreviewState,
} from '../src'
import { onClientEntry } from '../src/gatsby-browser'

const createConfig = (
  pluginOptions: PluginOptions,
): PrismicRepositoryConfigs => [
  {
    repositoryName: pluginOptions.repositoryName,
    linkResolver: (doc): string => `/${doc.uid}`,
    componentResolver: () => null,
  },
]

const server = mswNode.setupServer()
test.before(() => {
  polyfillKy()
  browserEnv(['window', 'document'], {
    url: 'https://example.com',
  })
  server.listen({ onUnhandledRequest: 'error' })
  window.requestAnimationFrame = function (callback) {
    return setTimeout(callback, 0)
  }
  globalThis.location = window.location
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

test.serial('initial state', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const { result } = renderHook(() => usePrismicPreviewContext(), {
    wrapper: PrismicPreviewProvider,
  })

  t.is(result.current[0].previewState, PrismicPreviewState.IDLE)
  t.is(result.current[0].resolvedPath, undefined)
})

test.serial('fails if documentId is not in URL', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createConfig(pluginOptions)
  const ref = createPreviewRef(pluginOptions.repositoryName)

  navigateToPreviewResolverURL(ref, null)
  cookie.set(prismic.cookie.preview, ref)

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const { result, waitFor } = renderHook(
    () => {
      const context = usePrismicPreviewContext()
      const resolve = usePrismicPreviewResolver(config)

      return { resolve, context }
    },
    { wrapper: PrismicPreviewProvider },
  )

  act(() => {
    result.current.resolve()
  })

  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState ===
        PrismicPreviewState.NOT_PREVIEW,
    ),
  )

  t.is(result.current.context[0].previewState, PrismicPreviewState.NOT_PREVIEW)
})

test.serial('fails if token is not in cookies', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createConfig(pluginOptions)
  const ref = createPreviewRef(pluginOptions.repositoryName)

  navigateToPreviewResolverURL(ref)

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const { result, waitFor } = renderHook(
    () => {
      const context = usePrismicPreviewContext()
      const resolve = usePrismicPreviewResolver(config)

      return { resolve, context }
    },
    { wrapper: PrismicPreviewProvider },
  )

  act(() => {
    result.current.resolve()
  })

  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState ===
        PrismicPreviewState.NOT_PREVIEW,
    ),
  )

  t.is(result.current.context[0].previewState, PrismicPreviewState.NOT_PREVIEW)
})

test.serial('resolves a path using the link resolver', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createConfig(pluginOptions)
  const ref = createPreviewRef(pluginOptions.repositoryName)

  const doc = createPrismicAPIDocument()
  const queryResponse = createPrismicAPIQueryResponse([doc])

  navigateToPreviewResolverURL(ref, doc.id)
  cookie.set(prismic.cookie.preview, ref)

  server.use(
    createAPIQueryMockedRequest(pluginOptions, queryResponse, {
      ref,
      graphQuery: pluginOptions.graphQuery,
      q: `[${prismic.predicate.at('document.id', doc.id)}]`,
      page: undefined,
      pageSize: undefined,
    }),
  )

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const { result, waitFor } = renderHook(
    () => {
      const context = usePrismicPreviewContext()
      const resolve = usePrismicPreviewResolver(config)

      return { resolve, context }
    },
    { wrapper: PrismicPreviewProvider },
  )

  act(() => {
    result.current.resolve()
  })

  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState === PrismicPreviewState.RESOLVING,
    ),
  )
  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState === PrismicPreviewState.RESOLVED,
    ),
  )

  t.is(result.current.context[0].resolvedPath, `/${doc.id}`)
  t.is(result.current.context[0].error, undefined)
})

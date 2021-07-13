import test from 'ava'
import * as msw from 'msw'
import * as mswNode from 'msw/node'
import * as gatsbyPrismic from 'gatsby-source-prismic'
import * as prismic from '@prismicio/client'
import * as prismicH from '@prismicio/helpers'
import * as cookie from 'es-cookie'
import * as assert from 'assert'
import { renderHook, act, cleanup } from '@testing-library/react-hooks'
import { createNodeHelpers } from 'gatsby-node-helpers'
import md5 from 'tiny-hashes/md5'
import browserEnv from 'browser-env'

import { clearAllCookies } from './__testutils__/clearAllCookies'
import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { createPreviewRef } from './__testutils__/createPreviewRef'
import { createPrismicAPIQueryResponse } from './__testutils__/createPrismicAPIQueryResponse'
import { createTypePathsMockedRequest } from './__testutils__/createTypePathsMockedRequest'
import { isValidAccessToken } from './__testutils__/isValidAccessToken'
import { polyfillKy } from './__testutils__/polyfillKy'
import { resolveURL } from './__testutils__/resolveURL'

import {
  PrismicAPIDocumentNodeInput,
  PrismicPreviewProvider,
  usePrismicPreviewBootstrap,
  usePrismicPreviewContext,
  PluginOptions,
  PrismicRepositoryConfigs,
  PrismicPreviewState,
} from '../src'
import { onClientEntry } from '../src/gatsby-browser'
import { IS_PROXY } from '../src/constants'

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

test.serial('fails if not a preview session - cookie is not set', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const { result, waitFor } = renderHook(
    () => {
      const context = usePrismicPreviewContext()
      const bootstrap = usePrismicPreviewBootstrap(config)

      return { bootstrap, context }
    },
    { wrapper: PrismicPreviewProvider },
  )

  act(() => {
    result.current.bootstrap()
  })

  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState ===
        PrismicPreviewState.NOT_PREVIEW,
    ),
  )

  const state = result.current.context[0]

  t.is(state.previewState, PrismicPreviewState.NOT_PREVIEW)
})

test.serial(
  'fetches all repository documents and bootstraps context',
  async (t) => {
    const gatsbyContext = createGatsbyContext()
    const pluginOptions = createPluginOptions(t)
    const config = createRepositoryConfigs(pluginOptions)
    const queryResponsePage1 = createPrismicAPIQueryResponse(undefined, {
      page: 1,
      total_pages: 2,
    })
    const queryResponsePage2 = createPrismicAPIQueryResponse(undefined, {
      page: 2,
      total_pages: 2,
    })

    const ref = createPreviewRef(pluginOptions.repositoryName)
    cookie.set(prismic.cookie.preview, ref)

    const queryResponsePage1Nodes = queryResponsePage1.results.map((doc) => {
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
            // Sorry, this is an implementation detail but we need it pass tests.
            [IS_PROXY]: true,
          }),
        ),
      }
    })

    const queryResponsePage2Nodes = queryResponsePage2.results.map((doc) => {
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
            // Sorry, this is an implementation detail but we need it pass tests.
            [IS_PROXY]: true,
          }),
        ),
      }
    })

    // We're testing pagination functionality here. We need to make sure the hook
    // will fetch all documents in a repository, not just the first page of
    // results.

    server.use(
      msw.rest.get(
        resolveURL(pluginOptions.apiEndpoint, './documents/search'),
        (req, res, ctx) => {
          if (
            isValidAccessToken(pluginOptions.accessToken, req) &&
            req.url.searchParams.get('ref') === ref &&
            req.url.searchParams.get('lang') === pluginOptions.lang &&
            req.url.searchParams.get('graphQuery') ===
              pluginOptions.graphQuery &&
            req.url.searchParams.get('pageSize') === '100'
          ) {
            switch (req.url.searchParams.get('page')) {
              case '2':
                return res(ctx.json(queryResponsePage2))
              default:
                return res(ctx.json(queryResponsePage1))
            }
          } else {
            return res(
              ctx.status(403),
              ctx.json({
                error: '[MOCK ERROR]',
                oauth_initiate: 'oauth_initiate',
                oauth_token: 'oauth_token',
              }),
            )
          }
        },
      ),
    )

    server.use(
      createTypePathsMockedRequest('fa7e36097b060b84eb14d0df1009fa58.json', {
        type: gatsbyPrismic.PrismicSpecialType.Document,
        'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
      }),
    )

    // @ts-expect-error - Partial gatsbyContext provided
    await onClientEntry(gatsbyContext, pluginOptions)
    const { result, waitFor } = renderHook(
      () => {
        const context = usePrismicPreviewContext()
        const bootstrap = usePrismicPreviewBootstrap(config)

        return { bootstrap, context }
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
    t.true(result.current.context[0].error === undefined)
    t.true(result.current.context[0].isBootstrapped)
    t.deepEqual(result.current.context[0].nodes, {
      [queryResponsePage1Nodes[0].prismicId]: {
        __typename: 'PrismicPrefixType',
        ...queryResponsePage1Nodes[0],
      },
      [queryResponsePage1Nodes[1].prismicId]: {
        __typename: 'PrismicPrefixType',
        ...queryResponsePage1Nodes[1],
      },
      [queryResponsePage2Nodes[0].prismicId]: {
        __typename: 'PrismicPrefixType',
        ...queryResponsePage2Nodes[0],
      },
      [queryResponsePage2Nodes[1].prismicId]: {
        __typename: 'PrismicPrefixType',
        ...queryResponsePage2Nodes[1],
      },
    })
  },
)

test.serial('does nothing if already bootstrapped', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)
  const queryResponsePage1 = createPrismicAPIQueryResponse(undefined, {
    page: 1,
    total_pages: 2,
  })
  const queryResponsePage2 = createPrismicAPIQueryResponse(undefined, {
    page: 2,
    total_pages: 2,
  })

  const ref = createPreviewRef(pluginOptions.repositoryName)
  cookie.set(prismic.cookie.preview, ref)

  // We're testing pagination functionality here. We need to make sure the hook
  // will fetch all documents in a repository, not just the first page of
  // results.

  server.use(
    msw.rest.get(
      resolveURL(pluginOptions.apiEndpoint, './documents/search'),
      (req, res, ctx) => {
        if (
          isValidAccessToken(pluginOptions.accessToken, req) &&
          req.url.searchParams.get('ref') === ref &&
          req.url.searchParams.get('lang') === pluginOptions.lang &&
          req.url.searchParams.get('graphQuery') === pluginOptions.graphQuery &&
          req.url.searchParams.get('pageSize') === '100'
        ) {
          switch (req.url.searchParams.get('page')) {
            case '2':
              return res(ctx.json(queryResponsePage2))
            default:
              return res(ctx.json(queryResponsePage1))
          }
        } else {
          return res(ctx.status(401))
        }
      },
    ),
  )

  server.use(
    createTypePathsMockedRequest('d6c42f6728e21ab594cd600ff04e4913.json', {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
    }),
  )

  // @ts-expect-error - Partial gatsbyContext provided
  await onClientEntry(gatsbyContext, pluginOptions)
  const { result, waitFor } = renderHook(
    () => {
      const context = usePrismicPreviewContext()
      const bootstrap = usePrismicPreviewBootstrap(config)

      return { bootstrap, context }
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
  t.is(result.current.context[0].error, undefined)

  // Bootstrap the second time.
  act(() => {
    result.current.bootstrap()
  })

  t.is(result.current.context[0].previewState, PrismicPreviewState.ACTIVE)
})

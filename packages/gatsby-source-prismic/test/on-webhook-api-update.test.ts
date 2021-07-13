import test from 'ava'
import * as sinon from 'sinon'
import * as mswn from 'msw/node'
import * as prismic from '@prismicio/client'

import { createAPIQueryMockedRequest } from './__testutils__/createAPIQueryMockedRequest'
import { createAPIRepositoryMockedRequest } from './__testutils__/createAPIRepositoryMockedRequest'
import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { createPrismicAPIDocument } from './__testutils__/createPrismicAPIDocument'
import { createPrismicAPIQueryResponse } from './__testutils__/createPrismicAPIQueryResponse'
import { createWebhookAPIUpdateDocAddition } from './__testutils__/createWebhookAPIUpdateDocAddition'
import { createWebhookAPIUpdateDocDeletion } from './__testutils__/createWebhookAPIUpdateDocDeletion'
import { createWebhookAPIUpdateReleaseDocAddition } from './__testutils__/createWebhookAPIUpdateReleaseDocAddition'
import { createWebhookAPIUpdateReleaseDocDeletion } from './__testutils__/createWebhookAPIUpdateReleaseDocDeletion'

import { sourceNodes } from '../src/source-nodes'

const server = mswn.setupServer()
test.before(() => server.listen({ onUnhandledRequest: 'error' }))
test.after(() => server.close())

test('reports received message', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const queryResponse = createPrismicAPIQueryResponse()
  const webhookBody = createWebhookAPIUpdateDocAddition(
    pluginOptions,
    queryResponse.results,
  )

  gatsbyContext.webhookBody = webhookBody

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse))

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  t.true(
    (gatsbyContext.reporter.info as sinon.SinonStub).calledWith(
      sinon.match(/received/i),
    ),
  )
})

test('doc addition creates/updates node', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const queryResponse = createPrismicAPIQueryResponse()
  const webhookBody = createWebhookAPIUpdateDocAddition(
    pluginOptions,
    queryResponse.results,
  )

  gatsbyContext.webhookBody = webhookBody

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse))

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  t.true(
    webhookBody.documents.every((docId) =>
      (gatsbyContext.actions.createNode as sinon.SinonStub).calledWith(
        sinon.match.has('prismicId', docId),
      ),
    ),
  )
})

test('doc deletion deletes node', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  // The query response only includes the first document of `docs`.
  // But the webhook body includes both docs.
  // This signals that the second doc has been deleted.
  const docs = [createPrismicAPIDocument(), createPrismicAPIDocument()]
  const preWebhookQueryResponse = createPrismicAPIQueryResponse(docs)
  const postWebhookQueryResponse = createPrismicAPIQueryResponse(
    docs.slice(0, 1),
  )
  const webhookBody = createWebhookAPIUpdateDocDeletion(pluginOptions, docs)

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(
    createAPIQueryMockedRequest(pluginOptions, preWebhookQueryResponse),
  )

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  gatsbyContext.webhookBody = webhookBody

  server.use(
    createAPIQueryMockedRequest(pluginOptions, postWebhookQueryResponse, {
      q: `[${prismic.predicate.in('document.id', webhookBody.documents)}]`,
    }),
  )

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  for (const doc of docs.slice(1)) {
    t.true(
      (gatsbyContext.actions.deleteNode as sinon.SinonStub).calledWith(
        sinon.match.has('prismicId', doc.id),
      ),
    )
  }
})

test('release doc addition creates/updates node if plugin options release ID matches', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const queryResponse = createPrismicAPIQueryResponse()
  const webhookBody = createWebhookAPIUpdateReleaseDocAddition(
    pluginOptions,
    queryResponse.results,
  )
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const webhookBodyReleaseUpdate = webhookBody.releases.update![0]

  gatsbyContext.webhookBody = webhookBody
  pluginOptions.releaseID = webhookBodyReleaseUpdate.id

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(
    createAPIQueryMockedRequest(pluginOptions, queryResponse, {
      ref: webhookBodyReleaseUpdate.ref,
      q: `[${prismic.predicate.in(
        'document.id',
        webhookBodyReleaseUpdate.documents,
      )}]`,
    }),
  )

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  for (const docId of webhookBodyReleaseUpdate.documents) {
    t.true(
      (gatsbyContext.actions.createNode as sinon.SinonStub).calledWith(
        sinon.match.has('prismicId', docId),
      ),
    )
  }
})

test('release doc addition does nothing if plugin options release ID does not match', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const queryResponse = createPrismicAPIQueryResponse([])
  const webhookBody = createWebhookAPIUpdateReleaseDocAddition(
    pluginOptions,
    queryResponse.results,
  )

  gatsbyContext.webhookBody = webhookBody

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(
    createAPIQueryMockedRequest(pluginOptions, queryResponse, {
      q: `[${prismic.predicate.in('document.id', [])}]`,
    }),
  )

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  t.true((gatsbyContext.actions.createNode as sinon.SinonStub).notCalled)
})

test('release doc deletion deletes node if plugin options release ID matches', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  // The query response only includes the first document of `docs`.
  // But the webhook body includes both docs.
  // This signals that the second doc has been deleted.
  const docs = [createPrismicAPIDocument(), createPrismicAPIDocument()]
  const preWebhookQueryResponse = createPrismicAPIQueryResponse(docs)
  const postWebhookQueryResponse = createPrismicAPIQueryResponse(
    docs.slice(0, 1),
  )
  const webhookBody = createWebhookAPIUpdateReleaseDocDeletion(
    pluginOptions,
    docs,
  )
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const webhookBodyReleaseDeletion = webhookBody.releases.deletion![0]

  pluginOptions.releaseID = webhookBodyReleaseDeletion.id

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(
    createAPIQueryMockedRequest(pluginOptions, preWebhookQueryResponse, {
      ref: webhookBodyReleaseDeletion.ref,
    }),
  )

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  gatsbyContext.webhookBody = webhookBody

  server.use(
    createAPIQueryMockedRequest(pluginOptions, postWebhookQueryResponse, {
      ref: webhookBodyReleaseDeletion.ref,
      q: `[${prismic.predicate.in(
        'document.id',
        webhookBodyReleaseDeletion.documents,
      )}]`,
    }),
  )

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  for (const doc of docs.slice(1)) {
    t.true(
      (gatsbyContext.actions.deleteNode as sinon.SinonStub).calledWith(
        sinon.match.has('prismicId', doc.id),
      ),
    )
  }
})

test('release doc deletion does nothing if plugin options release ID does not match', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const queryResponse = createPrismicAPIQueryResponse([])
  const webhookBody = createWebhookAPIUpdateReleaseDocDeletion(
    pluginOptions,
    queryResponse.results,
  )

  gatsbyContext.webhookBody = webhookBody

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse))

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  t.true((gatsbyContext.actions.deleteNode as sinon.SinonStub).notCalled)
})

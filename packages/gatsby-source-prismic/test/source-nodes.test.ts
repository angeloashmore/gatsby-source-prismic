import test from 'ava'
import * as sinon from 'sinon'
import * as mswNode from 'msw/node'
import * as prismicT from '@prismicio/types'

import { createAPIQueryMockedRequest } from './__testutils__/createAPIQueryMockedRequest'
import { createAPIRepositoryMockedRequest } from './__testutils__/createAPIRepositoryMockedRequest'
import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { createPrismicAPIDocument } from './__testutils__/createPrismicAPIDocument'
import { createPrismicAPIQueryResponse } from './__testutils__/createPrismicAPIQueryResponse'

import { createSchemaCustomization, sourceNodes } from '../src/gatsby-node'

const server = mswNode.setupServer()
test.before(() => server.listen({ onUnhandledRequest: 'error' }))
test.after(() => server.close())

test('creates nodes', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const queryResponse = createPrismicAPIQueryResponse()

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse))

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  for (const doc of queryResponse.results) {
    t.true(
      (gatsbyContext.actions.createNode as sinon.SinonStub).calledWith(
        sinon.match({ prismicId: doc.id }),
      ),
    )
  }
})

test('uses apiEndpoint plugin option if provided', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const queryResponse = createPrismicAPIQueryResponse()

  pluginOptions.apiEndpoint = 'https://example.com'

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse))

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  t.pass()
})

test('embed fields are normalized to inferred nodes', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const doc = createPrismicAPIDocument({
    data: {
      embed: {
        embed_url: 'https://youtube.com/1',
      } as prismicT.EmbedField,
      group: [
        {
          embed: {
            embed_url: 'https://youtube.com/2',
          } as prismicT.EmbedField,
        },
      ],
      slices: [
        {
          slice_type: 'embed',
          slice_label: '',
          primary: {
            embed: {
              embed_url: 'https://youtube.com/3',
            } as prismicT.EmbedField,
          },
          items: [
            {
              embed: {
                embed_url: 'https://youtube.com/4',
              } as prismicT.EmbedField,
            },
          ],
        },
      ],
    },
  })
  const queryResponse = createPrismicAPIQueryResponse([doc])

  pluginOptions.schemas = {
    type: {
      Main: {
        embed: {
          type: prismicT.CustomTypeModelFieldType.Embed,
          config: { label: 'Embed' },
        },
        group: {
          type: prismicT.CustomTypeModelFieldType.Group,
          config: {
            label: 'Group',
            fields: {
              embed: {
                type: prismicT.CustomTypeModelFieldType.Embed,
                config: { label: 'Embed' },
              },
            },
          },
        },
        slices: {
          type: prismicT.CustomTypeModelFieldType.Slices,
          fieldset: 'Slice zone',
          config: {
            labels: {},
            choices: {
              embed: {
                type: prismicT.CustomTypeModelSliceType.Slice,
                fieldset: 'Slice zone',
                description: '',
                icon: '',
                display: prismicT.CustomTypeModelSliceDisplay.List,
                repeat: {
                  embed: {
                    type: prismicT.CustomTypeModelFieldType.Embed,
                    config: { label: 'Embed' },
                  },
                },
                'non-repeat': {
                  embed: {
                    type: prismicT.CustomTypeModelFieldType.Embed,
                    config: { label: 'Embed' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse))

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  const createNodeStub = gatsbyContext.actions.createNode as sinon.SinonStub

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        prismicId: doc.id,
        data: {
          embed: sinon.match.string,
          group: [{ embed: sinon.match.string }],
          slices: [
            sinon.match({
              slice_type: 'embed',
              primary: { embed: sinon.match.string },
              items: [{ embed: sinon.match.string }],
            }),
          ],
        },
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        embed_url: doc.data.embed.embed_url,
        internal: sinon.match({
          type: 'PrismicPrefixEmbedType',
        }),
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        embed_url: doc.data.group[0].embed.embed_url,
        internal: sinon.match({
          type: 'PrismicPrefixEmbedType',
        }),
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        embed_url: doc.data.slices[0].primary.embed.embed_url,
        internal: sinon.match({
          type: 'PrismicPrefixEmbedType',
        }),
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        embed_url: doc.data.slices[0].items[0].embed.embed_url,
        internal: sinon.match({
          type: 'PrismicPrefixEmbedType',
        }),
      }),
    ),
  )
})

test('integration fields are normalized to inferred nodes', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const docWithIntegrationId = createPrismicAPIDocument({
    data: {
      // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
      integration: {
        id: 1,
        foo: 'bar',
      },
      group: [
        {
          // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
          integration: {
            id: 2,
            foo: 'bar',
          },
        },
      ],
      slices: [
        {
          // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
          slice_type: 'integration',
          primary: {
            integration: {
              id: 3,
              foo: 'bar',
            },
          },
          items: [
            {
              integration: {
                id: 4,
                foo: 'bar',
              },
            },
          ],
        },
      ],
    },
    type: 'foo',
  })
  const docWithoutIntegrationId = createPrismicAPIDocument({
    data: {
      // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
      integration: {
        foo: 'bar',
      },
    },
    type: 'foo',
  })
  const queryResponse = createPrismicAPIQueryResponse([
    docWithIntegrationId,
    docWithoutIntegrationId,
  ])

  pluginOptions.schemas = {
    foo: {
      Main: {
        integration: {
          type: prismicT.CustomTypeModelFieldType.IntegrationFields,
          config: { label: 'Integration', catalog: 'catalog' },
        },
        group: {
          type: prismicT.CustomTypeModelFieldType.Group,
          config: {
            label: 'Group',
            fields: {
              integration: {
                type: prismicT.CustomTypeModelFieldType.IntegrationFields,
                config: { label: 'Integration', catalog: 'catalog' },
              },
            },
          },
        },
        slices: {
          type: prismicT.CustomTypeModelFieldType.Slices,
          fieldset: 'Slice zone',
          config: {
            labels: {},
            choices: {
              integration: {
                type: prismicT.CustomTypeModelSliceType.Slice,
                fieldset: 'Slice zone',
                description: '',
                icon: '',
                display: prismicT.CustomTypeModelSliceDisplay.List,
                repeat: {
                  integration: {
                    type: prismicT.CustomTypeModelFieldType.IntegrationFields,
                    config: { label: 'Integration', catalog: 'catalog' },
                  },
                },
                'non-repeat': {
                  integration: {
                    type: prismicT.CustomTypeModelFieldType.IntegrationFields,
                    config: { label: 'Integration', catalog: 'catalog' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }

  server.use(createAPIRepositoryMockedRequest(pluginOptions))
  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse))

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  // @ts-expect-error - Partial gatsbyContext provided
  await sourceNodes(gatsbyContext, pluginOptions)

  const createNodeStub = gatsbyContext.actions.createNode as sinon.SinonStub

  for (const doc of queryResponse.results) {
    t.true(
      createNodeStub.calledWith(
        sinon.match({
          prismicId: doc.id,
          data: sinon.match({
            integration: sinon.match.string,
          }),
        }),
      ),
    )
  }

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        prismicId: docWithIntegrationId.id,
        data: sinon.match({
          integration: sinon.match.string,
          group: [{ integration: sinon.match.string }],
          slices: [
            sinon.match({
              slice_type: 'integration',
              primary: { integration: sinon.match.string },
              items: [{ integration: sinon.match.string }],
            }),
          ],
        }),
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
        prismicId: docWithIntegrationId.data.integration.id,
        internal: sinon.match({
          type: 'PrismicPrefixFooDataIntegrationIntegrationType',
        }),
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
        prismicId: docWithIntegrationId.data.group[0].integration.id,
        internal: sinon.match({
          type: 'PrismicPrefixFooDataGroupIntegrationIntegrationType',
        }),
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
        prismicId: docWithIntegrationId.data.slices[0].primary.integration.id,
        internal: sinon.match({
          type:
            'PrismicPrefixFooDataSlicesIntegrationPrimaryIntegrationIntegrationType',
        }),
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
        prismicId: docWithIntegrationId.data.slices[0].items[0].integration.id,
        internal: sinon.match({
          type:
            'PrismicPrefixFooDataSlicesIntegrationItemsIntegrationIntegrationType',
        }),
      }),
    ),
  )

  t.true(
    createNodeStub.calledWith(
      sinon.match({
        prismicId: gatsbyContext.createContentDigest?.(
          // @ts-expect-error - Integration fields are not supported yet in @prismicio/types
          docWithoutIntegrationId.data.integration,
        ),
        internal: sinon.match({
          type: 'PrismicPrefixFooDataIntegrationIntegrationType',
        }),
      }),
    ),
  )
})

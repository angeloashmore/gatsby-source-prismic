import test from 'ava'
import * as sinon from 'sinon'
import * as prismicT from '@prismicio/types'

import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'

import { createSchemaCustomization } from '../src/gatsby-node'

test('uses inferred type with link extension', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        integration: {
          type: prismicT.CustomTypeModelFieldType.IntegrationFields,
          config: { label: 'Integration', catalog: 'catalog' },
        },
      },
    },
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: sinon.match({
        name: 'PrismicPrefixFooDataType',
        fields: {
          integration: sinon.match({
            type: 'PrismicPrefixFooDataIntegrationIntegrationType',
            extensions: { link: {} },
          }),
        },
      }),
    }),
  )
})

test('creates inferred type using path', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        integration: {
          type: prismicT.CustomTypeModelFieldType.IntegrationFields,
          config: { label: 'Integration', catalog: 'catalog' },
        },
      },
    },
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: sinon.match({
        name: 'PrismicPrefixFooDataIntegrationIntegrationType',
        interfaces: ['Node'],
        extensions: { infer: true },
      }),
    }),
  )
})

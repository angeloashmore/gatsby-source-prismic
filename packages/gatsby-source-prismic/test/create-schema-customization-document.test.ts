import test from 'ava'
import * as sinon from 'sinon'
import * as prismicT from '@prismicio/types'

import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createNodeHelpers } from './__testutils__/createNodeHelpers'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { createPrismicAPIDocument } from './__testutils__/createPrismicAPIDocument'
import { findCreateTypesCall } from './__testutils__/findCreateTypesCall'

import { createSchemaCustomization } from '../src/gatsby-node'

test('includes base fields', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {},
    },
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: {
        name: 'PrismicPrefixFoo',
        fields: {
          prismicId: 'ID!',
          alternate_languages: '[PrismicPrefixAlternateLanguageType!]!',
          first_publication_date: {
            type: 'Date!',
            extensions: { dateformat: {} },
          },
          href: 'String!',
          lang: 'String!',
          last_publication_date: {
            type: 'Date!',
            extensions: { dateformat: {} },
          },
          tags: '[String!]!',
          type: 'String!',
          url: {
            type: 'String',
            resolve: sinon.match.func,
          },
          _previewable: {
            type: 'ID!',
            resolve: sinon.match.func,
          },
        },
        interfaces: ['Node'],
        extensions: { infer: false },
      },
    }),
  )
})

test('includes UID field if included in the schema', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        uid: {
          type: prismicT.CustomTypeModelFieldType.UID,
          config: { label: 'UID' },
        },
        foo: {
          type: prismicT.CustomTypeModelFieldType.Text,
          config: { label: 'Foo' },
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
        name: 'PrismicPrefixFoo',
        fields: sinon.match({
          uid: 'String!',
        }),
      }),
    }),
  )
})

test('includes data fields if the schema contains fields', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        foo: {
          type: prismicT.CustomTypeModelFieldType.Text,
          config: { label: 'Foo' },
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
        name: 'PrismicPrefixFoo',
        fields: sinon.match({
          data: 'PrismicPrefixFooDataType',
          dataRaw: {
            type: 'JSON!',
            resolve: sinon.match.func,
          },
        }),
      }),
    }),
  )
})

test('dataRaw field resolves to raw data object', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        foo: {
          type: prismicT.CustomTypeModelFieldType.Text,
          config: { label: 'Foo' },
        },
      },
    },
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  const call = findCreateTypesCall(
    'PrismicPrefixFoo',
    gatsbyContext.actions.createTypes as sinon.SinonStub,
  )
  const doc = { id: 'id', data: { foo: 'bar' } }
  const nodeHelpers = createNodeHelpers(gatsbyContext, pluginOptions)
  const node = nodeHelpers.createNodeFactory('foo')(doc)
  const resolver = call.config.fields.dataRaw.resolve
  const res = await resolver(node)

  t.true(res === doc.data)
})

test('url field resolves using linkResolver', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {},
    },
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  const call = findCreateTypesCall(
    'PrismicPrefixFoo',
    gatsbyContext.actions.createTypes as sinon.SinonStub,
  )
  const nodeHelpers = createNodeHelpers(gatsbyContext, pluginOptions)
  const document = createPrismicAPIDocument()
  const node = nodeHelpers.createNodeFactory(document.type)(document)
  const resolver = call.config.fields.url.resolve

  t.true(resolver(node) === 'linkResolver')
})

test('_previewable field resolves to Prismic ID', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {},
    },
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  const call = findCreateTypesCall(
    'PrismicPrefixFoo',
    gatsbyContext.actions.createTypes as sinon.SinonStub,
  )
  const resolver = call.config.fields._previewable.resolve
  const nodeHelpers = createNodeHelpers(gatsbyContext, pluginOptions)
  const node = nodeHelpers.createNodeFactory('foo')({ id: 'id' })

  t.true(resolver(node) === node.prismicId)
})

test('data field type includes all data fields', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        uid: {
          type: prismicT.CustomTypeModelFieldType.UID,
          config: { label: 'UID' },
        },
        boolean: {
          type: prismicT.CustomTypeModelFieldType.Boolean,
          config: { label: 'Boolean' },
        },
        color: {
          type: prismicT.CustomTypeModelFieldType.Color,
          config: { label: 'Color' },
        },
        date: {
          type: prismicT.CustomTypeModelFieldType.Date,
          config: { label: 'Date' },
        },
        embed: {
          type: prismicT.CustomTypeModelFieldType.Embed,
          config: { label: 'Embed' },
        },
        geo_point: {
          type: prismicT.CustomTypeModelFieldType.GeoPoint,
          config: { label: 'GeoPoint' },
        },
        image: {
          type: prismicT.CustomTypeModelFieldType.Image,
          config: { label: 'Image', constraint: {}, thumbnails: [] },
        },
        link: {
          type: prismicT.CustomTypeModelFieldType.Link,
          config: {
            label: 'Link',
          },
        },
        number: {
          type: prismicT.CustomTypeModelFieldType.Number,
          config: { label: 'Number' },
        },
        select: {
          type: prismicT.CustomTypeModelFieldType.Select,
          config: { label: 'Select', options: ['Option 1'] },
        },
        structured_text: {
          type: prismicT.CustomTypeModelFieldType.StructuredText,
          config: { label: 'StructuredText', multi: '' },
        },
        text: {
          type: prismicT.CustomTypeModelFieldType.Text,
          config: { label: 'Text' },
        },
        timestamp: {
          type: prismicT.CustomTypeModelFieldType.Timestamp,
          config: { label: 'Timestamp' },
        },
        group: {
          type: prismicT.CustomTypeModelFieldType.Group,
          config: {
            label: 'Group',
            fields: {
              foo: {
                type: prismicT.CustomTypeModelFieldType.Text,
                config: { label: 'Foo' },
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
              foo: {
                type: prismicT.CustomTypeModelSliceType.Slice,
                icon: '',
                display: prismicT.CustomTypeModelSliceDisplay.List,
                fieldset: 'Slice zone',
                description: '',
                repeat: {},
                'non-repeat': {},
              },
            },
          },
        },
      },
    },
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: {
        name: 'PrismicPrefixFooDataType',
        fields: {
          boolean: 'Boolean',
          color: 'String',
          date: { type: 'Date', extensions: { dateformat: {} } },
          embed: { type: 'PrismicPrefixEmbedType', extensions: { link: {} } },
          geo_point: 'PrismicGeoPointType',
          group: '[PrismicPrefixFooDataGroup]',
          image: 'PrismicPrefixFooDataImageImageType',
          link: 'PrismicPrefixLinkType',
          number: 'Float',
          select: 'String',
          slices: '[PrismicPrefixFooDataSlicesSlicesType]',
          structured_text: 'PrismicPrefixStructuredTextType',
          text: 'String',
          timestamp: { type: 'Date', extensions: { dateformat: {} } },
        },
      },
    }),
  )
})

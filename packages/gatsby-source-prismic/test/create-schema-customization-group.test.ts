import test from 'ava'
import * as sinon from 'sinon'
import * as prismicT from '@prismicio/types'

import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'

import { createSchemaCustomization } from '../src/gatsby-node'

test('creates types with each field', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        group: {
          type: prismicT.CustomTypeModelFieldType.Group,
          config: {
            label: 'Group',
            fields: {
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
                config: { label: 'Link' },
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
      config: sinon.match({
        name: 'PrismicPrefixFooDataGroup',
        fields: {
          boolean: 'Boolean',
          color: 'String',
          date: { type: 'Date', extensions: { dateformat: {} } },
          embed: { type: 'PrismicPrefixEmbedType', extensions: { link: {} } },
          geo_point: 'PrismicGeoPointType',
          image: 'PrismicPrefixFooDataGroupImageImageType',
          link: 'PrismicPrefixLinkType',
          number: 'Float',
          select: 'String',
          structured_text: 'PrismicPrefixStructuredTextType',
          text: 'String',
          timestamp: { type: 'Date', extensions: { dateformat: {} } },
        },
      }),
    }),
  )
})

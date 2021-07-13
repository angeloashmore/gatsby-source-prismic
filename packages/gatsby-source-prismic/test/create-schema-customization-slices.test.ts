import test from 'ava'
import * as sinon from 'sinon'
import * as prismicT from '@prismicio/types'

import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { findCreateTypesCall } from './__testutils__/findCreateTypesCall'

import { createSchemaCustomization } from '../src/gatsby-node'

test('creates types for each slice choice', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        slices: {
          type: prismicT.CustomTypeModelFieldType.Slices,
          fieldset: 'Slice zone',
          config: {
            labels: {},
            choices: {
              foo: {
                type: prismicT.CustomTypeModelSliceType.Slice,
                fieldset: 'Slice zone',
                description: '',
                icon: '',
                display: prismicT.CustomTypeModelSliceDisplay.List,
                repeat: {
                  repeat_text: {
                    type: prismicT.CustomTypeModelFieldType.Text,
                    config: { label: 'Text' },
                  },
                },
                'non-repeat': {
                  non_repeat_text: {
                    type: prismicT.CustomTypeModelFieldType.Text,
                    config: { label: 'Text' },
                  },
                },
              },
              bar: {
                type: prismicT.CustomTypeModelSliceType.Slice,
                fieldset: 'Slice zone',
                description: '',
                icon: '',
                display: prismicT.CustomTypeModelSliceDisplay.List,
                repeat: {
                  repeat_text: {
                    type: prismicT.CustomTypeModelFieldType.Text,
                    config: { label: 'Text' },
                  },
                },
                'non-repeat': {
                  non_repeat_text: {
                    type: prismicT.CustomTypeModelFieldType.Text,
                    config: { label: 'Text' },
                  },
                },
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
      kind: 'UNION',
      config: sinon.match({
        name: 'PrismicPrefixFooDataSlicesSlicesType',
        types: [
          'PrismicPrefixFooDataSlicesBar',
          'PrismicPrefixFooDataSlicesFoo',
        ],
        resolveType: sinon.match.func,
      }),
    }),
  )

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: sinon.match({
        name: 'PrismicPrefixFooDataSlicesFoo',
        fields: {
          items: '[PrismicPrefixFooDataSlicesFooItem]',
          primary: 'PrismicPrefixFooDataSlicesFooPrimary',
          slice_type: 'String!',
          slice_label: 'String',
          id: sinon.match({
            type: 'ID!',
            resolve: sinon.match.func,
          }),
        },
        interfaces: ['PrismicSliceType'],
        extensions: { infer: false },
      }),
    }),
  )

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: sinon.match({
        name: 'PrismicPrefixFooDataSlicesFooPrimary',
        fields: {
          non_repeat_text: 'String',
        },
      }),
    }),
  )

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: sinon.match({
        name: 'PrismicPrefixFooDataSlicesFooItem',
        fields: {
          repeat_text: 'String',
        },
      }),
    }),
  )

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: sinon.match({
        name: 'PrismicPrefixFooDataSlicesBar',
        fields: {
          items: '[PrismicPrefixFooDataSlicesBarItem]',
          primary: 'PrismicPrefixFooDataSlicesBarPrimary',
          slice_type: 'String!',
          slice_label: 'String',
          id: sinon.match({
            type: 'ID!',
            resolve: sinon.match.func,
          }),
        },
        interfaces: ['PrismicSliceType'],
        extensions: { infer: false },
      }),
    }),
  )

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: sinon.match({
        name: 'PrismicPrefixFooDataSlicesBarPrimary',
        fields: {
          non_repeat_text: 'String',
        },
      }),
    }),
  )

  t.true(
    (gatsbyContext.actions.createTypes as sinon.SinonStub).calledWith({
      kind: 'OBJECT',
      config: sinon.match({
        name: 'PrismicPrefixFooDataSlicesBarItem',
        fields: {
          repeat_text: 'String',
        },
      }),
    }),
  )
})

test('id field resolves to a unique id', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    foo: {
      Main: {
        slices: {
          type: prismicT.CustomTypeModelFieldType.Slices,
          fieldset: 'Slice zone',
          config: {
            labels: {},
            choices: {
              foo: {
                type: prismicT.CustomTypeModelSliceType.Slice,
                fieldset: 'Slice zone',
                description: '',
                icon: '',
                display: prismicT.CustomTypeModelSliceDisplay.List,
                repeat: {
                  repeat_text: {
                    type: prismicT.CustomTypeModelFieldType.Text,
                    config: { label: 'Text' },
                  },
                },
                'non-repeat': {
                  non_repeat_text: {
                    type: prismicT.CustomTypeModelFieldType.Text,
                    config: { label: 'Text' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  const call = findCreateTypesCall(
    'PrismicPrefixFooDataSlicesFoo',
    gatsbyContext.actions.createTypes as sinon.SinonStub,
  )
  const field = {
    primary: {
      non_repeat_text: [{ type: 'paragraph', text: 'Rich Text', spans: [] }],
    },
    items: [],
  }
  const resolver = call.config.fields.id.resolve
  const res = await resolver(field)

  t.true(res === 'Prismic prefix foo data slices foo createContentDigest')
})

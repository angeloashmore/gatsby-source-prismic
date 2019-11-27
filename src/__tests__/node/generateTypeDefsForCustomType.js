import * as R from 'ramda'

import {
  generateTypeDefsForCustomType,
  generateTypeDefForLinkType,
  generateTypeDefsForImageType,
} from '../../node/generateTypeDefsForCustomType'

const customTypeId = 'custom_type'

const schema = {
  buildObjectType: jest
    .fn()
    .mockImplementation(config => ({ kind: 'OBJECT', config })),
  buildUnionType: jest
    .fn()
    .mockImplementation(config => ({ kind: 'UNION', config })),
}

const context = {
  gatsbyContext: {
    schema,
    createNodeId: jest.fn().mockReturnValue('result of createNodeId'),
  },
}

afterEach(() => {
  schema.buildObjectType.mockClear()
  schema.buildUnionType.mockClear()
})

describe('generateTypeDefsForCustomType', () => {
  describe('typeDefs', () => {
    const { typeDefs } = generateTypeDefsForCustomType(
      customTypeId,
      { Main: { key: { type: 'Text' } } },
      context,
    )

    test('is a list of type definitions', () => {
      expect(Array.isArray(typeDefs)).toBe(true)
    })

    test('Color type returns String', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'Select' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key).toEqual('String')
    })

    test('Select type returns String', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'Select' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key).toEqual('String')
    })

    test('Text type returns String', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'Text' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key).toEqual('String')
    })

    test('UID type returns String', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'UID' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key.type).toEqual('String')
    })

    test('StructuredText type returns PrismicStructuredTextType', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'StructuredText' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key).toEqual('PrismicStructuredTextType')
    })

    test('Number type returns Float', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'Number' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key).toEqual('Float')
    })

    test('Date type returns Date with formatdate extension', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'Date' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key.type).toBe('Date')
      expect(typeDefs[0].config.fields.key.extensions).toEqual({
        dateformat: {},
      })
    })

    test('Timestamp type returns Date with formatdate extension', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'Timestamp' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key.type).toBe('Date')
      expect(typeDefs[0].config.fields.key.extensions).toEqual({
        dateformat: {},
      })
    })

    test('GeoPoint type returns PrismicGeoPointType', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'GeoPoint' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key).toEqual('PrismicGeoPointType')
    })

    test('Embed type returns PrismicEmbedType', () => {
      const { typeDefs } = generateTypeDefsForCustomType(
        customTypeId,
        { Main: { key: { type: 'Embed' } } },
        context,
      )

      expect(typeDefs[0].config.fields.key).toEqual('PrismicEmbedType')
    })

    describe('Group', () => {
      test('Group type returns namespaced GroupType', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          { Main: { key: { type: 'Group', config: { fields: {} } } } },
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeDataType'),
          typeDefs,
        )

        expect(typeDef.config.fields.key).toBe(
          '[PrismicCustomTypeKeyGroupType]',
        )
      })

      test('namespaced GroupType returns field types', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          {
            Main: {
              key: {
                type: 'Group',
                config: { fields: { text: { type: 'Text' } } },
              },
            },
          },
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeKeyGroupType'),
          typeDefs,
        )

        expect(typeDef.config.fields).toMatchObject({
          text: 'String',
        })
      })
    })

    describe('Image', () => {
      test('Image type returns PrismicImageType', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          { Main: { key: { type: 'Image' } } },
          context,
        )

        expect(typeDefs[0].config.fields.key).toBe('PrismicImageType')
      })
    })

    describe('Link', () => {
      test('Link type returns PrismicLinkType', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          { Main: { key: { type: 'Link' } } },
          context,
        )

        expect(typeDefs[0].config.fields.key).toMatchObject({
          type: 'PrismicLinkType',
        })
      })

      test('PrismicLinkType resolver gets document node by ID', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          { Main: { key: { type: 'Link' } } },
          context,
        )

        const resolver = typeDefs[0].config.fields.key.resolve
        const getNodeById = jest.fn()

        resolver(
          { link: { id: 'id', type: 'custom_type' } },
          undefined,
          { nodeModel: { getNodeById } },
          { path: { key: 'link' } },
        )

        expect(getNodeById).toHaveBeenCalledWith({
          id: 'result of createNodeId',
          type: 'PrismicCustomType',
        })
      })
    })

    describe('Slice', () => {
      const customTypeJson = {
        Main: {
          body: {
            type: 'Slices',
            config: {
              choices: {
                slice: {
                  type: 'Slice',
                  'non-repeat': { key: { type: 'Text' } },
                  repeat: { key: { type: 'Text' } },
                },
              },
            },
          },
        },
      }

      test('Slice type returns namespaced PrimaryType for primary field', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          customTypeJson,
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeBodySlice'),
          typeDefs,
        )

        expect(typeDef.config.fields.primary).toBe(
          'PrismicCustomTypeBodySlicePrimaryType',
        )
      })

      test('Slice type returns namespaced ItemType for items field', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          customTypeJson,
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeBodySlice'),
          typeDefs,
        )

        expect(typeDef.config.fields.items).toBe(
          '[PrismicCustomTypeBodySliceItemType]',
        )
      })

      test('namespaced PrimaryType returns types', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          customTypeJson,
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeBodySlicePrimaryType'),
          typeDefs,
        )

        expect(typeDef.config.fields.key).toBe('String')
      })

      test('namespaced ItemType returns types', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          customTypeJson,
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeBodySliceItemType'),
          typeDefs,
        )

        expect(typeDef.config.fields.key).toBe('String')
      })

      test('namespaced SliceType implements Node interface', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          customTypeJson,
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeBodySlice'),
          typeDefs,
        )

        expect(typeDef.config.interfaces).toContain('Node')
      })
    })

    describe('Slices', () => {
      const customTypeJson = {
        Main: {
          body: {
            type: 'Slices',
            config: {
              choices: {
                slice: {
                  type: 'Slice',
                  'non-repeat': { key: { type: 'Text' } },
                  repeat: { key: { type: 'Text' } },
                },
              },
            },
          },
        },
      }

      test('Slices type returns namespaced SlicesType', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          customTypeJson,
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeDataType'),
          typeDefs,
        )

        expect(typeDef.config.fields.body).toMatchObject({
          type: '[PrismicCustomTypeBodySlicesType]',
        })
      })

      test('namespaced SlicesType resolver gets slice node by ID', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          customTypeJson,
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomTypeDataType'),
          typeDefs,
        )

        const resolver = typeDef.config.fields.body.resolve
        const getNodesByIds = jest.fn()

        resolver(
          { body: ['id1', 'id2'] },
          undefined,
          { nodeModel: { getNodesByIds } },
          { path: { key: 'body' } },
        )

        expect(getNodesByIds).toHaveBeenCalledWith({
          ids: ['id1', 'id2'],
        })
      })
    })

    describe('Document', () => {
      test('root document returns namespaced document type', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          { Main: { uid: { type: 'UID' } } },
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomType'),
          typeDefs,
        )

        expect(typeDef).toBeDefined()
      })

      test('namespaced document type implements PrismicDocument and Node interfaces', () => {
        const { typeDefs } = generateTypeDefsForCustomType(
          customTypeId,
          { Main: { uid: { type: 'UID' } } },
          context,
        )

        const typeDef = R.find(
          R.pathEq(['config', 'name'], 'PrismicCustomType'),
          typeDefs,
        )

        expect(typeDef.config.interfaces).toContain('Node')
        expect(typeDef.config.interfaces).toContain('PrismicDocument')
      })
    })
  })

  describe('typePaths', () => {
    const { typePaths } = generateTypeDefsForCustomType(
      customTypeId,
      { Main: { key: { type: 'Text' } } },
      context,
    )

    test('is a list of type paths', () => {
      expect(Array.isArray(typePaths)).toBe(true)
    })

    test('returns paths to types', () => {
      const { typePaths } = generateTypeDefsForCustomType(
        customTypeId,
        {
          Main: {
            uid: { type: 'UID' },
            text: { type: 'Text' },
            body: {
              type: 'Slices',
              config: {
                choices: {
                  slice: {
                    type: 'Slice',
                    'non-repeat': { key: { type: 'Text' } },
                    repeat: { key: { type: 'Text' } },
                  },
                },
              },
            },
            image: {
              type: 'Image',
              config: {
                thumbnails: [{ name: 'thumb', width: 100, height: 100 }],
              },
            },
          },
        },
        context,
      )

      expect(typePaths).toEqual([
        { path: ['custom_type', 'uid'], type: 'String' },
        { path: ['custom_type', 'data', 'text'], type: 'String' },
        {
          path: ['custom_type', 'data', 'body', 'slice', 'primary', 'key'],
          type: 'String',
        },
        {
          path: ['custom_type', 'data', 'body', 'slice', 'primary'],
          type: 'PrismicCustomTypeBodySlicePrimaryType',
        },
        {
          path: ['custom_type', 'data', 'body', 'slice', 'items', 'key'],
          type: 'String',
        },
        {
          path: ['custom_type', 'data', 'body', 'slice', 'items'],
          type: '[PrismicCustomTypeBodySliceItemType]',
        },
        {
          path: ['custom_type', 'data', 'body', 'slice'],
          type: 'PrismicCustomTypeBodySlice',
        },
        {
          path: ['custom_type', 'data', 'body'],
          type: '[PrismicCustomTypeBodySlicesType]',
        },
        { path: ['custom_type', 'data', 'image'], type: 'PrismicImageType' },
        {
          path: ['custom_type', 'data', 'image', 'thumbnails', 'thumb'],
          type: 'PrismicImageThumbnailType',
        },
        { path: ['custom_type', 'data'], type: 'PrismicCustomTypeDataType' },
        { path: ['custom_type'], type: 'PrismicCustomType' },
      ])
    })
  })
})

describe('generateTypeDefForLinkType', () => {
  test('returns PrismicAllDocumentTypes definition including all PrismicDocument types', () => {
    const result = generateTypeDefForLinkType(
      [
        {
          type: 'OBJECT',
          config: {
            name: 'PrismicCustomType',
            interfaces: ['PrismicDocument', 'Node'],
          },
        },
        {
          type: 'OBJECT',
          config: {
            name: 'PrismicCustomType2',
            interfaces: ['PrismicDocument', 'Node'],
          },
        },
        {
          type: 'OBJECT',
          config: {
            name: 'PrismicCustomTypeDataType',
          },
        },
      ],
      context,
    )

    expect(result.config.types).toEqual([
      'PrismicCustomType',
      'PrismicCustomType2',
    ])
  })
})

describe('generateTypeDefForImageType', () => {
  test('returns PrismicImageThumbnailsType definition including all PrismicImageType thumbnail fields', () => {
    const { typePaths } = generateTypeDefsForCustomType(
      customTypeId,
      {
        Main: {
          image: {
            type: 'Image',
            config: {
              thumbnails: [
                { name: 'thumb1', width: 100, height: 100 },
                { name: 'thumb2', width: 200, height: 200 },
              ],
            },
          },
        },
      },
      context,
    )

    const result = generateTypeDefsForImageType(typePaths, context)

    expect(Object.keys(result.config.fields)).toEqual(['thumb1', 'thumb2'])
  })

  test('returns scalar type that always returns null if no thumbnails are defined', () => {
    const { typePaths } = generateTypeDefsForCustomType(
      customTypeId,
      {
        Main: {
          image: {
            type: 'Image',
          },
        },
      },
      context,
    )

    const result = generateTypeDefsForImageType(typePaths, context)

    expect(result.serialize()).toBeNull()
  })
})

import test from 'ava'
import * as sinon from 'sinon'
import * as prismicT from '@prismicio/types'

import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import kitchenSinkSchema from './__fixtures__/kitchenSinkSchema.json'

import { createSchemaCustomization } from '../src/gatsby-node'

test('creates type path nodes', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  pluginOptions.schemas = {
    kitchen_sink: kitchenSinkSchema as prismicT.CustomTypeModel,
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  const calls = (gatsbyContext.actions.createNode as sinon.SinonStub)
    .getCalls()
    .filter(
      (call) => call.firstArg.internal.type === 'PrismicPrefixTypePathType',
    )
    .reduce((acc: Record<string, string>, call) => {
      acc[call.firstArg.path.join('.')] = call.firstArg.type

      return acc
    }, {})

  t.deepEqual(calls, {
    kitchen_sink: 'Document',
    'kitchen_sink.data': 'DocumentData',
    'kitchen_sink.data.body': 'Slices',
    'kitchen_sink.data.body.first_option': 'Slice',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_boolean':
      'Boolean',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_color':
      'Color',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_content_relationship':
      'Link',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_date':
      'Date',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_embed':
      'Embed',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_image':
      'Image',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_key_text':
      'Text',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_link':
      'Link',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_link_to_media':
      'Link',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_number':
      'Number',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_select':
      'Select',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_title':
      'StructuredText',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_boolean':
      'Boolean',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_color':
      'Color',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_content_relationship':
      'Link',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_date':
      'Date',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_embed':
      'Embed',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_image':
      'Image',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_key_text':
      'Text',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_link':
      'Link',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_link_to_media':
      'Link',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_number':
      'Number',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_select':
      'Select',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_title':
      'StructuredText',
    'kitchen_sink.data.body.second_option': 'Slice',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_boolean':
      'Boolean',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_color':
      'Color',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_content_relationship':
      'Link',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_date':
      'Date',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_embed':
      'Embed',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_image':
      'Image',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_key_text':
      'Text',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_link':
      'Link',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_link_to_media':
      'Link',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_number':
      'Number',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_select':
      'Select',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_title':
      'StructuredText',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_boolean':
      'Boolean',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_color':
      'Color',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_content_relationship':
      'Link',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_date':
      'Date',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_embed':
      'Embed',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_image':
      'Image',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_key_text':
      'Text',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_link':
      'Link',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_link_to_media':
      'Link',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_number':
      'Number',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_select':
      'Select',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_title':
      'StructuredText',
    'kitchen_sink.data.boolean': 'Boolean',
    'kitchen_sink.data.color': 'Color',
    'kitchen_sink.data.content_relationship': 'Link',
    'kitchen_sink.data.date': 'Date',
    'kitchen_sink.data.embed': 'Embed',
    'kitchen_sink.data.geopoint': 'GeoPoint',
    'kitchen_sink.data.group': 'Group',
    'kitchen_sink.data.group.group_boolean': 'Boolean',
    'kitchen_sink.data.group.group_color': 'Color',
    'kitchen_sink.data.group.group_content_relationship': 'Link',
    'kitchen_sink.data.group.group_date': 'Date',
    'kitchen_sink.data.group.group_embed': 'Embed',
    'kitchen_sink.data.group.group_geopoint': 'GeoPoint',
    'kitchen_sink.data.group.group_image': 'Image',
    'kitchen_sink.data.group.group_key_text': 'Text',
    'kitchen_sink.data.group.group_link': 'Link',
    'kitchen_sink.data.group.group_link_to_media': 'Link',
    'kitchen_sink.data.group.group_number': 'Number',
    'kitchen_sink.data.group.group_rich_text': 'StructuredText',
    'kitchen_sink.data.group.group_select': 'Select',
    'kitchen_sink.data.group.group_timestamp': 'Timestamp',
    'kitchen_sink.data.group.group_title': 'StructuredText',
    'kitchen_sink.data.image': 'Image',
    'kitchen_sink.data.key_text': 'Text',
    'kitchen_sink.data.link': 'Link',
    'kitchen_sink.data.link_to_media': 'Link',
    'kitchen_sink.data.number': 'Number',
    'kitchen_sink.data.rich_text': 'StructuredText',
    'kitchen_sink.data.second_tab_body': 'Slices',
    'kitchen_sink.data.second_tab_body.second_tab_first_option': 'Slice',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_boolean':
      'Boolean',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_color':
      'Color',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_date':
      'Date',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_embed':
      'Embed',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_image':
      'Image',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_key_text':
      'Text',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_link':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_link_to_media':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_number':
      'Number',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_select':
      'Select',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_boolean':
      'Boolean',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_color':
      'Color',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_date':
      'Date',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_embed':
      'Embed',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_image':
      'Image',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_key_text':
      'Text',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_link':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_link_to_media':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_number':
      'Number',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_select':
      'Select',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_second_option': 'Slice',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_boolean':
      'Boolean',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_color':
      'Color',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_date':
      'Date',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_embed':
      'Embed',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_image':
      'Image',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_key_text':
      'Text',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_link':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_link_to_media':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_number':
      'Number',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_select':
      'Select',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_boolean':
      'Boolean',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_color':
      'Color',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_date':
      'Date',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_embed':
      'Embed',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_image':
      'Image',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_key_text':
      'Text',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_link':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_link_to_media':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_number':
      'Number',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_select':
      'Select',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_boolean': 'Boolean',
    'kitchen_sink.data.second_tab_color': 'Color',
    'kitchen_sink.data.second_tab_content_relationship': 'Link',
    'kitchen_sink.data.second_tab_date': 'Date',
    'kitchen_sink.data.second_tab_embed': 'Embed',
    'kitchen_sink.data.second_tab_geopoint': 'GeoPoint',
    'kitchen_sink.data.second_tab_group': 'Group',
    'kitchen_sink.data.second_tab_group.second_tab_group_boolean': 'Boolean',
    'kitchen_sink.data.second_tab_group.second_tab_group_color': 'Color',
    'kitchen_sink.data.second_tab_group.second_tab_group_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_group.second_tab_group_date': 'Date',
    'kitchen_sink.data.second_tab_group.second_tab_group_embed': 'Embed',
    'kitchen_sink.data.second_tab_group.second_tab_group_geopoint': 'GeoPoint',
    'kitchen_sink.data.second_tab_group.second_tab_group_image': 'Image',
    'kitchen_sink.data.second_tab_group.second_tab_group_key_text': 'Text',
    'kitchen_sink.data.second_tab_group.second_tab_group_link': 'Link',
    'kitchen_sink.data.second_tab_group.second_tab_group_link_to_media': 'Link',
    'kitchen_sink.data.second_tab_group.second_tab_group_number': 'Number',
    'kitchen_sink.data.second_tab_group.second_tab_group_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_group.second_tab_group_select': 'Select',
    'kitchen_sink.data.second_tab_group.second_tab_group_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_group.second_tab_group_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_image': 'Image',
    'kitchen_sink.data.second_tab_key_text': 'Text',
    'kitchen_sink.data.second_tab_link': 'Link',
    'kitchen_sink.data.second_tab_link_to_media': 'Link',
    'kitchen_sink.data.second_tab_number': 'Number',
    'kitchen_sink.data.second_tab_rich_text': 'StructuredText',
    'kitchen_sink.data.second_tab_select': 'Select',
    'kitchen_sink.data.second_tab_timestamp': 'Timestamp',
    'kitchen_sink.data.second_tab_title': 'StructuredText',
    'kitchen_sink.data.select': 'Select',
    'kitchen_sink.data.timestamp': 'Timestamp',
    'kitchen_sink.data.title': 'StructuredText',
  })
})

test('field names with dashes are transformed with underscores by default', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)

  const dashifiedKitchenSinkSchema = Object.keys(kitchenSinkSchema).reduce(
    (acc: prismicT.CustomTypeModel, tabName) => {
      const tab = kitchenSinkSchema[tabName as keyof typeof kitchenSinkSchema]

      acc[tabName] = Object.keys(tab).reduce(
        (tabAcc: prismicT.CustomTypeModelTab, fieldName) => {
          tabAcc[fieldName.replace(/_/g, '-')] =
            tab[fieldName as keyof typeof tab]

          return tabAcc
        },
        {},
      )

      return acc
    },
    {},
  )

  pluginOptions.schemas = {
    kitchen_sink: dashifiedKitchenSinkSchema,
  }

  // @ts-expect-error - Partial gatsbyContext provided
  await createSchemaCustomization(gatsbyContext, pluginOptions)

  const calls = (gatsbyContext.actions.createNode as sinon.SinonStub)
    .getCalls()
    .filter(
      (call) => call.firstArg.internal.type === 'PrismicPrefixTypePathType',
    )
    .reduce((acc: Record<string, string>, call) => {
      acc[call.firstArg.path.join('.')] = call.firstArg.type

      return acc
    }, {})

  t.deepEqual(calls, {
    kitchen_sink: 'Document',
    'kitchen_sink.data': 'DocumentData',
    'kitchen_sink.data.body': 'Slices',
    'kitchen_sink.data.body.first_option': 'Slice',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_boolean':
      'Boolean',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_color':
      'Color',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_content_relationship':
      'Link',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_date':
      'Date',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_embed':
      'Embed',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_image':
      'Image',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_key_text':
      'Text',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_link':
      'Link',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_link_to_media':
      'Link',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_number':
      'Number',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_select':
      'Select',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.body.first_option.items.first_option_repeat_title':
      'StructuredText',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_boolean':
      'Boolean',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_color':
      'Color',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_content_relationship':
      'Link',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_date':
      'Date',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_embed':
      'Embed',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_image':
      'Image',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_key_text':
      'Text',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_link':
      'Link',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_link_to_media':
      'Link',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_number':
      'Number',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_select':
      'Select',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.body.first_option.primary.first_option_nonrepeat_title':
      'StructuredText',
    'kitchen_sink.data.body.second_option': 'Slice',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_boolean':
      'Boolean',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_color':
      'Color',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_content_relationship':
      'Link',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_date':
      'Date',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_embed':
      'Embed',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_image':
      'Image',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_key_text':
      'Text',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_link':
      'Link',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_link_to_media':
      'Link',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_number':
      'Number',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_select':
      'Select',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.body.second_option.items.second_option_repeat_title':
      'StructuredText',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_boolean':
      'Boolean',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_color':
      'Color',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_content_relationship':
      'Link',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_date':
      'Date',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_embed':
      'Embed',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_image':
      'Image',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_key_text':
      'Text',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_link':
      'Link',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_link_to_media':
      'Link',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_number':
      'Number',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_select':
      'Select',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.body.second_option.primary.second_option_nonrepeat_title':
      'StructuredText',
    'kitchen_sink.data.boolean': 'Boolean',
    'kitchen_sink.data.color': 'Color',
    'kitchen_sink.data.content_relationship': 'Link',
    'kitchen_sink.data.date': 'Date',
    'kitchen_sink.data.embed': 'Embed',
    'kitchen_sink.data.geopoint': 'GeoPoint',
    'kitchen_sink.data.group': 'Group',
    'kitchen_sink.data.group.group_boolean': 'Boolean',
    'kitchen_sink.data.group.group_color': 'Color',
    'kitchen_sink.data.group.group_content_relationship': 'Link',
    'kitchen_sink.data.group.group_date': 'Date',
    'kitchen_sink.data.group.group_embed': 'Embed',
    'kitchen_sink.data.group.group_geopoint': 'GeoPoint',
    'kitchen_sink.data.group.group_image': 'Image',
    'kitchen_sink.data.group.group_key_text': 'Text',
    'kitchen_sink.data.group.group_link': 'Link',
    'kitchen_sink.data.group.group_link_to_media': 'Link',
    'kitchen_sink.data.group.group_number': 'Number',
    'kitchen_sink.data.group.group_rich_text': 'StructuredText',
    'kitchen_sink.data.group.group_select': 'Select',
    'kitchen_sink.data.group.group_timestamp': 'Timestamp',
    'kitchen_sink.data.group.group_title': 'StructuredText',
    'kitchen_sink.data.image': 'Image',
    'kitchen_sink.data.key_text': 'Text',
    'kitchen_sink.data.link': 'Link',
    'kitchen_sink.data.link_to_media': 'Link',
    'kitchen_sink.data.number': 'Number',
    'kitchen_sink.data.rich_text': 'StructuredText',
    'kitchen_sink.data.second_tab_body': 'Slices',
    'kitchen_sink.data.second_tab_body.second_tab_first_option': 'Slice',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_boolean':
      'Boolean',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_color':
      'Color',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_date':
      'Date',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_embed':
      'Embed',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_image':
      'Image',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_key_text':
      'Text',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_link':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_link_to_media':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_number':
      'Number',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_select':
      'Select',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.items.second_tab_first_option_repeat_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_boolean':
      'Boolean',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_color':
      'Color',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_date':
      'Date',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_embed':
      'Embed',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_image':
      'Image',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_key_text':
      'Text',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_link':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_link_to_media':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_number':
      'Number',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_select':
      'Select',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_body.second_tab_first_option.primary.second_tab_first_option_nonrepeat_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_second_option': 'Slice',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_boolean':
      'Boolean',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_color':
      'Color',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_date':
      'Date',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_embed':
      'Embed',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_image':
      'Image',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_key_text':
      'Text',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_link':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_link_to_media':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_number':
      'Number',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_select':
      'Select',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.items.second_tab_second_option_repeat_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_boolean':
      'Boolean',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_color':
      'Color',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_date':
      'Date',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_embed':
      'Embed',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_geopoint':
      'GeoPoint',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_image':
      'Image',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_key_text':
      'Text',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_link':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_link_to_media':
      'Link',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_number':
      'Number',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_select':
      'Select',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_body.second_tab_second_option.primary.second_tab_second_option_nonrepeat_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_boolean': 'Boolean',
    'kitchen_sink.data.second_tab_color': 'Color',
    'kitchen_sink.data.second_tab_content_relationship': 'Link',
    'kitchen_sink.data.second_tab_date': 'Date',
    'kitchen_sink.data.second_tab_embed': 'Embed',
    'kitchen_sink.data.second_tab_geopoint': 'GeoPoint',
    'kitchen_sink.data.second_tab_group': 'Group',
    'kitchen_sink.data.second_tab_group.second_tab_group_boolean': 'Boolean',
    'kitchen_sink.data.second_tab_group.second_tab_group_color': 'Color',
    'kitchen_sink.data.second_tab_group.second_tab_group_content_relationship':
      'Link',
    'kitchen_sink.data.second_tab_group.second_tab_group_date': 'Date',
    'kitchen_sink.data.second_tab_group.second_tab_group_embed': 'Embed',
    'kitchen_sink.data.second_tab_group.second_tab_group_geopoint': 'GeoPoint',
    'kitchen_sink.data.second_tab_group.second_tab_group_image': 'Image',
    'kitchen_sink.data.second_tab_group.second_tab_group_key_text': 'Text',
    'kitchen_sink.data.second_tab_group.second_tab_group_link': 'Link',
    'kitchen_sink.data.second_tab_group.second_tab_group_link_to_media': 'Link',
    'kitchen_sink.data.second_tab_group.second_tab_group_number': 'Number',
    'kitchen_sink.data.second_tab_group.second_tab_group_rich_text':
      'StructuredText',
    'kitchen_sink.data.second_tab_group.second_tab_group_select': 'Select',
    'kitchen_sink.data.second_tab_group.second_tab_group_timestamp':
      'Timestamp',
    'kitchen_sink.data.second_tab_group.second_tab_group_title':
      'StructuredText',
    'kitchen_sink.data.second_tab_image': 'Image',
    'kitchen_sink.data.second_tab_key_text': 'Text',
    'kitchen_sink.data.second_tab_link': 'Link',
    'kitchen_sink.data.second_tab_link_to_media': 'Link',
    'kitchen_sink.data.second_tab_number': 'Number',
    'kitchen_sink.data.second_tab_rich_text': 'StructuredText',
    'kitchen_sink.data.second_tab_select': 'Select',
    'kitchen_sink.data.second_tab_timestamp': 'Timestamp',
    'kitchen_sink.data.second_tab_title': 'StructuredText',
    'kitchen_sink.data.select': 'Select',
    'kitchen_sink.data.timestamp': 'Timestamp',
    'kitchen_sink.data.title': 'StructuredText',
  })
})

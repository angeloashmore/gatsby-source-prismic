import * as prismicT from '@prismicio/types'

import {
  PluginOptions,
  PrismicWebhookBodyApiUpdate,
  PrismicWebhookType,
} from '../../src'

export const createWebhookAPIUpdateDocAddition = (
  pluginOptions: PluginOptions,
  documents: prismicT.PrismicDocument[],
): PrismicWebhookBodyApiUpdate => ({
  type: PrismicWebhookType.APIUpdate,
  masterRef: 'masterRef',
  releases: {},
  masks: {},
  tags: {},
  experiments: {},
  documents: documents.map((doc) => doc.id),
  domain: pluginOptions.repositoryName,
  apiUrl: pluginOptions.apiEndpoint.replace(/(\.cdn|\/v2)/, ''),
  secret: pluginOptions.webhookSecret ?? null,
})

import * as msw from 'msw'
import * as prismic from '@prismicio/client'

import { isValidAccessToken } from './isValidAccessToken'

import { PluginOptions } from '../../src'

const DEFAULT_RESPONSE: prismic.Repository = {
  types: { foo: 'Foo' },
  refs: [
    {
      id: 'master',
      ref: 'master',
      isMasterRef: true,
      label: 'master',
      scheduledAt: 'scheduledAt',
    },
    {
      id: 'release',
      ref: 'release',
      isMasterRef: false,
      label: 'release',
      scheduledAt: 'scheduledAt',
    },
  ],
  bookmarks: {},
  tags: [],
  forms: {},
  license: 'license',
  languages: [{ id: 'fr-fr', name: 'fr-fr' }],
  experiments: {},
  oauth_initiate: 'oauth_initiate',
  oauth_token: 'oauth_token',
  version: 'version',
}

export const createAPIRepositoryMockedRequest = (
  pluginOptions: PluginOptions,
  overrides?: Partial<prismic.Repository>,
): msw.RestHandler =>
  msw.rest.get(pluginOptions.apiEndpoint, (req, res, ctx) => {
    if (isValidAccessToken(pluginOptions.accessToken, req)) {
      return res(ctx.json({ ...DEFAULT_RESPONSE, ...overrides }))
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
  })

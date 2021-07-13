import * as msw from 'msw'
import * as prismicCustomTypes from '@prismicio/custom-types-client'

import { PluginOptions } from '../../src'

export const createCustomTypesAPIMockedRequest = (
  pluginOptions: Pick<
    PluginOptions,
    'repositoryName' | 'customTypesApiToken' | 'customTypesApiEndpoint'
  >,
  response: prismicCustomTypes.CustomType[],
): msw.RestHandler =>
  msw.rest.get(
    pluginOptions.customTypesApiEndpoint ||
      'https://customtypes.prismic.io/customtypes',
    (req, res, ctx) => {
      const repositoryHeader = req.headers.get('repository')
      const authorizationHeader = req.headers.get('Authorization')

      if (
        repositoryHeader === pluginOptions.repositoryName &&
        authorizationHeader === `Bearer ${pluginOptions.customTypesApiToken}`
      ) {
        return res(ctx.json(response))
      } else {
        return res(ctx.status(401))
      }
    },
  )

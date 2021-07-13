import * as gatsby from 'gatsby'
import * as prismic from '@prismicio/client'
import { promises as fs } from 'fs'
import {
  DEFAULT_IMGIX_PARAMS,
  DEFAULT_LANG,
  DEFAULT_PLACEHOLDER_IMGIX_PARAMS,
} from 'gatsby-source-prismic'

import { DEFAULT_PROMPT_FOR_ACCESS_TOKEN, DEFAULT_TOOLBAR } from './constants'
import { WriteTypePathsToFilesystemArgs } from './types'

/**
 * Run during the bootstrap phase. Plugins can use this to define a schema for
 * their options using Joi to validate the options users pass to the plugin.
 *
 * @see https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/#pluginOptionsSchema
 */
export const pluginOptionsSchema: NonNullable<
  gatsby.GatsbyNode['pluginOptionsSchema']
> = function (args) {
  const { Joi } = args

  const schema = Joi.object({
    repositoryName: Joi.string().required(),
    accessToken: Joi.string(),
    promptForAccessToken: Joi.boolean().default(
      DEFAULT_PROMPT_FOR_ACCESS_TOKEN,
    ),
    apiEndpoint: Joi.string().default((parent) =>
      prismic.getEndpoint(parent.repositoryName),
    ),
    graphQuery: Joi.string(),
    fetchLinks: Joi.array().items(Joi.string().required()),
    lang: Joi.string().default(DEFAULT_LANG),
    imageImgixParams: Joi.object().default(DEFAULT_IMGIX_PARAMS),
    imagePlaceholderImgixParams: Joi.object().default(
      DEFAULT_PLACEHOLDER_IMGIX_PARAMS,
    ),
    typePrefix: Joi.string(),
    toolbar: Joi.string().valid('new', 'legacy').default(DEFAULT_TOOLBAR),
    writeTypePathsToFilesystem: Joi.function().default(
      () => async (args: WriteTypePathsToFilesystemArgs) =>
        await fs.writeFile(args.publicPath, args.serializedTypePaths),
    ),
  }).oxor('fetchLinks', 'graphQuery')

  return schema
}

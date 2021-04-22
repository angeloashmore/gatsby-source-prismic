import * as ava from 'ava'
import * as sinon from 'sinon'
import * as prismic from 'ts-prismic'
import * as crypto from 'crypto'

import {
  DEFAULT_IMGIX_PARAMS,
  DEFAULT_LANG,
  DEFAULT_PLACEHOLDER_IMGIX_PARAMS,
} from '../../src/constants'
import { PluginOptions } from '../../src/types'

export const createPluginOptions = (t: ava.ExecutionContext): PluginOptions => {
  const repositoryName = crypto.createHash('md5').update(t.title).digest('hex')

  return {
    repositoryName,
    accessToken: 'accessToken',
    apiEndpoint: prismic.defaultEndpoint(repositoryName),
    typePrefix: 'prefix',
    schemas: {},
    lang: DEFAULT_LANG,
    webhookSecret: 'secret',
    imageImgixParams: DEFAULT_IMGIX_PARAMS,
    imagePlaceholderImgixParams: DEFAULT_PLACEHOLDER_IMGIX_PARAMS,
    linkResolver: () => 'linkResolver',
    htmlSerializer: () => 'htmlSerializer',
    plugins: [],
    createRemoteFileNode: sinon
      .stub()
      .resolves(Promise.resolve({ id: 'remoteFileNodeId' })),
    transformFieldName: (fieldName: string) => fieldName.replace(/-/g, '_'),
  }
}

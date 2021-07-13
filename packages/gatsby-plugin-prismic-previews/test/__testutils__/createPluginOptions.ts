import * as ava from 'ava'
import * as sinon from 'sinon'
import * as prismic from '@prismicio/client'
import * as crypto from 'crypto'

import { PluginOptions } from '../../src'

export const createPluginOptions = (t: ava.ExecutionContext): PluginOptions => {
  const repositoryName = crypto.createHash('md5').update(t.title).digest('hex')

  return {
    repositoryName,
    accessToken: 'accessToken',
    apiEndpoint: prismic.getEndpoint(repositoryName),
    typePrefix: 'prefix',
    lang: '*',
    toolbar: 'new',
    imageImgixParams: { q: 100 },
    imagePlaceholderImgixParams: { w: 10 },
    graphQuery: 'graphQuery',
    plugins: [],
    writeTypePathsToFilesystem: sinon.stub(),
  }
}

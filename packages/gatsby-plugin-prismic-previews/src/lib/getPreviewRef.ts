import * as prismic from '@prismicio/client'
import * as IOE from 'fp-ts/IOEither'
import { pipe } from 'fp-ts/function'

import { getCookie } from './getCookie'

export const getPreviewRef = pipe(
  getCookie(prismic.cookie.preview),
  IOE.mapLeft(() => new Error('Preview cookie not present')),
)

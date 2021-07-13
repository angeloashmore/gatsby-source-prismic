import * as prismic from '@prismicio/types'
import * as prismicH from '@prismicio/helpers'
import * as RE from 'fp-ts/ReaderEither'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/function'

import {
  proxyDocumentSubtree,
  ProxyDocumentSubtreeEnv,
} from '../lib/proxyDocumentSubtree'

import * as alternativeLanguagesFieldProxy from '../fieldProxies/alternativeLanguagesFieldProxy'

// TODO: This is a poor type guard. It should use something stricter to ensure
// the object is a document.
export const valueRefinement = (
  value: unknown,
): value is prismic.PrismicDocument =>
  typeof value === 'object' && value !== null

export const proxyValue = (
  path: string[],
  fieldValue: prismic.PrismicDocument,
): RE.ReaderEither<ProxyDocumentSubtreeEnv, Error, unknown> =>
  pipe(
    RE.ask<ProxyDocumentSubtreeEnv>(),
    RE.bind('data', () =>
      pipe(
        fieldValue.data,
        RE.fromPredicate(
          (data) => !R.isEmpty(data),
          () => new Error('Document does not have a data field'),
        ),
        RE.chain((data) => proxyDocumentSubtree([...path, 'data'], data)),
        RE.orElseW(() => RE.right(fieldValue.data)),
      ),
    ),
    RE.bind('url', (env) =>
      RE.of(
        prismicH.asLink(
          prismicH.documentToLinkField(fieldValue),
          env.linkResolver,
        ),
      ),
    ),
    RE.bind('alternative_languages', () =>
      alternativeLanguagesFieldProxy.proxyValue(fieldValue.alternate_languages),
    ),
    RE.bind('__typename', (env) => RE.of(env.nodeHelpers.createTypeName(path))),
    RE.map((env) => ({
      ...fieldValue,
      __typename: env.__typename,
      url: env.url,
      alternate_languages: env.alternative_languages,
      data: env.data,
    })),
  )

import * as prismicT from '@prismicio/types'
import * as prismicH from '@prismicio/helpers'
import * as RE from 'fp-ts/ReaderEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

import { ProxyDocumentSubtreeEnv } from '../lib/proxyDocumentSubtree'
import { createGetProxy } from '../lib/createGetProxy'

export const valueRefinement = (value: unknown): value is prismicT.LinkField =>
  typeof value === 'object' && value !== null && 'link_type' in value

export const proxyValue = (
  fieldValue: prismicT.LinkField,
): RE.ReaderEither<ProxyDocumentSubtreeEnv, Error, prismicT.LinkField> =>
  pipe(
    RE.ask<ProxyDocumentSubtreeEnv>(),
    RE.bind('url', (env) =>
      RE.of(prismicH.asLink(fieldValue, env.linkResolver)),
    ),
    RE.bind('enhancedFieldValue', (env) =>
      RE.of({
        ...fieldValue,
        url: env.url,
        localFile:
          fieldValue.link_type === prismicT.LinkType.Media
            ? {
                publicURL: env.url,
              }
            : null,
        raw: fieldValue,
      }),
    ),
    RE.map((env) =>
      // A Proxy is used here to avoid an infinite loop if documents have
      // circular references in link fields. This effectively makes the
      // `document` field lazy.
      createGetProxy(env.enhancedFieldValue, (target, prop, receiver) =>
        pipe(
          fieldValue,
          O.fromPredicate(
            (fieldValue): fieldValue is prismicT.FilledLinkToDocumentField =>
              prop === 'document' &&
              fieldValue.link_type === prismicT.LinkType.Document &&
              'id' in fieldValue &&
              !fieldValue.isBroken &&
              typeof fieldValue.id === 'string',
          ),
          O.chain((fieldValue) => O.fromNullable(env.getNode(fieldValue.id))),
          O.getOrElseW(() => Reflect.get(target, prop, receiver)),
        ),
      ),
    ),
  )

import * as prismicT from '@prismicio/types'
import * as prismicH from '@prismicio/helpers'
import * as RE from 'fp-ts/ReaderEither'
import { pipe } from 'fp-ts/function'

import { ProxyDocumentSubtreeEnv } from '../lib/proxyDocumentSubtree'

export const valueRefinement = (
  value: unknown,
): value is prismicT.RichTextField =>
  // We must be very loose here. An image element, for example, does not contain
  // a `text` property.
  Array.isArray(value) && value.every((element) => 'type' in element)

export interface StructuredTextProxyValue {
  html: string
  text: string
  raw: prismicT.RichTextField
}

export const proxyValue = (
  fieldValue: prismicT.RichTextField,
): RE.ReaderEither<ProxyDocumentSubtreeEnv, Error, StructuredTextProxyValue> =>
  pipe(
    RE.ask<ProxyDocumentSubtreeEnv>(),
    RE.bind('html', (env) =>
      RE.of(prismicH.asHTML(fieldValue, env.linkResolver, env.htmlSerializer)),
    ),
    RE.bind('text', () => RE.of(prismicH.asText(fieldValue))),
    RE.map((env) => ({
      html: env.html,
      text: env.text,
      raw: fieldValue,
    })),
  )

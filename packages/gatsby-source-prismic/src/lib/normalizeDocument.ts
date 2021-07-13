import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import { Dependencies } from '../types'
import { normalizeDocumentSubtree } from './normalizeDocumentSubtree'

/**
 * Type guard to verify that the given value is a valid Prismic document.
 */
const documentRefinement = (
  value: unknown,
): value is prismicT.PrismicDocument =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'id' in value &&
  'type' in value

/**
 * Normalizes values of a Prismic document where necessary.
 *
 * @see gatsby-source-prismic/lib/normalizeDocumentSubtree.ts
 *
 * @param doc Prismic document to normalize.
 *
 * @returns Normalized Prismic document.
 */
export const normalizeDocument = (
  doc: prismicT.PrismicDocument,
): RTE.ReaderTaskEither<Dependencies, Error, prismicT.PrismicDocument> =>
  pipe(
    normalizeDocumentSubtree([doc.type], doc),
    RTE.chainW(
      RTE.fromPredicate(
        documentRefinement,
        () =>
          new Error(
            'Document shape is no longer a Document after normalization',
          ),
      ),
    ),
  )

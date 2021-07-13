import * as gatsby from 'gatsby'
import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe, identity } from 'fp-ts/function'

import { buildObjectType } from '../lib/buildObjectType'

import { Dependencies, IterableElement } from '../types'

/**
 * Builds a GraphQL Type used by a document's `alternate_language` field. The
 * resulting type can be created using Gatsby's `createTypes` action.
 */
// TODO: Move typename to Dependencies (create in `buildDependencies.ts`).
export const buildAlternateLanguageType: RTE.ReaderTaskEither<
  Dependencies,
  never,
  gatsby.GatsbyGraphQLType
> = pipe(
  RTE.ask<Dependencies>(),
  RTE.chain((deps) =>
    buildObjectType({
      name: deps.nodeHelpers.createTypeName('AlternateLanguageType'),
      fields: {
        id: 'ID',
        uid: 'String',
        lang: 'String',
        type: 'String',
        document: {
          type: deps.nodeHelpers.createTypeName('AllDocumentTypes'),
          resolve: (
            source: IterableElement<
              prismicT.PrismicDocument['alternate_languages']
            >,
          ): string | null => deps.nodeHelpers.createNodeId(source.id),
          extensions: { link: {} },
        },
        raw: { type: 'JSON', resolve: identity },
      },
    }),
  ),
)

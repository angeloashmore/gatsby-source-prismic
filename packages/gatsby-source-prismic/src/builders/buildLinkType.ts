import * as gatsby from 'gatsby'
import * as gatsbyFs from 'gatsby-source-filesystem'
import * as prismicH from '@prismicio/helpers'
import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe, identity } from 'fp-ts/function'

import { buildObjectType } from '../lib/buildObjectType'

import { Dependencies } from '../types'

/**
 * Builds a GraphQL Type used by Link fields. The resulting type can be created
 * using Gatsby's `createTypes` action.
 */
// TODO: Move typename to Dependencies (create in `buildDependencies.ts`).
export const buildLinkType: RTE.ReaderTaskEither<
  Dependencies,
  never,
  gatsby.GatsbyGraphQLType
> = pipe(
  RTE.ask<Dependencies>(),
  RTE.chain((deps) =>
    buildObjectType({
      name: deps.nodeHelpers.createTypeName('LinkType'),
      fields: {
        link_type: deps.globalNodeHelpers.createTypeName('LinkTypeEnum'),
        isBroken: 'Boolean',
        url: {
          type: 'String',
          resolve: (source: prismicT.LinkField): string | null =>
            prismicH.asLink(source, deps.pluginOptions.linkResolver),
        },
        target: 'String',
        size: 'Int',
        id: 'ID',
        type: 'String',
        tags: '[String]',
        lang: 'String',
        slug: 'String',
        uid: 'String',
        document: {
          type: deps.nodeHelpers.createTypeName('AllDocumentTypes'),
          resolve: (source: prismicT.LinkField): string | null =>
            source.link_type === prismicT.LinkType.Document &&
            'isBroken' in source &&
            !source.isBroken
              ? deps.nodeHelpers.createNodeId(source.id)
              : null,
          extensions: { link: {} },
        },
        localFile: {
          type: 'File',
          resolve: async (
            source: prismicT.LinkField,
          ): Promise<gatsbyFs.FileSystemNode | null> =>
            source.link_type === prismicT.LinkType.Media &&
            'url' in source &&
            source.url
              ? await deps.createRemoteFileNode({
                  url: source.url,
                  store: deps.store,
                  cache: deps.cache,
                  createNode: deps.createNode,
                  createNodeId: deps.createNodeId,
                  reporter: deps.reporter,
                })
              : null,
        },
        raw: { type: 'JSON', resolve: identity },
      },
    }),
  ),
)

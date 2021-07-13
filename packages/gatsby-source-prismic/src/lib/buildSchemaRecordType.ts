import * as gatsby from 'gatsby'
import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import { Dependencies } from '../types'
import { buildObjectType } from './buildObjectType'
import { buildFieldConfigMap } from './buildFieldConfigMap'

/**
 * Builds a GraphQL type from a record mapping a Prismic field API ID to its
 * schema definition.
 *
 * @param path Path to the schema record.
 * @param record Record mapping a Prismic field API ID to its schema definition.
 * @param typeName Type name of the resulting GraphQL type.
 *
 * @returns GraphQL type containing fields for each record property.
 */
export const buildSchemaRecordType = (
  path: string[],
  record: Record<string, prismicT.CustomTypeModelField>,
  typeName: string | string[] = path,
): RTE.ReaderTaskEither<Dependencies, never, gatsby.GatsbyGraphQLObjectType> =>
  pipe(
    RTE.ask<Dependencies>(),
    RTE.bind('fields', () => buildFieldConfigMap(path, record)),
    RTE.chain((scope) =>
      buildObjectType({
        name: scope.nodeHelpers.createTypeName(typeName),
        fields: scope.fields,
      }),
    ),
  )

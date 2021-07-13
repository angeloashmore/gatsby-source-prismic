import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import { createType } from '../lib/createType'
import { getTypeName } from '../lib/getTypeName'
import { listTypeName } from '../lib/listTypeName'
import { buildSchemaRecordType } from '../lib/buildSchemaRecordType'
import { createTypePath } from '../lib/createTypePath'

import { Dependencies, FieldConfigCreator } from '../types'

/**
 * Builds a GraphQL field configuration object for a Group Custom Type field.
 * It creates a GraphQL List type using the Group field's individual fields.
 * Each field is converted to their own GraphQL configuration object.
 *
 * This function registers a typepath for the field.
 *
 * @param path Path to the field.
 * @param schema Schema definition for the field.
 *
 * @returns GraphQL field configuration object.
 */
export const buildGroupFieldConfig: FieldConfigCreator<prismicT.CustomTypeModelGroupField> =
  (path, schema) =>
    pipe(
      RTE.ask<Dependencies>(),
      RTE.chainFirst(() =>
        createTypePath(path, prismicT.CustomTypeModelFieldType.Group),
      ),
      RTE.chain(() => buildSchemaRecordType(path, schema.config.fields)),
      RTE.chainFirst(createType),
      RTE.map(getTypeName),
      RTE.map(listTypeName),
    )

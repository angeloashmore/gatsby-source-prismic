import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import { createTypePath } from '../lib/createTypePath'

import { FieldConfigCreator, TypePathKind } from '../types'

/**
 * Builds a GraphQL field configuration object for a Text Custom Type field.
 * The resulting configuration object can be used in a GraphQL type.
 *
 * This function registers a typepath for the field.
 *
 * @param path Path to the field.
 *
 * @returns GraphQL field configuration object.
 */
export const buildTextFieldConfig: FieldConfigCreator = (path) =>
  pipe(
    createTypePath(
      TypePathKind.CustomType,
      path,
      prismicT.CustomTypeModelFieldType.Text,
    ),
    RTE.map(() => 'String'),
  )

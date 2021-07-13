import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import { createTypePath } from '../lib/createTypePath'

import { Dependencies, FieldConfigCreator } from '../types'

/**
 * Builds a GraphQL field configuration object for a StructuredText Custom Type
 * field. This is used for Rich Text and Title fields. The resulting
 * configuration object can be used in a GraphQL type.
 *
 * This function registers a typepath for the field.
 *
 * @param path Path to the field.
 *
 * @returns GraphQL field configuration object.
 */
export const buildStructuredTextFieldConfig: FieldConfigCreator = (path) =>
  pipe(
    RTE.ask<Dependencies>(),
    RTE.chainFirst(() =>
      createTypePath(path, prismicT.CustomTypeModelFieldType.StructuredText),
    ),
    RTE.map((deps) => deps.nodeHelpers.createTypeName('StructuredTextType')),
  )

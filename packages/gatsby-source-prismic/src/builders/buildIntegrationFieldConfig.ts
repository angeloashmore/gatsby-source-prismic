import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import { buildInferredNodeType } from '../lib/buildInferredNodeType'
import { createType } from '../lib/createType'
import { createTypePath } from '../lib/createTypePath'
import { getTypeName } from '../lib/getTypeName'

import { Dependencies, FieldConfigCreator } from '../types'

/**
 * Builds a GraphQL field configuration object for an Integration Fields Custom
 * Type field. It uses the `@link` extension to connect data to the field. Data
 * for each Integration Fields field is created as a separate node to allow
 * Gatsby to infer the fields and types. The resulting configuration object can
 * be used in a GraphQL type.
 *
 * This function registers a typepath for the field.
 *
 * @param path Path to the field.
 *
 * @returns GraphQL field configuration object.
 */
export const buildIntegrationFieldConfig: FieldConfigCreator = (
  path: string[],
) =>
  pipe(
    RTE.ask<Dependencies>(),
    RTE.chainFirst(() =>
      createTypePath(path, prismicT.CustomTypeModelFieldType.IntegrationFields),
    ),
    RTE.chain(() => buildInferredNodeType([...path, 'IntegrationType'])),
    RTE.chainFirst(createType),
    RTE.map(getTypeName),
    RTE.map((type) => ({
      type,
      extensions: { link: {} },
    })),
  )

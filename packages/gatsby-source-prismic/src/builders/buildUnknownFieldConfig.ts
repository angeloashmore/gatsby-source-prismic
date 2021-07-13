import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'

import { createTypePath } from '../lib/createTypePath'
import { dotPath } from '../lib/dotPath'
import { reportInfo } from '../lib/reportInfo'

import { Dependencies, FieldConfigCreator, PrismicSpecialType } from '../types'

/**
 * Builds a GraphQL field configuration object for a Custom Type field with an
 * unknown type. Because the type is unknown, a `JSON` field type is used as a
 * fallback type. The resulting configuration object can be used in a GraphQL
 * type.
 *
 * Use of this function will be reported to the user's Gatsby log. This informs
 * the user that the field will not act like other fields since its type is
 * unknown. This should only happen if a new Prismic field type is introduced
 * before this plugin supports it.
 *
 * This function registers a typepath for the field.
 *
 * @param path Path to the field.
 * @param schema Schema definition for the field.
 *
 * @returns GraphQL field configuration object.
 */
export const buildUnknownFieldConfig: FieldConfigCreator = (
  path: string[],
  schema: prismicT.CustomTypeModelField,
) =>
  pipe(
    RTE.ask<Dependencies>(),
    RTE.chainFirst(() => createTypePath(path, PrismicSpecialType.Unknown)),
    RTE.chainFirst(() =>
      reportInfo(
        `An unknown field type "${schema.type}" was found at ${dotPath(
          path,
        )}. A generic JSON type will be used. You can manually override the type using Gatsby's createSchemaCustomization API in your site's gatsby-node.js.`,
      ),
    ),
    RTE.map(() => ({
      type: 'JSON',
      resolve: identity,
    })),
  )

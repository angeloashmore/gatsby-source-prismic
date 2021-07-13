import * as gatsby from 'gatsby'
import * as gatsbyFs from 'gatsby-source-filesystem'
import * as prismic from '@prismicio/client'
import * as prismicT from '@prismicio/types'
import * as prismicCustomTypes from '@prismicio/custom-types-client'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as T from 'fp-ts/Task'
import * as A from 'fp-ts/Array'
import * as R from 'fp-ts/Record'
import * as struct from 'fp-ts/struct'
import * as string from 'fp-ts/string'
import { constVoid, pipe } from 'fp-ts/function'
import fetch from 'node-fetch'

import { sprintf } from './lib/sprintf'
import { throwError } from './lib/throwError'

import {
  DEFAULT_IMGIX_PARAMS,
  DEFAULT_LANG,
  DEFAULT_PLACEHOLDER_IMGIX_PARAMS,
  MISSING_SCHEMAS_MSG,
  MISSING_SCHEMA_MSG,
} from './constants'
import { Dependencies, JoiValidationError, PluginOptions } from './types'

const getSchemasFromCustomTypeApiResponse = (
  response: prismicCustomTypes.CustomType[],
) =>
  R.fromFoldableMap(
    struct.getAssignSemigroup<prismicT.CustomTypeModel>(),
    A.Foldable,
  )(response, (item) => [item.id, item.json])

/**
 * To be execuring during the `external` phase of `pluginOptionsSchema`.
 *
 * Populates the `schemas` plugin option with JSON schemas fetched using
 * Prismic's Custom Types API. This will only happen if a valid
 * `customTypesApiToken` plugin option is provided.
 *
 * Schemas provided to the plugin via the `schemas` plugin option will be merged
 * over ones fetched from the API. In other words, provided schemas take
 * priority over automatically fetched ones.
 */
const externalCustomTypeFetchingProgram = (
  Joi: gatsby.PluginOptionsSchemaArgs['Joi'],
): RTE.ReaderTaskEither<
  Pick<Dependencies, 'pluginOptions'>,
  Error,
  PluginOptions
> =>
  pipe(
    RTE.ask<Pick<Dependencies, 'pluginOptions'>>(),
    RTE.filterOrElse(
      (deps) => Boolean(deps.pluginOptions.customTypesApiToken),
      () =>
        new Error(
          'No customTypesApiToken provided (skipping Custom Types API fetching)',
        ),
    ),
    RTE.bind('client', (scope) =>
      RTE.of(
        prismicCustomTypes.createClient({
          repositoryName: scope.pluginOptions.repositoryName,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          token: scope.pluginOptions.customTypesApiToken!,
          endpoint: scope.pluginOptions.customTypesApiEndpoint,
          fetch,
        }),
      ),
    ),
    RTE.bindW('fetchedSchemas', (scope) =>
      RTE.fromTaskEither(
        TE.tryCatch(
          async () => await scope.client.getAll(),
          (error) =>
            new Joi.ValidationError(
              'Failed Custom Type API Request',
              [error as Error],
              scope.pluginOptions,
            ),
        ),
      ),
    ),
    RTE.bind('schemas', (scope) =>
      RTE.of(getSchemasFromCustomTypeApiResponse(scope.fetchedSchemas)),
    ),
    RTE.map((scope) => ({
      ...scope.pluginOptions,
      schemas: {
        ...scope.schemas,
        ...scope.pluginOptions.schemas,
      },
    })),
  )

/**
 * To be executed during the `external` phase of `pluginOptionsSchema`.
 *
 * Validates plugin options for the following:
 *
 * - Access to the Prismic repository
 * - Missing custom type schemas
 */
const externalValidationProgram = (
  Joi: gatsby.PluginOptionsSchemaArgs['Joi'],
): RTE.ReaderTaskEither<
  Pick<Dependencies, 'pluginOptions'>,
  JoiValidationError,
  void
> =>
  pipe(
    RTE.ask<Pick<Dependencies, 'pluginOptions'>>(),
    RTE.bind('client', (deps) =>
      RTE.right(
        prismic.createClient(
          deps.pluginOptions.apiEndpoint ??
            prismic.getEndpoint(deps.pluginOptions.repositoryName),
          {
            fetch,
            accessToken: deps.pluginOptions.accessToken,
          },
        ),
      ),
    ),
    RTE.chainFirst((scope) =>
      RTE.fromIO(() => {
        if (scope.pluginOptions.releaseID) {
          scope.client.queryContentFromReleaseByID(
            scope.pluginOptions.releaseID,
          )
        }
      }),
    ),
    RTE.bind('repository', (scope) =>
      RTE.fromTaskEither(
        TE.tryCatch(
          () => scope.client.getRepository(),
          (error) =>
            new Joi.ValidationError(
              'Failed repository request',
              [{ message: (error as Error).message }],
              scope.client.endpoint,
            ),
        ),
      ),
    ),
    RTE.bind('schemaTypes', (scope) =>
      pipe(scope.pluginOptions.schemas, R.keys, (types) => RTE.right(types)),
    ),
    RTE.bind('missingSchemas', (scope) =>
      pipe(
        scope.repository.types,
        R.keys,
        A.difference(string.Eq)(scope.schemaTypes),
        (missingSchemas) => RTE.right(missingSchemas),
      ),
    ),
    RTE.chainW(
      RTE.fromPredicate(
        (scope) => A.isEmpty(scope.missingSchemas),
        (scope) =>
          new Joi.ValidationError(
            MISSING_SCHEMAS_MSG,
            scope.missingSchemas.map((missingSchema) => ({
              message: sprintf(MISSING_SCHEMA_MSG, missingSchema),
            })),
            scope.schemaTypes,
          ),
      ),
    ),
    RTE.map(constVoid),
  )

/**
 * Run during the bootstrap phase. Plugins can use this to define a schema for
 * their options using Joi to validate the options users pass to the plugin.
 *
 * @see https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/#pluginOptionsSchema
 */
export const pluginOptionsSchema: NonNullable<
  gatsby.GatsbyNode['pluginOptionsSchema']
> = (args) => {
  const { Joi } = args

  const schema = Joi.object({
    repositoryName: Joi.string().required(),
    accessToken: Joi.string(),
    apiEndpoint: Joi.string().default((parent) =>
      prismic.getEndpoint(parent.repositoryName),
    ),
    customTypesApiToken: Joi.string(),
    customTypesApiEndpoint: Joi.string(),
    releaseID: Joi.string(),
    fetchLinks: Joi.array().items(Joi.string().required()),
    graphQuery: Joi.string(),
    lang: Joi.string().default(DEFAULT_LANG),
    linkResolver: Joi.function(),
    htmlSerializer: Joi.function(),
    schemas: Joi.object(),
    imageImgixParams: Joi.object().default(DEFAULT_IMGIX_PARAMS),
    imagePlaceholderImgixParams: Joi.object().default(
      DEFAULT_PLACEHOLDER_IMGIX_PARAMS,
    ),
    typePrefix: Joi.string(),
    webhookSecret: Joi.string(),
    createRemoteFileNode: Joi.function().default(
      () => gatsbyFs.createRemoteFileNode,
    ),
    transformFieldName: Joi.function().default(() => (fieldName: string) =>
      fieldName.replace(/-/g, '_'),
    ),
  })
    .or('schemas', 'customTypesApiToken')
    .oxor('fetchLinks', 'graphQuery')
    .external(
      async (pluginOptions: PluginOptions) =>
        await pipe(
          externalCustomTypeFetchingProgram(Joi)({ pluginOptions }),
          TE.fold(
            (error) =>
              // Non-ValidationErrors are used for flow control, so we can
              // ignore the error if it isn't specifically one made for Joi.
              error instanceof Joi.ValidationError
                ? throwError(error)
                : T.of(void 0),
            (p) => T.of(p),
          ),
        )(),
    )
    .external(
      async (pluginOptions: PluginOptions) =>
        await pipe(
          externalValidationProgram(Joi)({ pluginOptions }),
          TE.fold(throwError, () => T.of(void 0)),
        )(),
    )

  return schema
}

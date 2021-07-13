import * as gqlc from 'graphql-compose'
import * as gatsbyFs from 'gatsby-source-filesystem'
import * as imgixGatsby from '@imgix/gatsby/dist/pluginHelpers'
import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as O from 'fp-ts/Option'
import * as S from 'fp-ts/Semigroup'
import * as A from 'fp-ts/Array'
import * as R from 'fp-ts/Record'
import { constNull, pipe } from 'fp-ts/function'

import { sanitizeImageURL } from '../lib/sanitizeImageURL'
import { stripURLQueryParameters } from '../lib/stripURLParameters'

import { Dependencies } from '../types'

/**
 * Returns the URL of an image from the value of an Image field.
 *
 * @param source Image field data.
 *
 * @returns The URL of the image if an image is provided, `null` otherwise.
 */
const resolveUrl = (source: prismicT.ImageField): string | null =>
  source.url
    ? sanitizeImageURL(stripURLQueryParameters(source.url))
    : source.url

/**
 * Returns the width of an image from the value of an Image field.
 *
 * @param source Image field data.
 *
 * @returns The width of the image if an image is provided, `undefined` otherwise.
 */
const resolveWidth = (source: prismicT.ImageField): number | undefined =>
  source.dimensions?.width

/**
 * Returns the height of an image from the value of an Image field.
 *
 * @param source Image field data.
 *
 * @returns The height of the image if an image is provided, `undefined` otherwise.
 */
const resolveHeight = (source: prismicT.ImageField): number | undefined =>
  source.dimensions?.height

/**
 * The minimum required GraphQL argument properties for an `@imgix/gatsby` field.
 */
interface ImgixGatsbyFieldArgsLike {
  imgixParams: Record<string, string | number | boolean>
}

/**
 * Modifies an `@imgix/gatsby` GraphQL field config to retain existing Imgix
 * parameters set on the source URL.
 *
 * This is needed if the source URL contains parameters like `rect` (crops an
 * image). Without this config enhancer, the `rect` parameter would be removed.
 *
 * @param fieldConfig GraphQL field config object to be enhanced.
 *
 * @returns `fieldConfig` with the ability to retain existing Imgix parameters on the source URL.
 */
const withExistingURLImgixParameters = <
  TContext,
  TArgs extends ImgixGatsbyFieldArgsLike,
>(
  fieldConfig: gqlc.ObjectTypeComposerFieldConfigAsObjectDefinition<
    prismicT.ImageField,
    TContext,
    TArgs
  >,
): typeof fieldConfig => ({
  ...fieldConfig,
  resolve: (source, args, ...rest) =>
    pipe(
      O.Do,
      O.bind('url', () =>
        O.fromNullable(source.url ? new URL(source.url) : null),
      ),
      O.bind('existingImgixParams', (scope) =>
        pipe(
          [...scope.url.searchParams.entries()],
          R.fromFoldable(S.last<string>(), A.Foldable),
          O.of,
        ),
      ),
      O.map((scope) =>
        fieldConfig.resolve?.(
          source,
          {
            ...args,
            imgixParams: {
              ...scope.existingImgixParams,
              ...args.imgixParams,
            },
          },
          ...rest,
        ),
      ),
      O.getOrElseW(constNull),
    ),
})

/**
 * Builds a GraphQL field configuration object to be used as part of another
 * Image field GraphQL configuration object. For example, this base
 * configuration object could be added to a config for the thumbnails of an
 * Image field.
 */
export const buildImageBaseFieldConfigMap: RTE.ReaderTaskEither<
  Dependencies,
  never,
  gqlc.ObjectTypeComposerFieldConfigMapDefinition<prismicT.ImageField, unknown>
> = pipe(
  RTE.ask<Dependencies>(),
  RTE.bind('imgixTypes', (scope) =>
    RTE.right(
      imgixGatsby.createImgixGatsbyTypes({
        // IMPORTANT: These options need to be kept in sync with the options at
        // packages/gatsby-source-prismic/src/builders/buildImgixImageTypes.ts
        cache: scope.cache,
        resolveUrl,
        resolveWidth,
        resolveHeight,
        defaultParams: scope.pluginOptions.imageImgixParams,
        namespace: 'Imgix',
      }),
    ),
  ),
  RTE.bind('urlField', (scope) =>
    RTE.right(withExistingURLImgixParameters(scope.imgixTypes.fields.url)),
  ),
  RTE.bind('fixedField', (scope) =>
    RTE.right(withExistingURLImgixParameters(scope.imgixTypes.fields.fixed)),
  ),
  RTE.bind('fluidField', (scope) =>
    RTE.right(withExistingURLImgixParameters(scope.imgixTypes.fields.fluid)),
  ),
  RTE.bind('gatsbyImageDataField', (scope) =>
    pipe(
      RTE.right(
        withExistingURLImgixParameters(scope.imgixTypes.fields.gatsbyImageData),
      ),
      // This field is 'JSON!' by default (i.e. non-nullable). If an image is
      // not set in Prismic, however, this field throws a GraphQL error saying a
      // non-nullable field was returned a null value. This should not happen
      // since the field is nested in a nullable object type, but it happens
      // anyway.
      //
      // We're making the field nullable manually here.
      RTE.chainFirst((field) => RTE.fromIO(() => (field.type = 'JSON'))),
    ),
  ),
  RTE.map((scope) => ({
    alt: 'String',
    copyright: 'String',
    dimensions: scope.globalNodeHelpers.createTypeName('ImageDimensionsType'),
    url: scope.urlField,
    fixed: scope.fixedField,
    fluid: scope.fluidField,
    gatsbyImageData: scope.gatsbyImageDataField,
    localFile: {
      type: 'File',
      resolve: async (
        source: prismicT.ImageField,
      ): Promise<gatsbyFs.FileSystemNode | null> =>
        source.url
          ? await scope.createRemoteFileNode({
              url: source.url,
              store: scope.store,
              cache: scope.cache,
              createNode: scope.createNode,
              createNodeId: scope.createNodeId,
              reporter: scope.reporter,
            })
          : null,
    },
  })),
)

import * as prismicH from '@prismicio/helpers'
import * as prismicT from '@prismicio/types'
import * as gatsbyPrismic from 'gatsby-source-prismic'
import * as RE from 'fp-ts/ReaderEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { NodeHelpers } from 'gatsby-node-helpers'

import {
  FieldNameTransformer,
  PluginOptions,
  PrismicAPIDocumentNodeInput,
} from '../types'

import * as documentDataFieldProxy from '../fieldProxies/documentDataFieldProxy'
import * as documentFieldProxy from '../fieldProxies/documentFieldProxy'
import * as groupFieldProxy from '../fieldProxies/groupFieldProxy'
import * as imageFieldProxy from '../fieldProxies/imageFieldProxy'
import * as linkFieldProxy from '../fieldProxies/linkFieldProxy'
import * as sliceFieldProxy from '../fieldProxies/sliceFieldProxy'
import * as slicesFieldProxy from '../fieldProxies/slicesFieldProxy'
import * as structuredTextFieldProxy from '../fieldProxies/structuredTextFieldProxy'

import { serializePath } from './serializePath'
import { refineFieldValue } from './refineFieldValue'

export interface ProxyDocumentSubtreeEnv {
  getTypePath(path: string[]): gatsbyPrismic.PrismicTypePathType | undefined
  getNode(id: string): PrismicAPIDocumentNodeInput | undefined
  linkResolver: prismicH.LinkResolverFunction
  htmlSerializer?: prismicH.HTMLMapSerializer | prismicH.HTMLFunctionSerializer
  imageImgixParams: PluginOptions['imageImgixParams']
  imagePlaceholderImgixParams: PluginOptions['imagePlaceholderImgixParams']
  nodeHelpers: NodeHelpers
  createContentDigest<T>(input: T): string
  transformFieldName: FieldNameTransformer
}

export const proxyDocumentSubtree = (
  path: string[],
  value: unknown,
): RE.ReaderEither<ProxyDocumentSubtreeEnv, Error, unknown> =>
  pipe(
    RE.ask<ProxyDocumentSubtreeEnv>(),
    RE.bindW('type', (env) =>
      pipe(
        O.fromNullable(env.getTypePath(path)),
        RE.fromOption(
          () => new Error(`No type for path: ${serializePath(path)}`),
        ),
      ),
    ),
    RE.chain((env) => {
      switch (env.type) {
        case gatsbyPrismic.PrismicSpecialType.Document: {
          return pipe(
            value,
            refineFieldValue(
              documentFieldProxy.valueRefinement,
              env.type,
              path,
            ),
            RE.chainW((value) => documentFieldProxy.proxyValue(path, value)),
          )
        }

        case gatsbyPrismic.PrismicSpecialType.DocumentData: {
          return pipe(
            value,
            refineFieldValue(
              documentDataFieldProxy.valueRefinement,
              env.type,
              path,
            ),
            RE.chainW((value) =>
              documentDataFieldProxy.proxyValue(path, value),
            ),
          )
        }

        case prismicT.CustomTypeModelFieldType.Group: {
          return pipe(
            value,
            refineFieldValue(groupFieldProxy.valueRefinement, env.type, path),
            RE.chain((value) => groupFieldProxy.proxyValue(path, value)),
          )
        }

        case prismicT.CustomTypeModelFieldType.Slices: {
          return pipe(
            value,
            refineFieldValue(slicesFieldProxy.valueRefinement, env.type, path),
            RE.chain((value) => slicesFieldProxy.proxyValue(path, value)),
          )
        }

        case prismicT.CustomTypeModelSliceType.Slice: {
          return pipe(
            value,
            refineFieldValue(sliceFieldProxy.valueRefinement, env.type, path),
            RE.chain((value) => sliceFieldProxy.proxyValue(path, value)),
          )
        }

        case prismicT.CustomTypeModelFieldType.Link: {
          return pipe(
            value,
            refineFieldValue(linkFieldProxy.valueRefinement, env.type, path),
            RE.chain(linkFieldProxy.proxyValue),
          )
        }

        case prismicT.CustomTypeModelFieldType.Image: {
          return pipe(
            value,
            refineFieldValue(imageFieldProxy.valueRefinement, env.type, path),
            RE.chain((value) => imageFieldProxy.proxyValue(value, path)),
          )
        }

        case prismicT.CustomTypeModelFieldType.StructuredText: {
          return pipe(
            value,
            refineFieldValue(
              structuredTextFieldProxy.valueRefinement,
              env.type,
              path,
            ),
            RE.chain(structuredTextFieldProxy.proxyValue),
          )
        }

        case prismicT.CustomTypeModelFieldType.Boolean:
        case prismicT.CustomTypeModelFieldType.Color:
        case prismicT.CustomTypeModelFieldType.Date:
        case prismicT.CustomTypeModelFieldType.Embed:
        case prismicT.CustomTypeModelFieldType.GeoPoint:
        case prismicT.CustomTypeModelFieldType.Number:
        case prismicT.CustomTypeModelFieldType.Select:
        case prismicT.CustomTypeModelFieldType.Text:
        case prismicT.CustomTypeModelFieldType.Timestamp:
        case prismicT.CustomTypeModelFieldType.UID:
        default: {
          return RE.of(value)
        }
      }
    }),
  )

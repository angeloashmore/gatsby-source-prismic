import * as prismicT from '@prismicio/types'
import * as RE from 'fp-ts/ReaderEither'
import * as A from 'fp-ts/Array'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/function'

import {
  proxyDocumentSubtree,
  ProxyDocumentSubtreeEnv,
} from '../lib/proxyDocumentSubtree'
import { mapRecordIndices } from '../lib/mapRecordIndices'

export const valueRefinement = (value: unknown): value is prismicT.Slice =>
  typeof value === 'object' && value !== null && 'slice_type' in value

export const proxyValue = (
  path: string[],
  fieldValue: prismicT.Slice,
): RE.ReaderEither<ProxyDocumentSubtreeEnv, Error, unknown> =>
  pipe(
    RE.ask<ProxyDocumentSubtreeEnv>(),
    RE.bind('primary', (env) =>
      pipe(
        fieldValue.primary ?? {},
        mapRecordIndices(env.transformFieldName),
        R.mapWithIndex((fieldName, value) =>
          proxyDocumentSubtree([...path, 'primary', fieldName], value),
        ),
        R.sequence(RE.Applicative),
      ),
    ),
    RE.bind('items', (env) =>
      pipe(
        fieldValue.items ?? [],
        A.map((item) =>
          pipe(
            item,
            mapRecordIndices(env.transformFieldName),
            R.mapWithIndex((fieldName, value) =>
              proxyDocumentSubtree([...path, 'items', fieldName], value),
            ),
            R.sequence(RE.Applicative),
          ),
        ),
        RE.sequenceArray,
      ),
    ),
    RE.bind('id', (env) =>
      RE.of(
        env.nodeHelpers.createNodeId([
          ...path,
          env.createContentDigest(fieldValue),
        ]),
      ),
    ),
    RE.bind('__typename', (env) => RE.of(env.nodeHelpers.createTypeName(path))),
    RE.map((env) => ({
      ...fieldValue,
      __typename: env.__typename,
      id: env.id,
      primary: env.primary,
      items: env.items,
    })),
  )

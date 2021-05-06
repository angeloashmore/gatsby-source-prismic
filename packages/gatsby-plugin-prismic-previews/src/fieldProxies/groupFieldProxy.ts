import * as RE from 'fp-ts/ReaderEither'
import * as A from 'fp-ts/Array'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/function'

import { UnknownRecord } from '../types'
import {
  proxyDocumentSubtree,
  ProxyDocumentSubtreeEnv,
} from '../lib/proxyDocumentSubtree'
import { mapRecordIndices } from '../lib/mapRecordIndices'

export const valueRefinement = (value: unknown): value is UnknownRecord[] =>
  Array.isArray(value) &&
  value.every((element) => typeof element === 'object' && element !== null)

export const proxyValue = (
  path: string[],
  fieldValue: UnknownRecord[],
): RE.ReaderEither<ProxyDocumentSubtreeEnv, Error, unknown> =>
  pipe(
    RE.ask<ProxyDocumentSubtreeEnv>(),
    RE.chain((env) =>
      pipe(
        fieldValue,
        A.map((fieldValueElement) =>
          pipe(
            fieldValueElement,
            mapRecordIndices(env.transformFieldName),
            R.mapWithIndex((fieldName, value) =>
              proxyDocumentSubtree([...path, fieldName], value),
            ),
            R.sequence(RE.Applicative),
          ),
        ),
        RE.sequenceArray,
      ),
    ),
  )

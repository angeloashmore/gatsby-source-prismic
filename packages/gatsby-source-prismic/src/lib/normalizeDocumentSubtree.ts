import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as R from 'fp-ts/Record'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'
import { pipe } from 'fp-ts/function'
import { Stringable } from 'gatsby-node-helpers'

import { Dependencies, PrismicSpecialType, UnknownRecord } from '../types'

import { getTypePath } from './getTypePath'
import { createNodeOfType } from './createNodeOfType'

/**
 * Determines if a value is a record.
 *
 * @param value Value to check.
 *
 * @returns `true` if the value is a record, `false` otherwise.
 */
const unknownRecordRefinement = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Determines if a value is an array of records.
 *
 * @param value Value to check.
 *
 * @returns `true` if the value is an array of records, `false` otherwise.
 */
const unknownRecordArrayValueRefinement = (
  value: unknown,
): value is UnknownRecord[] =>
  Array.isArray(value) && value.every(unknownRecordRefinement)

/**
 * Determines if a value is an Embed field.
 *
 * @param value Value to check.
 *
 * @returns `true` if the value is an Embed field, `false` otherwise.
 */
const embedValueRefinement = (value: unknown): value is prismicT.EmbedField =>
  unknownRecordRefinement(value) && 'embed_url' in value

/**
 * Determines if a value is a Slice.
 *
 * @param value Value to check.
 *
 * @returns `true` if the value is a Slice, `false` otherwise.
 */
const sliceValueRefinement = (value: unknown): value is prismicT.Slice =>
  unknownRecordRefinement(value) && 'slice_type' in value

/**
 * Determines if a value is a Slice Zone.
 *
 * @param value Value to check.
 *
 * @returns `true` if the value is a Slice Zone, `false` otherwise.
 */
const slicesValueRefinement = (value: unknown): value is prismicT.SliceZone =>
  Array.isArray(value) && value.every(sliceValueRefinement)

/**
 * Determines if the value is Stringable (has a `toString()` method).
 *
 * @param value Value to check.
 *
 * @returns `true` if the value is Stringable, `false` otherwise.
 */
const stringableRefinement = (value: unknown): value is Stringable =>
  (typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'string' ||
    typeof value === 'symbol' ||
    typeof value === 'function' ||
    typeof value === 'object') &&
  value != null &&
  Boolean(value.toString)

/**
 * Normalizes a record within a Prismic document. It normalizes each field
 * individually.
 *
 * @param path Path to the record.
 * @param value The record to normalize.
 *
 * @returns A normalized version of `value`.
 */
const normalizeDocumentRecord = (
  path: string[],
  value: UnknownRecord,
): RTE.ReaderTaskEither<Dependencies, never, UnknownRecord> =>
  pipe(
    value,
    R.mapWithIndex((prop, propValue) =>
      normalizeDocumentSubtree([...path, prop], propValue),
    ),
    R.sequence(RTE.ApplicativeSeq),
  )

/**
 * Traverses a subtree from a Prismic document and normalizes values as needed.
 * This function may process the subtree recursively.
 *
 * @param path Path to the subtree.
 * @param value The subtree to normalize.
 *
 * @returns A normalized version of `value`.
 */
export const normalizeDocumentSubtree = (
  path: string[],
  value: unknown,
): RTE.ReaderTaskEither<Dependencies, never, unknown> =>
  pipe(
    RTE.ask<Dependencies>(),
    RTE.bind('typePath', () => getTypePath(path)),
    RTE.bind('type', (env) => RTE.right(env.typePath.type)),
    RTE.chain((env) => {
      switch (env.typePath.type) {
        case PrismicSpecialType.Document:
        case PrismicSpecialType.DocumentData: {
          return pipe(
            value,
            RTE.fromPredicate(
              unknownRecordRefinement,
              () =>
                new Error(
                  `Field value does not match the type declared in its type path: ${env.type}`,
                ),
            ),
            RTE.chainW((value) => normalizeDocumentRecord(path, value)),
          )
        }

        case prismicT.CustomTypeModelFieldType.Group: {
          return pipe(
            value,
            RTE.fromPredicate(
              unknownRecordArrayValueRefinement,
              () =>
                new Error(
                  `Field value does not match the type declared in its type path: ${env.type}`,
                ),
            ),
            RTE.map(A.map((item) => normalizeDocumentRecord(path, item))),
            RTE.chainW(RTE.sequenceArray),
          )
        }

        case prismicT.CustomTypeModelFieldType.Slices: {
          return pipe(
            value,
            RTE.fromPredicate(
              slicesValueRefinement,
              () =>
                new Error(
                  `Field value does not match the type declared in its type path: ${env.type}`,
                ),
            ),
            RTE.map(
              A.map((item) =>
                normalizeDocumentSubtree([...path, item.slice_type], item),
              ),
            ),
            RTE.chainW(RTE.sequenceArray),
          )
        }

        case prismicT.CustomTypeModelSliceType.Slice: {
          return pipe(
            value,
            RTE.fromPredicate(
              sliceValueRefinement,
              () =>
                new Error(
                  `Field value does not match the type declared in its type path: ${env.type}`,
                ),
            ),
            RTE.bindTo('value'),
            RTE.bindW('primary', (scope) =>
              normalizeDocumentRecord(
                [...path, 'primary'],
                scope.value.primary,
              ),
            ),
            RTE.bindW('items', (scope) =>
              pipe(
                scope.value.items,
                A.map((item) =>
                  normalizeDocumentRecord([...path, 'items'], item),
                ),
                RTE.sequenceArray,
              ),
            ),
            RTE.map((scope) => ({
              ...scope.value,
              primary: scope.primary,
              items: scope.items,
            })),
          )
        }

        case prismicT.CustomTypeModelFieldType.Embed: {
          return pipe(
            value,
            RTE.fromPredicate(
              embedValueRefinement,
              () =>
                new Error(
                  `Field value does not match the type declared in its type path: ${env.type}`,
                ),
            ),
            RTE.bindTo('value'),
            RTE.bind('id', (scope) =>
              pipe(
                R.lookup('embed_url', scope.value),
                RTE.fromOption(
                  () => new Error('Embed URL field does not exist'),
                ),
                RTE.filterOrElse(
                  (url): url is string => typeof url === 'string',
                  () => new Error('Embed URL field is not a string'),
                ),
                RTE.map(env.nodeHelpers.createNodeId),
              ),
            ),
            RTE.chainW((scope) =>
              // This type name matches the method used in
              // `buildEmbedFieldConfig`.
              createNodeOfType({ ...scope.value, id: scope.id }, 'EmbedType'),
            ),
            RTE.map((node) => node.id),
          )
        }

        case prismicT.CustomTypeModelFieldType.IntegrationFields: {
          return pipe(
            value,
            RTE.fromPredicate(
              unknownRecordRefinement,
              () => new Error('Field value is not a plain object'),
            ),
            RTE.bindTo('value'),
            RTE.bind('id', (scope) =>
              pipe(
                scope.value,
                R.lookup('id'),
                O.filter(stringableRefinement),
                O.getOrElseW(() => env.createContentDigest(scope.value)),
                (id) => RTE.right(id),
              ),
            ),
            RTE.chainW((scope) =>
              createNodeOfType({ ...scope.value, id: scope.id }, [
                ...path,
                'IntegrationType',
              ]),
            ),
            RTE.map((node) => node.id),
          )
        }

        case prismicT.CustomTypeModelFieldType.Boolean:
        case prismicT.CustomTypeModelFieldType.Color:
        case prismicT.CustomTypeModelFieldType.Date:
        case prismicT.CustomTypeModelFieldType.GeoPoint:
        case prismicT.CustomTypeModelFieldType.Image:
        case prismicT.CustomTypeModelFieldType.Link:
        case prismicT.CustomTypeModelFieldType.Number:
        case prismicT.CustomTypeModelFieldType.Select:
        case prismicT.CustomTypeModelFieldType.StructuredText:
        case prismicT.CustomTypeModelFieldType.Text:
        case prismicT.CustomTypeModelFieldType.Timestamp:
        case prismicT.CustomTypeModelFieldType.UID:
        case PrismicSpecialType.Unknown:
        default: {
          return RTE.throwError(
            new Error('Normalization not necessary for this value.'),
          )
        }
      }
    }),
    // If a normalizer fails or no normalizer exists for the subtree, keep the
    // subtree as is.
    RTE.orElse(() => RTE.right(value)),
  )

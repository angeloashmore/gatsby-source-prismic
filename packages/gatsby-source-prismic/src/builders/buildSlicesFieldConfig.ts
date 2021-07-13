import * as gatsby from 'gatsby'
import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as R from 'fp-ts/Record'
import * as A from 'fp-ts/Array'
import { pipe, flow, identity } from 'fp-ts/function'

import { buildObjectType } from '../lib/buildObjectType'
import { buildSchemaRecordType } from '../lib/buildSchemaRecordType'
import { buildUnionType } from '../lib/buildUnionType'
import { getTypeName } from '../lib/getTypeName'
import { listTypeName } from '../lib/listTypeName'
import { createType } from '../lib/createType'
import { createTypes } from '../lib/createTypes'
import { createTypePath } from '../lib/createTypePath'

import { Dependencies, FieldConfigCreator, UnknownRecord } from '../types'

/**
 * Builds a GraphQL field configuration object for a Slice zone's Slice. Both
 * `non-repeat` and `repeat` schemas will be converted to GraphQL field
 * configuration objects. The resulting type can be created using Gatsby's
 * `createTypes` action.
 *
 * This function registers a typepath for the field.
 *
 * @param path Path to the Slice zone.
 * @param schema Schema definition for the Slice.
 *
 * @returns GraphQL object type.
 */
const buildSliceChoiceType = (
  path: string[],
  schema: prismicT.CustomTypeModelSlice,
  // schema: PrismicSchemaSlice,
): RTE.ReaderTaskEither<Dependencies, never, gatsby.GatsbyGraphQLObjectType> =>
  pipe(
    RTE.ask<Dependencies>(),
    RTE.chainFirst(() =>
      createTypePath(path, prismicT.CustomTypeModelSliceType.Slice),
    ),
    RTE.chain((deps) =>
      pipe(
        {} as Record<
          'primary' | 'items',
          RTE.ReaderTaskEither<
            Dependencies,
            never,
            gatsby.GatsbyGraphQLObjectType
          >
        >,
        R.isEmpty(schema['non-repeat'])
          ? identity
          : R.upsertAt(
              'primary',
              buildSchemaRecordType([...path, 'primary'], schema['non-repeat']),
            ),
        R.isEmpty(schema.repeat)
          ? identity
          : R.upsertAt(
              'items',
              buildSchemaRecordType([...path, 'items'], schema.repeat, [
                ...path,
                'item',
              ]),
            ),
        R.sequence(RTE.ApplicativeSeq),
        RTE.chainFirst(
          flow(
            R.collect((_, type) => type),
            createTypes,
          ),
        ),
        RTE.map(
          R.mapWithIndex((field, type) =>
            field === 'items'
              ? pipe(type, getTypeName, listTypeName)
              : getTypeName(type),
          ),
        ),
        RTE.chain((fields) =>
          buildObjectType({
            name: deps.nodeHelpers.createTypeName(path),
            fields: {
              ...fields,
              id: {
                type: 'ID!',
                resolve: (source: UnknownRecord): string =>
                  deps.nodeHelpers.createNodeId([
                    ...path,
                    deps.createContentDigest(source),
                  ]),
              },
              slice_type: 'String!',
              slice_label: 'String',
            },
            interfaces: [deps.globalNodeHelpers.createTypeName('SliceType')],
            extensions: { infer: false },
          }),
        ),
      ),
    ),
  )

/**
 * Builds GraphQL types for Slice Custom Type fields. The resulting types can
 * be created using Gatsby's `createTypes` action.
 *
 * @param path Path to the fields.
 * @param choices Record of Slice choices mapping a Slice API ID to its schema definition.
 *
 * @returns List of GraphQL types for the provided Slice schemas.
 */
const buildSliceTypes = (
  path: string[],
  choices: prismicT.CustomTypeModelSliceZoneField['config']['choices'],
): RTE.ReaderTaskEither<
  Dependencies,
  never,
  gatsby.GatsbyGraphQLObjectType[]
> =>
  pipe(
    choices,
    // TODO: We only support standard Slices. SharedSlices will not be supported
    // until Slice Machine is integrated.
    R.filter(
      (slice): slice is prismicT.CustomTypeModelSlice =>
        slice.type === prismicT.CustomTypeModelSliceType.Slice,
    ),
    R.mapWithIndex((sliceName, sliceSchema) =>
      buildSliceChoiceType(pipe(path, A.append(sliceName)), sliceSchema),
    ),
    R.sequence(RTE.ApplicativeSeq),
    RTE.map(R.collect((_, type) => type)),
  )

/**
 * Builds a GraphQL field configuration object for a Slices Custom Type field
 * (also known as a Slice zone). The resulting configuration object can be used
 * in a GraphQL type.
 *
 * This function registers a typepath for the field.
 *
 * @param path Path to the field.
 * @param schema Schema definition for the field.
 *
 * @returns GraphQL field configuration object.
 */
export const buildSlicesFieldConfig: FieldConfigCreator<prismicT.CustomTypeModelSliceZoneField> =
  (path, schema) =>
    pipe(
      RTE.ask<Dependencies>(),
      RTE.chainFirst(() =>
        createTypePath(path, prismicT.CustomTypeModelFieldType.Slices),
      ),
      RTE.chain((deps) =>
        pipe(
          buildSliceTypes(path, schema.config.choices),
          RTE.chainFirst(createTypes),
          RTE.map(A.map(getTypeName)),
          RTE.chain((types) =>
            buildUnionType({
              name: deps.nodeHelpers.createTypeName([...path, 'SlicesType']),
              types,
              resolveType: (source: prismicT.Slice) =>
                deps.nodeHelpers.createTypeName([...path, source.slice_type]),
            }),
          ),
          RTE.chainFirst(createType),
          RTE.map(getTypeName),
          RTE.map(listTypeName),
        ),
      ),
    )

import * as gqlc from 'graphql-compose'
import * as prismicT from '@prismicio/types'
import * as RTE from 'fp-ts/ReaderTaskEither'

import { Dependencies } from '../types'

import { buildBooleanFieldConfig } from '../builders/buildBooleanFieldConfig'
import { buildColorFieldConfig } from '../builders/buildColorFieldConfig'
import { buildDateFieldConfig } from '../builders/buildDateFieldConfig'
import { buildEmbedFieldConfig } from '../builders/buildEmbedFieldConfig'
import { buildGeoPointFieldConfig } from '../builders/buildGeoPointFieldConfig'
import { buildGroupFieldConfig } from '../builders/buildGroupFieldConfig'
import { buildImageFieldConfig } from '../builders/buildImageFieldConfig'
import { buildLinkFieldConfig } from '../builders/buildLinkFieldConfig'
import { buildNumberFieldConfig } from '../builders/buildNumberFieldConfig'
import { buildSelectFieldConfig } from '../builders/buildSelectFieldConfig'
import { buildStructuredTextFieldConfig } from '../builders/buildStructuredTextFieldConfig'
import { buildSlicesFieldConfig } from '../builders/buildSlicesFieldConfig'
import { buildTextFieldConfig } from '../builders/buildTextFieldConfig'
import { buildTimestampFieldConfig } from '../builders/buildTimestampFieldConfig'
import { buildUIDFieldConfig } from '../builders/buildUIDFieldConfig'
import { buildUnknownFieldConfig } from '../builders/buildUnknownFieldConfig'
import { buildIntegrationFieldConfig } from '../builders/buildIntegrationFieldConfig'

/**
 * Returns a GraphQL field configuration object for a Custom Type field. The
 * resulting configuration object can be used in a GraphQL type.
 *
 * @param path Path to the field.
 * @param schema Schema definition for the field.
 *
 * @returns GraphQL field configuration object.
 */
export const toFieldConfig = (
  path: string[],
  schema: prismicT.CustomTypeModelField,
): RTE.ReaderTaskEither<
  Dependencies,
  never,
  gqlc.ObjectTypeComposerFieldConfigDefinition<unknown, unknown>
> => {
  switch (schema.type) {
    case prismicT.CustomTypeModelFieldType.Boolean: {
      return buildBooleanFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Color: {
      return buildColorFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Date: {
      return buildDateFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Embed: {
      return buildEmbedFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.GeoPoint: {
      return buildGeoPointFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Group: {
      return buildGroupFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Image: {
      return buildImageFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.IntegrationFields: {
      return buildIntegrationFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Link: {
      return buildLinkFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Number: {
      return buildNumberFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Select: {
      return buildSelectFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Slices: {
      return buildSlicesFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.StructuredText: {
      return buildStructuredTextFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Text: {
      return buildTextFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.Timestamp: {
      return buildTimestampFieldConfig(path, schema)
    }

    case prismicT.CustomTypeModelFieldType.UID: {
      return buildUIDFieldConfig(path, schema)
    }

    default: {
      return buildUnknownFieldConfig(path, schema)
    }
  }
}

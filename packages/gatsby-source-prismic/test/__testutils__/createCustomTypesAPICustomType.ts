import * as crypto from 'crypto'
import * as prismicT from '@prismicio/types'
import * as prismicCustomTypes from '@prismicio/custom-types-client'

export const createCustomTypesAPICustomType = (
  customType?: Partial<prismicCustomTypes.CustomType>,
): prismicCustomTypes.CustomType => {
  const id = crypto
    .createHash('md5')
    .update(Math.random().toString())
    .digest('hex')

  return {
    id: id,
    label: id,
    repeatable: true,
    json: {
      Main: {
        foo: {
          type: prismicT.CustomTypeModelFieldType.Text,
          config: { label: 'Foo' },
        },
      },
    },
    status: true,
    ...customType,
  }
}

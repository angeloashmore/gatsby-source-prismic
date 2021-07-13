import * as prismicT from '@prismicio/types'
import md5 from 'tiny-hashes/md5'

const createId = () => md5(Math.random().toString())

export const createPrismicAPIDocument = <
  TData extends prismicT.PrismicDocument['data'],
>(
  fields?: Partial<prismicT.PrismicDocument<TData>>,
): prismicT.PrismicDocument<TData> => {
  const id = createId()
  const alternateLanguageId1 = createId()
  const alternateLanguageId2 = createId()

  return {
    id,
    uid: id,
    type: 'type',
    href: 'href',
    tags: ['tag'],
    slugs: ['slug'],
    lang: 'lang',
    alternate_languages: [
      {
        id: alternateLanguageId1,
        uid: alternateLanguageId1,
        type: 'type',
        lang: 'alt-lang-1',
      },
      {
        id: alternateLanguageId2,
        uid: alternateLanguageId2,
        type: 'type',
        lang: 'alt-lang-2',
      },
    ],
    first_publication_date: 'first_publication_date',
    last_publication_date: 'last_publication_date',
    url: null,
    linked_documents: [],
    ...fields,
    data: {
      ...fields?.data,
    } as TData,
  }
}

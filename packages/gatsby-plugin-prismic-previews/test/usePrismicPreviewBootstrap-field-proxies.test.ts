import test, { ExecutionContext } from 'ava'
import * as mswNode from 'msw/node'
import * as sinon from 'sinon'
import * as gatsby from 'gatsby'
import * as gatsbyPrismic from 'gatsby-source-prismic'
import * as prismic from '@prismicio/client'
import * as prismicT from '@prismicio/types'
import * as prismicH from '@prismicio/helpers'
import * as cookie from 'es-cookie'
import * as assert from 'assert'
import { renderHook, act, cleanup } from '@testing-library/react-hooks'
import browserEnv from 'browser-env'

import { clearAllCookies } from './__testutils__/clearAllCookies'
import { createAPIQueryMockedRequest } from './__testutils__/createAPIQueryMockedRequest'
import { createGatsbyContext } from './__testutils__/createGatsbyContext'
import { createPluginOptions } from './__testutils__/createPluginOptions'
import { createPreviewRef } from './__testutils__/createPreviewRef'
import { createPrismicAPIDocument } from './__testutils__/createPrismicAPIDocument'
import { createPrismicAPIQueryResponse } from './__testutils__/createPrismicAPIQueryResponse'
import { createTypePathsMockedRequest } from './__testutils__/createTypePathsMockedRequest'
import { polyfillKy } from './__testutils__/polyfillKy'

import {
  PluginOptions,
  PrismicAPIDocumentNodeInput,
  PrismicPreviewProvider,
  PrismicPreviewState,
  PrismicRepositoryConfigs,
  usePrismicPreviewBootstrap,
  usePrismicPreviewContext,
} from '../src'
import { onClientEntry } from '../src/gatsby-browser'
import { IS_PROXY } from '../src/constants'
import { StructuredTextProxyValue } from '../src/fieldProxies/structuredTextFieldProxy'

const createRepositoryConfigs = (
  pluginOptions: PluginOptions,
): PrismicRepositoryConfigs => [
  {
    repositoryName: pluginOptions.repositoryName,
    linkResolver: (doc): string => `/${doc.uid}`,
  },
]

const server = mswNode.setupServer()
test.before(() => {
  polyfillKy()
  browserEnv(['window', 'document'])
  server.listen({ onUnhandledRequest: 'error' })
  window.requestAnimationFrame = function (callback) {
    return setTimeout(callback, 0)
  }
  globalThis.__PATH_PREFIX__ = 'https://example.com'
})
test.beforeEach(() => {
  clearAllCookies()
})
test.afterEach(() => {
  cleanup()
})
test.after(() => {
  server.close()
})

// Opting out of defining a return type here since this is just a test.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const performPreview = async (
  _t: ExecutionContext,
  gatsbyContext: gatsby.BrowserPluginArgs,
  pluginOptions: PluginOptions,
  repositoryConfigs: PrismicRepositoryConfigs,
  queryResponse: prismic.Query,
  typePathsFilename: string,
  typePaths: Record<string, gatsbyPrismic.PrismicTypePathType>,
) => {
  const ref = createPreviewRef(pluginOptions.repositoryName)
  cookie.set(prismic.cookie.preview, ref)

  server.use(createAPIQueryMockedRequest(pluginOptions, queryResponse, { ref }))
  server.use(createTypePathsMockedRequest(typePathsFilename, typePaths))

  await onClientEntry(gatsbyContext, pluginOptions)
  const { result, waitFor } = renderHook(
    () => {
      const context = usePrismicPreviewContext()
      const bootstrap = usePrismicPreviewBootstrap(repositoryConfigs)

      return { bootstrap, context }
    },
    { wrapper: PrismicPreviewProvider },
  )

  act(() => {
    result.current.bootstrap()
  })

  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState ===
        PrismicPreviewState.BOOTSTRAPPING,
    ),
  )
  await waitFor(() =>
    assert.ok(
      result.current.context[0].previewState === PrismicPreviewState.ACTIVE,
    ),
  )

  return result
}

test.serial('document', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  const doc = createPrismicAPIDocument()
  const queryResponse = createPrismicAPIQueryResponse([doc])

  const result = await performPreview(
    t,
    // @ts-expect-error - Partial gatsbyContext provided
    gatsbyContext,
    pluginOptions,
    config,
    queryResponse,
    '8fc72c0f6a5f7e677994a88a89c7c333.json',
    {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
    },
  )

  const node = result.current.context[0].nodes[doc.id]

  t.true(node.__typename === 'PrismicPrefixType')
  t.true(
    node.url ===
      prismicH.asLink(
        prismicH.documentToLinkField(doc),
        config[0].linkResolver,
      ),
  )
})

test.serial(
  'field names with dashes are transformed with underscores by default',
  async (t) => {
    const gatsbyContext = createGatsbyContext()
    const pluginOptions = createPluginOptions(t)
    const config = createRepositoryConfigs(pluginOptions)

    // Note that we are using "structured-text" (with a dash), but the typepaths
    // below use "structured_text" (with an underscore). The transformer will
    // transformer "-" to "_" by default.
    const doc = createPrismicAPIDocument({
      data: {
        'structured-text': [
          {
            type: prismicT.RichTextNodeType.paragraph,
            text: 'foo',
            spans: [],
          },
        ],
      },
    })
    const queryResponse = createPrismicAPIQueryResponse([doc])

    const result = await performPreview(
      t,
      // @ts-expect-error - Partial gatsbyContext provided
      gatsbyContext,
      pluginOptions,
      config,
      queryResponse,
      '104b34900d272bb2aa34ffc29a93afe5.json',
      {
        type: gatsbyPrismic.PrismicSpecialType.Document,
        'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
        'type.data.structured_text':
          prismicT.CustomTypeModelFieldType.StructuredText,
      },
    )

    const node = result.current.context[0].nodes[doc.id]

    t.deepEqual(
      node.data.structured_text as unknown as StructuredTextProxyValue,
      {
        html: '<p>foo</p>',
        text: 'foo',
        raw: doc.data['structured-text'],
      },
    )
  },
)

test.serial(
  'field names are transformed using provided transformFieldName function',
  async (t) => {
    const gatsbyContext = createGatsbyContext()
    const pluginOptions = createPluginOptions(t)
    const config = createRepositoryConfigs(pluginOptions)

    config[0].transformFieldName = (fieldName: string) =>
      fieldName.replace(/-/g, 'CUSTOM')

    // Note that we are using "structuredCUSTOMtext", but the typepaths below
    // use "structured_text" (with an underscore). The transformer will convert
    // the field name.
    const doc = createPrismicAPIDocument({
      data: {
        'structured-text': [
          {
            type: prismicT.RichTextNodeType.paragraph,
            text: 'foo',
            spans: [],
          },
        ],
      },
    })
    const queryResponse = createPrismicAPIQueryResponse([doc])

    const result = await performPreview(
      t,
      // @ts-expect-error - Partial gatsbyContext provided
      gatsbyContext,
      pluginOptions,
      config,
      queryResponse,
      '2ab170ad671b4d65411bcf73ed34a421.json',
      {
        type: gatsbyPrismic.PrismicSpecialType.Document,
        'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
        'type.data.structuredCUSTOMtext':
          prismicT.CustomTypeModelFieldType.StructuredText,
      },
    )

    const node = result.current.context[0].nodes[doc.id]

    t.deepEqual(
      node.data.structuredCUSTOMtext as unknown as StructuredTextProxyValue,
      {
        html: '<p>foo</p>',
        text: 'foo',
        raw: doc.data['structured-text'],
      },
    )
  },
)

test.serial('alternative languages', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  const altLangDoc1 = createPrismicAPIDocument()
  const altLangDoc2 = createPrismicAPIDocument()
  const doc = createPrismicAPIDocument({
    alternate_languages: [
      {
        id: altLangDoc1.id,
        type: altLangDoc1.type,
        lang: 'alt-lang-1',
      },
      {
        id: altLangDoc2.id,
        type: altLangDoc2.type,
        lang: 'alt-lang-2',
      },
    ],
  })
  const queryResponse = createPrismicAPIQueryResponse([
    doc,
    altLangDoc1,
    altLangDoc2,
  ])

  const result = await performPreview(
    t,
    // @ts-expect-error - Partial gatsbyContext provided
    gatsbyContext,
    pluginOptions,
    config,
    queryResponse,
    'da6a5fa194ee3f44d5b0a7e99b6b1db2.json',
    {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
      'type.data.doc_link': prismicT.CustomTypeModelFieldType.Link,
      'type.data.media_link': prismicT.CustomTypeModelFieldType.Link,
    },
  )

  const node = result.current.context[0].nodes[doc.id]
  const altLangNode1 = result.current.context[0].nodes[altLangDoc1.id]
  const altLangNode2 = result.current.context[0].nodes[altLangDoc2.id]

  t.deepEqual(node.alternate_languages, [
    {
      ...doc.alternate_languages[0],
      // @ts-expect-error - This is not part of the base Prismic document type
      raw: doc.alternate_languages[0],
      // Sorry, this is an implementation detail but we need it pass tests.
      [IS_PROXY]: true,
    },
    {
      ...doc.alternate_languages[1],
      // @ts-expect-error - This is not part of the base Prismic document type
      raw: doc.alternate_languages[1],
      // Sorry, this is an implementation detail but we need it pass tests.
      [IS_PROXY]: true,
    },
  ])

  // We must test the document field separately since it is only accessible
  // via the Proxy handler. This field doesn't actually exist in the object.
  t.true(
    // @ts-expect-error - This is not part of the base Prismic document type
    node.alternate_languages[0].document === altLangNode1,
  )
  t.true(
    // @ts-expect-error - This is not part of the base Prismic document type
    node.alternate_languages[1].document === altLangNode2,
  )
})

test.serial('structured text', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  const doc = createPrismicAPIDocument({
    data: {
      structured_text: [
        {
          type: prismicT.RichTextNodeType.paragraph,
          text: 'foo',
          spans: [],
        },
      ],
    },
  })
  const queryResponse = createPrismicAPIQueryResponse([doc])

  const result = await performPreview(
    t,
    // @ts-expect-error - Partial gatsbyContext provided
    gatsbyContext,
    pluginOptions,
    config,
    queryResponse,
    '954379fb96a66a39a27fd9f39a34d214.json',
    {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
      'type.data.structured_text':
        prismicT.CustomTypeModelFieldType.StructuredText,
    },
  )

  const node = result.current.context[0].nodes[doc.id]

  t.deepEqual(
    node.data.structured_text as unknown as StructuredTextProxyValue,
    {
      html: '<p>foo</p>',
      text: 'foo',
      raw: doc.data.structured_text,
    },
  )
})

test.serial('link', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  const linkedDoc = createPrismicAPIDocument()
  const doc = createPrismicAPIDocument({
    data: {
      doc_link: {
        link_type: prismicT.LinkType.Document,
        id: linkedDoc.id,
        uid: linkedDoc.uid,
      },
      media_link: {
        link_type: prismicT.LinkType.Media,
        url: 'https://example.com/image.jpg',
      },
    },
  })
  const queryResponse = createPrismicAPIQueryResponse([doc, linkedDoc])

  const result = await performPreview(
    t,
    // @ts-expect-error - Partial gatsbyContext provided
    gatsbyContext,
    pluginOptions,
    config,
    queryResponse,
    '7426ae6d263497631ef63844cc225cac.json',
    {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
      'type.data.doc_link': prismicT.CustomTypeModelFieldType.Link,
      'type.data.media_link': prismicT.CustomTypeModelFieldType.Link,
    },
  )

  const node = result.current.context[0].nodes[doc.id]
  const linkedNode = result.current.context[0].nodes[linkedDoc.id]

  t.deepEqual(node.data.doc_link, {
    ...doc.data.doc_link,
    url: prismicH.asLink(
      prismicH.documentToLinkField(linkedDoc),
      config[0].linkResolver,
    ),
    localFile: null,
    raw: doc.data.doc_link,
    // Sorry, this is an implementation detail but we need it pass tests.
    [IS_PROXY]: true,
  })

  // We must test the document field separately since it is only accessible
  // via the Proxy handler. This field doesn't actually exist in the object.
  t.true(
    (node.data.doc_link as Record<string, unknown>).document === linkedNode,
  )

  t.deepEqual(node.data.media_link, {
    ...doc.data.media_link,
    localFile: {
      publicURL: doc.data.media_link.url,
    },
    raw: doc.data.media_link,
    // Sorry, this is an implementation detail but we need it pass tests.
    [IS_PROXY]: true,
  })
})

test.serial('image', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  const doc = createPrismicAPIDocument({
    data: {
      image: {
        dimensions: { width: 400, height: 300 },
        alt: 'alt',
        copyright: 'copyright',
        url: 'https://example.com/image.jpg',
        Thumb1: {
          dimensions: { width: 400, height: 300 },
          alt: 'alt',
          copyright: 'copyright',
          url: 'https://example.com/thumb1.jpg',
        },
        Thumb2: {
          dimensions: { width: 400, height: 300 },
          alt: 'alt',
          copyright: 'copyright',
          url: 'https://example.com/thumb2.jpg',
        },
      },
    },
  })
  const queryResponse = createPrismicAPIQueryResponse([doc])

  const result = await performPreview(
    t,
    // @ts-expect-error - Partial gatsbyContext provided
    gatsbyContext,
    pluginOptions,
    config,
    queryResponse,
    '74f723ca5fab771b7a6273d8da3c5d77.json',
    {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
      'type.data.image': prismicT.CustomTypeModelFieldType.Image,
    },
  )

  const node = result.current.context[0].nodes[doc.id]

  const fixedFields = {
    width: sinon.match.number,
    height: sinon.match.number,
    src: sinon.match.string,
    srcSet: sinon.match.string,
    srcWebp: sinon.match.string,
    srcSetWebp: sinon.match.string,
  }

  const fluidFields = {
    aspectRatio: sinon.match.number,
    src: sinon.match.string,
    srcSet: sinon.match.string,
    sizes: sinon.match.string,
    srcWebp: sinon.match.string,
    srcSetWebp: sinon.match.string,
  }

  const gatsbyImageDataFields = {
    images: sinon.match.any,
    layout: sinon.match.string,
    backgroundColor: sinon.match.any,
    width: sinon.match.number,
    height: sinon.match.number,
  }

  const localFileFields = {
    childImageSharp: {
      fixed: fixedFields,
      fluid: fluidFields,
      gatsbyImageData: gatsbyImageDataFields,
    },
  }

  t.notThrows(() =>
    sinon.assert.match(
      node.data.image,
      sinon.match({
        dimensions: doc.data.image.dimensions,
        alt: doc.data.image.alt,
        copyright: doc.data.image.copyright,
        url: doc.data.image.url,
        fixed: fixedFields,
        fluid: fluidFields,
        gatsbyImageData: sinon.match(gatsbyImageDataFields),
        localFile: localFileFields,
        thumbnails: {
          Thumb1: {
            ...doc.data.image.Thumb1,
            fixed: fixedFields,
            fluid: fluidFields,
            gatsbyImageData: sinon.match(gatsbyImageDataFields),
            localFile: localFileFields,
          },
          Thumb2: {
            ...doc.data.image.Thumb2,
            fixed: fixedFields,
            fluid: fluidFields,
            gatsbyImageData: sinon.match(gatsbyImageDataFields),
            localFile: localFileFields,
          },
        },
      }),
    ),
  )
})

test.serial(
  'image retains existing URL parameters unless replaced by gatsby-plugin-image or gatsby-image',
  async (t) => {
    const gatsbyContext = createGatsbyContext()
    const pluginOptions = createPluginOptions(t)
    const config = createRepositoryConfigs(pluginOptions)

    // We want to leave `rect` untouched. We're adding the `w=1` parameter to
    // ensure that it is replaced by the resolver to properly support responsive
    // images.
    const originalUrl = new URL(
      'https://example.com/image.png?rect=0,0,100,200&w=1',
    )
    const doc = createPrismicAPIDocument({
      data: {
        image: {
          dimensions: { width: 400, height: 300 },
          alt: 'alt',
          copyright: 'copyright',
          url: originalUrl.toString(),
        },
      },
    })
    const queryResponse = createPrismicAPIQueryResponse([doc])

    const result = await performPreview(
      t,
      // @ts-expect-error - Partial gatsbyContext provided
      gatsbyContext,
      pluginOptions,
      config,
      queryResponse,
      '822e45b2918cabfa88ea9d2f5600eab7.json',
      {
        type: gatsbyPrismic.PrismicSpecialType.Document,
        'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
        'type.data.image': prismicT.CustomTypeModelFieldType.Image,
      },
    )

    // @ts-expect-error - The provided type does not match since we change its shape during the proxy process.
    const node = result.current.context[0].nodes[
      doc.id
    ] as PrismicAPIDocumentNodeInput<{
      image: {
        url: string
        fixed: { src: string }
        fluid: { src: string }
        gatsbyImageData: { images: { fallback: { src: string } } }
      }
    }>

    const urlUrl = new URL(node.data.image.url)
    t.is(
      node.data.image.url,
      'https://example.com/image.png?rect=0,0,100,200&w=1',
    )
    t.is(urlUrl.searchParams.get('rect'), originalUrl.searchParams.get('rect'))
    t.is(urlUrl.searchParams.get('w'), originalUrl.searchParams.get('w'))

    const fixedSrcUrl = new URL(node.data.image.fixed.src)
    t.is(
      node.data.image.fixed.src,
      'https://example.com/image.png?ixlib=gatsbyFP&fit=crop&rect=0%2C0%2C100%2C200&w=400&q=100&h=300',
    )
    t.is(
      fixedSrcUrl.searchParams.get('rect'),
      originalUrl.searchParams.get('rect'),
    )
    t.not(fixedSrcUrl.searchParams.get('w'), originalUrl.searchParams.get('w'))

    const fluidSrcUrl = new URL(node.data.image.fluid.src)
    t.is(
      node.data.image.fluid.src,
      'https://example.com/image.png?ixlib=gatsbyFP&fit=crop&rect=0%2C0%2C100%2C200&w=800&q=100&h=undefined',
    )
    t.is(
      fluidSrcUrl.searchParams.get('rect'),
      originalUrl.searchParams.get('rect'),
    )
    t.not(fluidSrcUrl.searchParams.get('w'), originalUrl.searchParams.get('w'))

    const gatsbyImageDataSrcUrl = new URL(
      node.data.image.gatsbyImageData.images.fallback.src,
    )
    t.is(
      node.data.image.gatsbyImageData.images.fallback.src,
      'https://example.com/image.png?ixlib=gatsbyFP&rect=0%2C0%2C100%2C200&w=400&q=100&h=300',
    )
    t.is(
      gatsbyImageDataSrcUrl.searchParams.get('rect'),
      originalUrl.searchParams.get('rect'),
    )
    t.not(
      gatsbyImageDataSrcUrl.searchParams.get('w'),
      originalUrl.searchParams.get('w'),
    )
  },
)

test.serial('image URL is properly decoded', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  // This example URL contains the following characters:
  // - @
  // - &
  // - spaces as "%20"
  // - spaces as "+"
  const originalUrl = new URL(
    'https://example.com/image%402x%20with%20spaces+and+plus+signs+&.png',
  )
  const decodedUrl = new URL(
    'https://example.com/image@2x with spaces and plus signs &.png',
  )
  const doc = createPrismicAPIDocument({
    data: {
      image: {
        dimensions: { width: 400, height: 300 },
        alt: 'alt',
        copyright: 'copyright',
        url: originalUrl.toString(),
      },
    },
  })
  const queryResponse = createPrismicAPIQueryResponse([doc])

  const result = await performPreview(
    t,
    // @ts-expect-error - Partial gatsbyContext provided
    gatsbyContext,
    pluginOptions,
    config,
    queryResponse,
    '4d8f043474b0c49cf5967510279f45a2.json',
    {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
      'type.data.image': prismicT.CustomTypeModelFieldType.Image,
    },
  )

  // @ts-expect-error - The provided type does not match since we change its shape during the proxy process.
  const node = result.current.context[0].nodes[
    doc.id
  ] as PrismicAPIDocumentNodeInput<{
    image: {
      url: string
      fixed: { src: string }
      fluid: { src: string }
      gatsbyImageData: { images: { fallback: { src: string } } }
    }
  }>

  const urlUrl = new URL(node.data.image.url)
  t.is(urlUrl.pathname, decodedUrl.pathname)

  const fixedSrcUrl = new URL(node.data.image.fixed.src)
  t.is(fixedSrcUrl.pathname, decodedUrl.pathname)

  const fluidSrcUrl = new URL(node.data.image.fluid.src)
  t.is(fluidSrcUrl.pathname, decodedUrl.pathname)

  const gatsbyImageDataSrcUrl = new URL(
    node.data.image.gatsbyImageData.images.fallback.src,
  )
  t.is(gatsbyImageDataSrcUrl.pathname, decodedUrl.pathname)
})

test.serial('group', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  const doc = createPrismicAPIDocument({
    data: {
      group: [
        {
          structured_text: [
            {
              type: prismicT.RichTextNodeType.paragraph,
              text: 'foo',
              spans: [],
            },
          ],
        },
        {
          structured_text: [
            {
              type: prismicT.RichTextNodeType.paragraph,
              text: 'bar',
              spans: [],
            },
          ],
        },
      ],
    },
  })
  const queryResponse = createPrismicAPIQueryResponse([doc])

  const result = await performPreview(
    t,
    // @ts-expect-error - Partial gatsbyContext provided
    gatsbyContext,
    pluginOptions,
    config,
    queryResponse,
    '8c94ede38e3b7d86b3779926fbf93d29.json',
    {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
      'type.data.group': prismicT.CustomTypeModelFieldType.Group,
      'type.data.group.structured_text':
        prismicT.CustomTypeModelFieldType.StructuredText,
    },
  )

  const node = result.current.context[0].nodes[doc.id]

  t.deepEqual(
    // @ts-expect-error - The provided type does not match since we change its shape during the proxy process.
    node.data.group as unknown as prismicT.GroupField<{
      structured_text: StructuredTextProxyValue
    }>,
    [
      {
        structured_text: {
          html: '<p>foo</p>',
          text: 'foo',
          raw: doc.data.group[0].structured_text,
        },
      },
      {
        structured_text: {
          html: '<p>bar</p>',
          text: 'bar',
          raw: doc.data.group[1].structured_text,
        },
      },
    ],
  )
})

test.serial('slices', async (t) => {
  const gatsbyContext = createGatsbyContext()
  const pluginOptions = createPluginOptions(t)
  const config = createRepositoryConfigs(pluginOptions)

  const doc = createPrismicAPIDocument({
    data: {
      slices: [
        {
          slice_type: 'foo',
          slice_label: '',
          primary: {
            structured_text: [
              {
                type: prismicT.RichTextNodeType.paragraph,
                text: 'foo',
                spans: [],
              },
            ],
          },
          items: [],
        },
        {
          slice_type: 'bar',
          slice_label: '',
          primary: {},
          items: [
            {
              structured_text: [
                {
                  type: prismicT.RichTextNodeType.paragraph,
                  text: 'foo',
                  spans: [],
                },
              ],
            },
            {
              structured_text: [
                {
                  type: prismicT.RichTextNodeType.paragraph,
                  text: 'bar',
                  spans: [],
                },
              ],
            },
          ],
        },
      ] as prismicT.SliceZone<
        | prismicT.Slice<'foo', { structured_text: prismicT.RichTextField }>
        | prismicT.Slice<
            'bar',
            never,
            { structured_text: prismicT.RichTextField }
          >
      >,
    },
  })
  const queryResponse = createPrismicAPIQueryResponse([doc])

  const result = await performPreview(
    t,
    // @ts-expect-error - Partial gatsbyContext provided
    gatsbyContext,
    pluginOptions,
    config,
    queryResponse,
    '8701c50f7225950d72eecd7d6fff402d.json',
    {
      type: gatsbyPrismic.PrismicSpecialType.Document,
      'type.data': gatsbyPrismic.PrismicSpecialType.DocumentData,
      'type.data.slices': prismicT.CustomTypeModelFieldType.Slices,
      'type.data.slices.foo': prismicT.CustomTypeModelSliceType.Slice,
      'type.data.slices.foo.primary.structured_text':
        prismicT.CustomTypeModelFieldType.StructuredText,
      'type.data.slices.bar': prismicT.CustomTypeModelSliceType.Slice,
      'type.data.slices.bar.items.structured_text':
        prismicT.CustomTypeModelFieldType.StructuredText,
    },
  )

  const node = result.current.context[0].nodes[doc.id]

  // The `id` values will change if the content of the Slices changes. It's
  // okay to update this value in the test as needed, but ensure the values
  // are unique between all slices in the array.
  t.deepEqual(node.data.slices as unknown, [
    {
      __typename: 'PrismicPrefixTypeDataSlicesFoo',
      id: '5439c14e110fe926437d207f8dd78deb',
      slice_type: 'foo',
      slice_label: '',
      primary: {
        structured_text: {
          html: '<p>foo</p>',
          text: 'foo',
          raw: doc.data.slices[0].primary?.structured_text,
        },
      },
      items: [],
    },
    {
      __typename: 'PrismicPrefixTypeDataSlicesBar',
      id: '50cc20327897be970793e6a88922a2fb',
      slice_type: 'bar',
      slice_label: '',
      primary: {},
      items: [
        {
          structured_text: {
            html: '<p>foo</p>',
            text: 'foo',
            raw: doc.data.slices[1].items?.[0].structured_text,
          },
        },
        {
          structured_text: {
            html: '<p>bar</p>',
            text: 'bar',
            raw: doc.data.slices[1].items?.[1].structured_text,
          },
        },
      ],
    },
  ])
})

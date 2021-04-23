import test from 'ava'
import * as msw from 'msw'
import * as mswn from 'msw/node'
import * as prismic from 'ts-prismic'
import {
  testPluginOptionsSchema,
  Joi,
  validateOptionsSchema,
} from 'gatsby-plugin-utils'

import kitchenSinkSchemaFixture from './__fixtures__/kitchenSinkSchema.json'
import { createCustomTypesAPICustomType } from './__testutils__/createCustomTypesAPICustomType'
import { createCustomTypesAPIMockedRequest } from './__testutils__/createCustomTypesAPIMockedRequest'

import { PluginOptions, PrismicCustomTypeApiResponse } from '../src'
import { pluginOptionsSchema } from '../src/plugin-options-schema'

const server = mswn.setupServer()
test.before(() => server.listen({ onUnhandledRequest: 'error' }))
test.afterEach(() => server.resetHandlers())
test.after(() => server.close())

test.serial('passes on valid options', async (t) => {
  const pluginOptions = {
    repositoryName: 'string',
    accessToken: 'string',
    customTypeApiToken: 'string',
    apiEndpoint: 'https://example.com',
    releaseID: 'string',
    graphQuery: 'string',
    lang: 'string',
    linkResolver: (): void => void 0,
    htmlSerializer: (): void => void 0,
    schemas: { page: kitchenSinkSchemaFixture },
    imageImgixParams: { q: 100 },
    imagePlaceholderImgixParams: { q: 100 },
    typePrefix: 'string',
    webhookSecret: 'string',
    createRemoteFileNode: (): void => void 0,
    transformFieldName: (): void => void 0,
  }

  server.use(
    msw.rest.get(pluginOptions.apiEndpoint, (req, res, ctx) =>
      req.url.searchParams.get('access_token') === pluginOptions.accessToken
        ? res(
            ctx.json({
              types: { page: 'Page' },
              refs: [{ ref: 'master', isMasterRef: true }],
            }),
          )
        : res(ctx.status(401)),
    ),
  )

  server.use(createCustomTypesAPIMockedRequest(pluginOptions, []))

  const res = await testPluginOptionsSchema(pluginOptionsSchema, pluginOptions)

  t.true(res.isValid)
  t.deepEqual(res.errors, [])
})

test.serial('fails on missing options', async (t) => {
  const pluginOptions = {}
  const res = await testPluginOptionsSchema(pluginOptionsSchema, pluginOptions)

  t.false(res.isValid)
  t.deepEqual(res.errors, [
    '"repositoryName" is required',
    '"value" must contain at least one of [schemas, customTypeApiToken]',
  ])
})

test.serial('fails on invalid options', async (t) => {
  const pluginOptions = {
    repositoryName: Symbol(),
    accessToken: Symbol(),
    customTypeApiToken: Symbol(),
    apiEndpoint: Symbol(),
    releaseID: Symbol(),
    graphQuery: Symbol(),
    lang: Symbol(),
    linkResolver: Symbol(),
    htmlSerializer: Symbol(),
    schemas: Symbol(),
    imageImgixParams: Symbol(),
    imagePlaceholderImgixParams: Symbol(),
    typePrefix: Symbol(),
    webhookSecret: Symbol(),
    createRemoteFileNode: Symbol(),
  }
  const res = await testPluginOptionsSchema(pluginOptionsSchema, pluginOptions)

  t.false(res.isValid)
  t.deepEqual(res.errors, [
    '"repositoryName" must be a string',
    '"accessToken" must be a string',
    '"customTypeApiToken" must be a string',
    '"apiEndpoint" must be a string',
    '"releaseID" must be a string',
    '"graphQuery" must be a string',
    '"lang" must be a string',
    '"linkResolver" must be of type function',
    '"htmlSerializer" must be of type function',
    '"schemas" must be of type object',
    '"imageImgixParams" must be of type object',
    '"imagePlaceholderImgixParams" must be of type object',
    '"typePrefix" must be a string',
    '"webhookSecret" must be a string',
    '"createRemoteFileNode" must be of type function',
  ])
})

test.serial('fails on invalid customTypeApiToken', async (t) => {
  const pluginOptions = {
    repositoryName: 'qwerty',
    customTypeApiToken: 'customTypeApiToken',
  }

  // Intentionally making a failed 401 response.
  server.use(
    msw.rest.get(
      'https://customtypes.prismic.io/customtypes',
      (_req, res, ctx) => res(ctx.status(401)),
    ),
  )

  const res = await testPluginOptionsSchema(pluginOptionsSchema, pluginOptions)

  t.false(res.isValid)
  t.deepEqual(res.errors, [
    'The Custom Type API could not be accessed. Please check that the customTypeApiToken provided is valid.',
  ])
})

test.serial('allows only one of qraphQuery or fetchLinks', async (t) => {
  const pluginOptions = {
    repositoryName: 'qwerty',
    schemas: { page: kitchenSinkSchemaFixture },
    graphQuery: 'string',
    fetchLinks: ['string'],
  }
  const res = await testPluginOptionsSchema(pluginOptionsSchema, pluginOptions)

  t.false(res.isValid)
  t.deepEqual(res.errors, [
    '"value" contains a conflict between optional exclusive peers [fetchLinks, graphQuery]',
  ])
})

test.serial('checks that all schemas are provided', async (t) => {
  const pluginOptions = {
    repositoryName: 'qwerty',
    schemas: { page: kitchenSinkSchemaFixture },
  }
  const apiEndpoint = prismic.defaultEndpoint(pluginOptions.repositoryName)

  server.use(
    msw.rest.get(apiEndpoint, (_req, res, ctx) =>
      res(
        ctx.json({
          types: { page: 'Page', blogPost: 'Blog Post' },
        }),
      ),
    ),
  )

  server.use(createCustomTypesAPIMockedRequest(pluginOptions, []))

  const res = await testPluginOptionsSchema(pluginOptionsSchema, pluginOptions)

  t.false(res.isValid)
  t.true(res.errors.length === 1)
  t.true(/blogPost/.test(res.errors[0]))
})

test.serial(
  'populates schemas if customTypeApiToken is provided',
  async (t) => {
    const pluginOptions = {
      repositoryName: 'qwerty',
      customTypeApiToken: 'customTypeApiToken',
    }
    const apiEndpoint = prismic.defaultEndpoint(pluginOptions.repositoryName)

    const customType1 = createCustomTypesAPICustomType()
    const customType2 = createCustomTypesAPICustomType()
    const customTypesResponse: PrismicCustomTypeApiResponse = [
      customType1,
      customType2,
    ]

    server.use(
      msw.rest.get(apiEndpoint, (_req, res, ctx) =>
        res(
          ctx.json({
            types: {
              [customType1.id]: customType1.label,
              [customType2.id]: customType2.label,
            },
          }),
        ),
      ),
    )

    server.use(
      createCustomTypesAPIMockedRequest(pluginOptions, customTypesResponse),
    )

    const schema = pluginOptionsSchema({ Joi })
    const res = (await validateOptionsSchema(
      schema,
      pluginOptions,
    )) as PluginOptions

    t.deepEqual(res.schemas, {
      [customType1.id]: customType1.json,
      [customType2.id]: customType2.json,
    })
  },
)

test.serial(
  'merges schemas if customTypeApiToken and schemas are provided',
  async (t) => {
    const customTypeNotInAPI = createCustomTypesAPICustomType()
    const customTypeInAPI1 = createCustomTypesAPICustomType()
    const customTypeInAPI2 = createCustomTypesAPICustomType()
    const customTypesResponse: PrismicCustomTypeApiResponse = [
      customTypeInAPI1,
      customTypeInAPI2,
    ]

    const pluginOptions = {
      repositoryName: 'qwerty',
      customTypeApiToken: 'customTypeApiToken',
      schemas: {
        [customTypeNotInAPI.id]: customTypeNotInAPI.json,
        // Note that we are going to replace customTypeInAPI2 with
        // customTypeNotInAPI, in which customTypeInAPI2 is part of the API
        // response. The test at the end checks for this.
        [customTypeInAPI2.id]: customTypeNotInAPI.json,
      },
    }
    const apiEndpoint = prismic.defaultEndpoint(pluginOptions.repositoryName)

    server.use(
      msw.rest.get(apiEndpoint, (_req, res, ctx) =>
        res(
          ctx.json({
            types: {
              [customTypesResponse[0].id]: customTypesResponse[0].label,
              [customTypesResponse[1].id]: customTypesResponse[1].label,
            },
          }),
        ),
      ),
    )

    server.use(
      createCustomTypesAPIMockedRequest(pluginOptions, customTypesResponse),
    )

    const schema = pluginOptionsSchema({ Joi })
    const res = (await validateOptionsSchema(
      schema,
      pluginOptions,
    )) as PluginOptions

    t.deepEqual(res.schemas, {
      // We are testing that a schema provided in the plugin options, but not
      // provided by the API, can be provided explicitly.
      [customTypeNotInAPI.id]: customTypeNotInAPI.json,

      // This custom type was not provided in the plugin options, but is provided
      // by the API.
      [customTypeInAPI1.id]: customTypeInAPI1.json,

      // We are testing that a schema provided by the API can be overridden by
      // one provided in plugin options.
      [customTypeInAPI2.id]: customTypeNotInAPI.json,
    })
  },
)

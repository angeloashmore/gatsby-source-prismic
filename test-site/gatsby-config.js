const path = require('path')
const dotenv = require('dotenv')

dotenv.config()
dotenv.config({ path: '.env.secret' })

module.exports = {
  plugins: [
    'gatsby-plugin-image',
    {
      resolve: 'gatsby-source-prismic',
      options: {
        repositoryName: process.env.GATSBY_PRISMIC_REPOSITORY_NAME,
        accessToken: process.env.PRISMIC_ACCESS_TOKEN,
        customTypesApiToken: process.env.PRISMIC_CUSTOM_TYPES_API_TOKEN,
        typePrefix: 'prefix',
        linkResolver: require('./src/linkResolver').linkResolver,
        schemas: {
          kitchen_sink: require('./schemas/kitchen_sink.json'),
          without_uid: require('./schemas/without_uid.json'),
          without_data: require('./schemas/without_data.json'),
          not_used: {},
          test: {},
        },
      },
    },
    {
      resolve: 'gatsby-plugin-prismic-previews',
      options: {
        repositoryName: process.env.GATSBY_PRISMIC_REPOSITORY_NAME,
        accessToken: process.env.PRISMIC_ACCESS_TOKEN,
        typePrefix: 'prefix',
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'gatsby-source-prismic',
        path: path.resolve(__dirname, 'src'),
      },
    },
    process.env.ANALYZE === 'true' &&
      'gatsby-plugin-webpack-bundle-analyser-v2',
  ].filter(Boolean),
}

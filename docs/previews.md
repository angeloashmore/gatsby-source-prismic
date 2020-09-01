# Previews

Setting up live Prismic previews involves setting up a few key pages and
registering a global store. `gatsby-source-prismic` provides ready-to-use
[higher order components][react-hocs] so you can simply wrap your existing pages
and templates.

1. [**PreviewStoreProvider**](#PreviewStoreProvider): Setup a global store.
1. [**withPreview**](#withPreview): Wrap your pages and templates to accept
   preview data.
1. [**withPreviewResolver**](#withPreviewResolver): Create a dedicated landing
   page for previews.
1. [**withUnpublishedPreview**](#withUnpublishedPreview): Create a fallback page
   for unpublished documents.

The underlying [`usePrismicPreview`][useprismicpreview] hook and
[`mergePrismicPreviewData`][mergeprismicpreviewdata] helper function are
available to use for more advanced use cases. Almost all users should be able to
use the HOCs instead of these lower-level methods. If you're not sure how to
setup previews, stick with the following approach.

## PreviewStoreProvider

All preview data is saved in a global store. In order for the preview HOCs to
work, wrap your app with the `PreviewStoreProvider` component.

You can do this by setting up `wrapRootElement` in `gatsby-ssr.js` and
`gatsby-browser.js`, like the following:

```jsx
// gatsby-ssr.js

import * as React from 'react'
import { PreviewStoreProvider } from 'gatsby-source-prismic'

export const wrapRootElement = ({ element }) => (
  <PreviewStoreProvider>{element}</PreviewStoreProvider>
)
```

```jsx
// gatsby-browser.js

import * as React from 'react'
import { PreviewStoreProvider } from 'gatsby-source-prismic'

export const wrapRootElement = ({ element }) => (
  <PreviewStoreProvider>{element}</PreviewStoreProvider>
)
```

Yes, it is the same code in both files,
[as per Gatsby's recommendation](https://www.gatsbyjs.org/docs/browser-apis/#wrapRootElement).

## withPreview

The `withPreview` HOC automatically merges preview data with Gatsby's static
data in the `data` page prop. By using `withPreview`, your page components do
not need to be written in a special way to take advantage of Prismic Previews.

In order to preview changes for both unpublished and published documents, the
`prismicId` property must be included in the root of the GraphQL query. Querys
without the `prismicId` property will only work for unpublished documents.

To use `withPreview`, wrap the `export default` with `withPreview` like the
following:

```jsx
// src/templates/page.js

import * as React from 'react'
import { graphql } from 'gatsby'
import { withPreview } from 'gatsby-source-prismic'

import { Layout } from '../components/Layout'

// `data` will automatically include preview data when previewing from Prismic.
const PageTemplate = ({ data }) => (
  <Layout>
    <h1>{data.prismicPage.data.title.text}</h1>
  </Layout>
)

export default withPreview(PageTemplate)

export const query = graphql`
  query PageTemplate($uid: String!) {
    prismicPage(uid: { eq: $uid }) {
      prismicId
      data {
        title {
          text
        }
      }
    }
  }
`
```

## withPreviewResolver

The `withPreviewResolver` HOC allows you to easily create a preview resolver
page. When an editor clicks the Preview button in Prismic, the browser is
redirected to the preview resolver page desginated in your Prismic repository
settings. This page then determines the previewed document's URL and redirects
to that page while storing the preview data.

`withPreviewResolver` accepts the same options as
[`usePrismicPreview`][useprismicpreview] which requires at least your repository
name. If you use a `linkResolver` in `gatsby-config.js`, be sure to provide it
here as well.

To use `withPreviewResolver`, create a dedicated preview resolver page, such as
`src/pages/preview.js`, and wrap the `export default` with `withPreviewResolver`
like the following:

```jsx
// src/pages/preview.js

import * as React from 'react'
import { withPreviewResolver } from 'gatsby-source-prismic'

import { linkResolver } from '../linkResolver'

import { Layout } from '../components/Layout'

const PreviewPage = ({ isPreview, isLoading }) => {
  if (isPreview === false) return 'Not a preview!'

  return (
    <Layout>
      <p>Loading</p>
    </Layout>
  )
}

export default withPreviewResolver(PreviewPage, {
  repositoryName: process.env.GATSBY_PRISMIC_REPOSITORY_NAME,
  linkResolver,
})
```

## withUnpublishedPreview

The `withUnpublishedPreview` HOC provides a way to preview documents that have
yet to be published. Because the document is unpublished, the page does not yet
exist in the built version of the Gatsby site.

`withUnpublishedPreview` should be used on a page that can accept any
non-existant URL, such as your 404 page. If the HOC detects that the user is
previewing a page, the correct template is displayed. If not, the HOC skips its
logic and renders the page as normal. In the case of a 404 page, it would
continue to render your "Page Not Found" message.

The template to render is determined using the `templateMap` option which maps a
Prismic custom type ID to a component.

To use `withUnpublishedPreview`, create a dedicated page that accepts all
non-existing routes, such as a 404 page at `src/pages/404.js`, and wrap the
`export default` with `withUnpublishedPreview` like the following:

```jsx
// src/pages/404.js

import * as React from 'react'
import { withUnpublishedPreview } from 'gatsby-source-prismic'

import { PageTemplate } from '../templates/PageTemplate'
import { BlogPostTemplate } from '../templates/BlogPostTemplate'

import { Layout } from '../components/Layout'

const NotFoundPage = () => (
  <Layout>
    <h1>Page not found!</h1>
  </Layout>
)

// If an unpublished `page` document is previewed, PageTemplate will be rendered.
export default withUnpublishedPreview(NotFoundPage, {
  templateMap: {
    page: PageTemplate,
    blog_post: BlogPostTemplate,
  },
})
```

That's it! Your Gatsby site now allows editors to preview edits from Prismic.

## Advanced previews

If you find the HOCs do not provide enough control over previews, you can use
the underlying `usePrismicPreview` hook and `mergePrismicPreviewData` helper
function directly.

See the [Previews Manual Setup](./previews-manual-setup.md) guide and the
[Previews API](./previews-api.md) documentation for more details.

[react-hocs]: https://reactjs.org/docs/higher-order-components.html
[useprismicpreview]:
  https://github.com/angeloashmore/gatsby-source-prismic/blob/v3.1/docs/previews-api.md#useprismicpreview
[mergeprismicpreviewdata]:
  https://github.com/angeloashmore/gatsby-source-prismic/blob/v3.1/docs/previews-api.md#mergeprismicpreviewdata

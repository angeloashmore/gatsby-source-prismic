import * as React from 'react'
import { graphql, PageProps, Link } from 'gatsby'
import {
  usePrismicPreviewAccessToken,
  usePrismicPreviewContext,
  withPrismicPreview,
  WithPrismicPreviewProps,
} from 'gatsby-plugin-prismic-previews'
import { GatsbyImage } from 'gatsby-plugin-image'
import GatsbyImageOld from 'gatsby-image'

import { repositoryConfigs } from '../prismicPreviews'

const repoName = process.env.GATSBY_PRISMIC_REPOSITORY_NAME as string

const HomePage = ({
  data,
  ...rest
}: PageProps<Record<string, any>> &
  WithPrismicPreviewProps<Record<string, any>>): JSX.Element => {
  const dataStr = JSON.stringify(data, null, 2)

  const [state] = usePrismicPreviewContext()
  const [token] = usePrismicPreviewAccessToken(repoName)

  return (
    <div>
      <GatsbyImageOld
        fluid={
          data.homeKitchenSink.data.body[0].items[0]?.first_option_repeat_image
            .fluid
        }
      />
      {data.homeKitchenSink.data.body[0].items[0]?.first_option_repeat_image
        .gatsbyImageData && (
        <GatsbyImage
          image={
            data.homeKitchenSink.data.body[0].items[0].first_option_repeat_image
              .gatsbyImageData
          }
          alt=""
        />
      )}
      <ul>
        <li>
          <Link to="/">Index</Link>
        </li>
        <li>
          <Link to="/home">Home</Link>
        </li>
        <li>
          <Link to="/about">About</Link>
        </li>
      </ul>
      <pre style={{ backgroundColor: 'lightgray', padding: '2rem' }}>
        <code>{dataStr}</code>
      </pre>
      <hr />
      <pre style={{ backgroundColor: 'lightgray', padding: '2rem' }}>
        <code>{JSON.stringify(rest, null, 2)}</code>
      </pre>
    </div>
  )
}

export default withPrismicPreview(HomePage, repositoryConfigs)

export const query = graphql`
  {
    homeKitchenSink: prismicPrefixKitchenSink(uid: { eq: "home" }) {
      _previewable
      data {
        body {
          ... on PrismicPrefixKitchenSinkDataBodyFirstOption {
            items {
              first_option_repeat_image {
                fluid(maxWidth: 1000) {
                  ...GatsbyImgixFluid
                }
                gatsbyImageData(layout: FULL_WIDTH)
              }
            }
          }
        }
      }
    }
    allPrismicPrefixKitchenSink {
      nodes {
        _previewable
        id
        data {
          title {
            text
          }
          body {
            ... on PrismicPrefixKitchenSinkDataBodyFirstOption {
              items {
                first_option_repeat_image {
                  fluid(maxWidth: 1000) {
                    ...GatsbyImgixFluid
                  }
                  gatsbyImageData(layout: FULL_WIDTH)
                }
              }
            }
          }
        }
      }
    }
  }
`

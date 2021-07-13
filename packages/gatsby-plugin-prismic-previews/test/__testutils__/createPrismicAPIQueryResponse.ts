import * as prismic from '@prismicio/client'

import { createPrismicAPIDocument } from './createPrismicAPIDocument'

export const createPrismicAPIQueryResponse = (
  docs = [createPrismicAPIDocument(), createPrismicAPIDocument()],
  overrides?: Partial<prismic.Query>,
): prismic.Query => ({
  page: 1,
  results_per_page: docs.length,
  results_size: docs.length,
  total_results_size: docs.length,
  total_pages: 1,
  next_page: '',
  prev_page: '',
  results: docs,
  ...overrides,
})

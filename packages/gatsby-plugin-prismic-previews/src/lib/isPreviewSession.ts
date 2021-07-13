import * as IOE from 'fp-ts/IOEither'
import { constTrue, pipe } from 'fp-ts/function'

import { extractPreviewRefRepositoryName } from './extractPreviewRefRepositoryName'
import { getPreviewRef } from './getPreviewRef'

export const isPreviewSession = pipe(
  getPreviewRef,
  IOE.chain((previewRef) =>
    pipe(
      extractPreviewRefRepositoryName(previewRef),
      IOE.fromOption(
        () =>
          new Error(
            'Not a preview session (preview token does not contain a repository)',
          ),
      ),
    ),
  ),
  IOE.map(constTrue),
  IOE.mapLeft(
    () => new Error('Not a preview session (preview token does not exist)'),
  ),
)

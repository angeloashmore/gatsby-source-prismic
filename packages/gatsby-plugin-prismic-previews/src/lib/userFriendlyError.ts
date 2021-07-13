import * as prismic from '@prismicio/client'

export const userFriendlyError = (error: Error): Error => {
  if (error instanceof prismic.ForbiddenError) {
    return new Error('Unauthorized access')
  } else {
    return error
  }
}

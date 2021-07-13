export const resolveURL = (from: string, to: string): string => {
  const resolvedUrl = new URL(to, new URL(from + '/', 'resolve://'))

  if (resolvedUrl.protocol === 'resolve:') {
    // `from` is a relative URL.
    const { pathname, search, hash } = resolvedUrl

    return pathname + search + hash
  }

  return resolvedUrl.toString()
}

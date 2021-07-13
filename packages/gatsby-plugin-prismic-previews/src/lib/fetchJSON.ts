import * as TE from 'fp-ts/TaskEither'

export const fetchJSON = <T>(
  ...args: Parameters<typeof fetch>
): TE.TaskEither<Error, T> =>
  TE.tryCatch(
    async () => await (await fetch(...args)).json(),
    (error) => error as Error,
  )

import * as React from 'react'

import { userFriendlyError } from '../lib/userFriendlyError'

import { PrismicContextActionType, PrismicPreviewState } from '../context'
import { usePrismicPreviewContext } from '../usePrismicPreviewContext'
import { usePrismicPreviewAccessToken } from '../usePrismicPreviewAccessToken'

import { Root } from './Root'
import { ModalAccessToken } from './ModalAccessToken'
import { ModalError } from './ModalError'
import { ModalLoading } from './ModalLoading'

type PrismicPreviewUIProps = {
  afterAccessTokenSet(): void
}

export const PrismicPreviewUI = ({
  afterAccessTokenSet,
}: PrismicPreviewUIProps): JSX.Element => {
  const [state, dispatch] = usePrismicPreviewContext()
  const [accessToken, accessTokenActions] = usePrismicPreviewAccessToken(
    state.activeRepositoryName,
  )

  const goToIdle = () => dispatch({ type: PrismicContextActionType.GoToIdle })

  // TODO: Handle modal visibility state locally, not by transitioning globally to IDLE.

  return (
    <>
      {state.activeRepositoryName && (
        <Root>
          <ModalLoading
            isOpen={
              state.previewState === PrismicPreviewState.BOOTSTRAPPING ||
              state.previewState === PrismicPreviewState.RESOLVING
            }
            repositoryName={state.activeRepositoryName}
            onDismiss={goToIdle}
          />
          <ModalAccessToken
            isOpen={
              state.previewState === PrismicPreviewState.PROMPT_FOR_ACCESS_TOKEN
            }
            repositoryName={state.activeRepositoryName}
            state={accessToken ? 'INCORRECT' : 'IDLE'}
            initialAccessToken={accessToken}
            setAccessToken={accessTokenActions.set}
            afterSubmit={afterAccessTokenSet}
            onDismiss={goToIdle}
          />
          <ModalError
            isOpen={state.previewState === PrismicPreviewState.FAILED}
            repositoryName={state.activeRepositoryName}
            errorMessage={
              state.error ? userFriendlyError(state.error).message : undefined
            }
            onDismiss={goToIdle}
          />
        </Root>
      )}
    </>
  )
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error ? error.message : null
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage
    }

    const maybeResponse = 'response' in error ? error.response : null
    if (maybeResponse && typeof maybeResponse === 'object' && 'data' in maybeResponse) {
      const maybeData = maybeResponse.data
      if (maybeData && typeof maybeData === 'object' && 'error' in maybeData) {
        const apiError = maybeData.error
        if (typeof apiError === 'string' && apiError.trim()) {
          return apiError
        }
      }
    }
  }

  return fallback
}

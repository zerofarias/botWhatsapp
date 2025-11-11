type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

export function getApiErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error && typeof error === 'object') {
    const apiError = error as ApiErrorLike;
    const responseData = apiError.response?.data;
    if (responseData) {
      if (typeof responseData.message === 'string' && responseData.message) {
        return responseData.message;
      }
      if (typeof responseData.error === 'string' && responseData.error) {
        return responseData.error;
      }
    }
    if (typeof apiError.message === 'string' && apiError.message) {
      return apiError.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

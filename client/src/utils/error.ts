import { AxiosError } from 'axios';

type ApiErrorPayload = {
  message?: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const extractApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  const axiosError = error as AxiosError<ApiErrorPayload | string>;
  const responseData = axiosError?.response?.data;

  if (isNonEmptyString(responseData)) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === 'object' &&
    isNonEmptyString((responseData as ApiErrorPayload).message)
  ) {
    return (responseData as ApiErrorPayload).message as string;
  }

  return fallbackMessage;
};

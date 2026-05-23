import { AppError } from "../../types/errors";

export const createXtreamInvalidResponseError = (message: string) => {
  return new AppError("INVALID_RESPONSE", message);
};

export const createXtreamEmptyContentError = (message: string) => {
  return new AppError("EMPTY_CONTENT", message);
};

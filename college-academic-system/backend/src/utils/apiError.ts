/**
 * Application-level error carrying an HTTP status code.
 * Anything thrown that is not an ApiError is treated as a 500 and its
 * message is not leaked to the client.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = 'Bad request', details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists'): ApiError {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Validation failed', details?: unknown): ApiError {
    return new ApiError(422, message, details);
  }
}

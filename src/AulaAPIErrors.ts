/**
 * Base error class for all Aula API errors
 */
export class AulaAPIError extends Error {
    public readonly httpStatus?: number;
    public readonly aulaStatusCode?: number;
    public readonly aulaSubCode?: number;
    public readonly aulaMessage?: string;
    public readonly aulaErrorInformation?: any[];

    constructor(message: string, options?: {
        httpStatus?: number;
        aulaStatusCode?: number;
        aulaSubCode?: number;
        aulaMessage?: string;
        aulaErrorInformation?: any[];
    }) {
        super(message);
        this.name = 'AulaAPIError';
        this.httpStatus = options?.httpStatus;
        this.aulaStatusCode = options?.aulaStatusCode;
        this.aulaSubCode = options?.aulaSubCode;
        this.aulaMessage = options?.aulaMessage;
        this.aulaErrorInformation = options?.aulaErrorInformation;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Error thrown when the session ID (PHPSESSID) is no longer valid
 * This occurs when Aula returns HTTP 403 with an internal status code of 448
 */
export class AulaInvalidSessionError extends AulaAPIError {
    constructor(message?: string, options?: {
        httpStatus?: number;
        aulaStatusCode?: number;
        aulaSubCode?: number;
        aulaMessage?: string;
        aulaErrorInformation?: any[];
    }) {
        const defaultMessage = 'Session ID is no longer valid. The PHPSESSID has expired or is invalid. Please re-authenticate.';
        super(message || defaultMessage, options);
        this.name = 'AulaInvalidSessionError';
    }
}

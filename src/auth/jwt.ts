import { HttpRequest, HttpResponse } from '@deepkit/http';
import { createSigner, createVerifier, TokenError } from 'fast-jwt';

import { BaseAppConfig, getAppConfig } from '../app';

interface BaseJwtOptions {
    issuer?: string;
    audience?: string;
}

interface JwtGenerationOptions extends BaseJwtOptions {
    subject: string;
    enableId?: boolean;
    expiresAt?: Date | number;
    expiryMins?: number;
}

export interface ValidJwtValidationResult {
    isValid: true;
    id?: string;
    subject: string;
    issuedAtMs: number;
    issuedAt: Date;
    expiresAtMs: number;
    expiresAt: Date;
}

export interface InvalidJwtValidationResult {
    isValid: false;
    isDecodable: boolean;
    isSignatureValid?: boolean;
    isNotExpired?: boolean;
}

export type JwtValidationResult = ValidJwtValidationResult | InvalidJwtValidationResult;

const __signerForType = createSigner({ key: 'temp' }); // createSigner returns a union & ReturnType doesn't work right
interface JWTState {
    issuerName: string;
    validityMins: number;
    cookieName: string;
    cookieRe: RegExp;
    signer: typeof __signerForType;
    verifier: ReturnType<typeof createVerifier>;
}

const TokenErrorClasses = {
    decode: [TokenError.codes.invalidPayload, TokenError.codes.malformed, TokenError.codes.invalidType],
    verify: [TokenError.codes.verifyError, TokenError.codes.invalidSignature, TokenError.codes.invalidAlgorithm],
    expiry: [TokenError.codes.expired, TokenError.codes.inactive]
};

export class JWT {
    private static _state?: JWTState;

    private static get state() {
        const appConfig = getAppConfig<BaseAppConfig>();
        if (!appConfig.AUTH_JWT_SECRET) throw new Error('AUTH_JWT_SECRET is not configured');

        const cookieName = appConfig.AUTH_JWT_COOKIE_NAME ?? 'jwt';
        const cookieRe = new RegExp('(^|;)[ ]*' + cookieName + '=([^;]+)');
        const issuerName = appConfig.AUTH_JWT_ISSUER ?? 'app';
        const validityMins = appConfig.AUTH_JWT_EXPIRATION_MINS ?? 15;
        const signerKey = Buffer.from(appConfig.AUTH_JWT_SECRET, 'base64');
        const signer = createSigner({ key: signerKey });
        const verifier = createVerifier({ key: signerKey, cache: true, allowedIss: issuerName });
        this._state = { issuerName, validityMins, cookieName, cookieRe, signer, verifier };

        Object.defineProperty(this, 'state', { value: this._state });

        return this._state;
    }

    static async generate(options: JwtGenerationOptions): Promise<string> {
        return this.state.signer({
            iss: options.issuer ?? this.state.issuerName,
            aud: options.audience,
            sub: options.subject,
            exp: this.getExpirationTs(options)
        });
        // todo: ID
    }

    static async generateCookie(options: JwtGenerationOptions, response: HttpResponse) {
        const payload = await this.generate(options);
        response.setHeader('set-cookie', `${this.state.cookieName}=${payload}; Path=/; HttpOnly`);
        // todo: persistence?
        // todo: secure?
    }

    static async clearCookie(response: HttpResponse) {
        response.setHeader('set-cookie', `${this.state.cookieName}=invalid; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`);
    }

    static async verify(token: string): Promise<JwtValidationResult> {
        try {
            const result = await this.state.verifier(token);
            return {
                isValid: true,
                ...(result.id && { id: result.id }),
                subject: result.sub,
                issuedAtMs: result.iss,
                get issuedAt() {
                    return new Date(result.iss * 1000);
                },
                expiresAtMs: result.exp,
                get expiresAt() {
                    return new Date(result.exp * 1000);
                }
            };
        } catch (err) {
            if (err instanceof TokenError) {
                if (TokenErrorClasses.decode.includes(err.code as any)) {
                    return { isValid: false, isDecodable: false };
                }
                if (TokenErrorClasses.verify.includes(err.code as any)) {
                    return { isValid: false, isDecodable: true, isSignatureValid: false };
                }
                if (TokenErrorClasses.expiry.includes(err.code as any)) {
                    return { isValid: false, isDecodable: true, isSignatureValid: true, isNotExpired: false };
                }
            }
            throw err;
        }
    }

    static async verifyWithRequest(request: HttpRequest): Promise<JwtValidationResult | null> {
        if (request.headers.authorization) {
            if (request.headers.authorization.substring(0, 7) === 'Bearer ') {
                const result = await this.verify(request.headers.authorization.substring(7));
                if (result.isValid) {
                    return result;
                }
            }
        }

        if (request.headers.cookie) {
            const matches = request.headers.cookie.match(this.state.cookieRe);
            if (matches) {
                const result = await this.verify(matches[2]);
                if (result.isValid) {
                    return result;
                }
            }
        }

        return null;
    }

    private static getExpirationTs(options: JwtGenerationOptions) {
        const expiresMsIn = options.expiresAt instanceof Date ? options.expiresAt.getTime() : options.expiresAt;
        const expiresMs = expiresMsIn ?? Date.now() + (options.expiryMins ?? this.state.validityMins) * 60 * 1000;
        return Math.floor(expiresMs / 1000);
    }
}

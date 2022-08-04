// todo: deepkit needs to import types on non-typed superclasses. then these can avoid redeclaration.

export class BaseAppConfig {
    PORT?: number;
    MYSQL_HOST?: string;
    MYSQL_PORT?: number;
    MYSQL_USER?: string;
    MYSQL_PASSWORD?: string;
    MYSQL_DATABASE?: string;
    AUTH_JWT_ISSUER?: string;
    AUTH_JWT_EXPIRATION_MINS?: number;
    AUTH_JWT_COOKIE_NAME?: string;
    AUTH_JWT_SECRET?: string;
    MAIL_POSTMARK_TOKEN?: string;
}

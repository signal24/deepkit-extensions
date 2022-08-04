import { ReceiveType, validate, ValidationError } from '@deepkit/type';

export function validateOrThrow<T>(data: any, type?: ReceiveType<T>): data is T {
    const errors = validate<T>(data, type);
    if (errors.length) throw new ValidationError(errors);
    return true;
}

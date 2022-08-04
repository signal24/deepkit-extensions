import { ArrowFunction } from '../types';

export function tryOrErrorSync<T extends ArrowFunction>(fn: T): ReturnType<T> | Error {
    try {
        return fn();
    } catch (e) {
        return e instanceof Error ? e : new Error(String(e));
    }
}

export async function tryOrError<T extends ArrowFunction>(fn: T): Promise<ReturnType<T> | Error> {
    try {
        return await fn();
    } catch (e) {
        return e instanceof Error ? e : new Error(String(e));
    }
}

export function isError(e: any): e is Error {
    return e instanceof Error;
}

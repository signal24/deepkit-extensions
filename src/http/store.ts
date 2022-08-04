import { ClassType } from '@deepkit/core';
import { HttpRequest, RouteParameterResolver, RouteParameterResolverContext } from '@deepkit/http';

type CacheKey = string | symbol | object;
const ObjectRefSymbol = Symbol('ObjectRef');

/**
 * Key generator
 */
export function getCompositeCacheKey(target: ClassType, key: symbol) {
    if ((target as any)[key] === undefined) {
        (target as any)[key] = Symbol(`${target.name}_${key.description}`);
    }
    return (target as any)[key];
}

/**
 * Cache implementation
 */
type ValueResolver<T> = (request: HttpRequest) => Promise<T>;
export async function getOrCacheValue<T>(request: HttpRequest, key: CacheKey, resolver: ValueResolver<T>): Promise<T> {
    if (typeof key === 'function' || typeof key === 'object') {
        if (request.store[ObjectRefSymbol as any] === undefined) {
            request.store[ObjectRefSymbol as any] = new Map<object, T>();
        }
        const map: Map<object, T> = request.store[ObjectRefSymbol as any];
        if (!map.has(key)) {
            const value = await resolver(request);
            map.set(key, value);
            return value;
        }
        return map.get(key) as T;
    } else {
        if (request.store[key as any] === undefined) {
            request.store[key as any] = await resolver(request);
        }
        return request.store[key as any];
    }
}

export function getCachedValue<T>(request: HttpRequest, key: CacheKey): T | undefined {
    const isObjectRefKey = typeof key === 'function' || typeof key === 'object';
    const resolvedKey = isObjectRefKey ? ObjectRefSymbol : key;
    const rawValue = request.store[resolvedKey as any];
    return isObjectRefKey ? rawValue.get(key) : rawValue;
}

export function getCachedValueOrThrow<T>(request: HttpRequest, key: CacheKey): T {
    const value = getCachedValue<T>(request, key);
    if (value === undefined) throw new Error(`Request does not contain cached value [${String(key)}]`);
    return value;
}

/**
 * Generic store value resolver
 * Requires a previous listener to have attached data to the store
 */
export function createCachedValueResolver<T>(key: string | symbol | object, isRequired = true) {
    const getter = isRequired ? getCachedValueOrThrow : getCachedValue;
    return class implements RouteParameterResolver {
        async resolve(context: RouteParameterResolverContext): Promise<T | undefined> {
            return getter(context.request, key) ?? undefined;
        }
    };
}

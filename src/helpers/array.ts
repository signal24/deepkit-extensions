import { objectKeys } from './objects';

export function deepMerge<T extends Record<string, any>>(objects: T[]): T {
    return objects.reduce<T>((agg, src) => {
        objectKeys(src).forEach(key => {
            if (agg[key] && typeof agg[key] === 'object') {
                if (Array.isArray(agg[key])) {
                    (agg[key] as any) = [...agg[key], ...src[key]];
                } else {
                    agg[key] = { ...agg[key], ...src[key] };
                }
            } else {
                agg[key] = src[key];
            }
        });
        return agg;
    }, {} as T);
}

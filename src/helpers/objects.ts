import _ from 'lodash';

export function objectKeys<T>(object: T): (keyof T)[] {
    return Object.keys(object) as any[];
}

export function objectAssign<T extends object>(object: T, ...values: Partial<T>[]): T {
    return Object.assign(object, ...values);
}

export function extractValues<T extends object, K extends readonly (keyof T)[]>(state: T, fields: K): Pick<T, K[number]> {
    const result: Pick<T, K[number]> = {} as any;
    for (const key of fields) {
        if (state[key] !== undefined) {
            result[key] = state[key];
        }
    }
    return result;
}

export function extractUpdates<T extends object>(state: T, updates: Partial<T>, fields?: Array<keyof T>): Partial<T> {
    const result: Partial<T> = {};
    const updateFields = fields ?? objectKeys(updates);
    for (const key of updateFields) {
        if (updates[key] !== undefined && !_.isEqual(updates[key], state[key])) {
            result[key] = updates[key];
        }
    }
    return result;
}

export function patchObject<T extends object>(state: T, updates: Partial<T>, fields?: Array<keyof T>): T {
    const effectiveUpdates = extractUpdates(state, updates, fields);
    objectAssign(state, effectiveUpdates);
    return state;
}

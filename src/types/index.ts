export type ConcretePrimitive = string | number | boolean;
export type DefinedPrimitive = ConcretePrimitive | null;
export type Primitive = DefinedPrimitive | undefined;
export type StrictBool = true | false;
export type KVObject<T = any> = Record<string, T>;
export type NestedKVObject<T = any> = KVObject<T | T[] | KVObject<T>>;
export type Serializable<T = ConcretePrimitive> = T | T[] | NestedKVObject<T> | NestedKVObject<T>[];

export type RequireFields<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};

// export interface ClassType<T = any> {
//     new (...args: any[]): T;
// }

// export type ClassType<T = any> = new (...args: any[]) => T;

export type ArrowFunction = (...args: any) => any;

// eslint-disable-next-line @typescript-eslint/ban-types
export type ObjectKeysMatching<O extends {}, V> = { [K in keyof O]-?: O[K] extends V ? K : never }[keyof O];
// eslint-disable-next-line @typescript-eslint/ban-types
export type FunctionNames<T> = ObjectKeysMatching<T, Function | ArrowFunction>;

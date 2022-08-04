import { ArrowFunction, ConcretePrimitive } from '../types';

type MutexKey = ConcretePrimitive | InstanceType<any>;
export async function mutexExec<T extends ArrowFunction>(key: MutexKey | MutexKey[], fn: T): Promise<ReturnType<T>> {
    // todo: the mutex lol
    const result = await fn();
    return result;
}

import { ClassType } from '@deepkit/core';

import { PassthroughClassDecoratorResult } from './decorators';

// prevent class from being treated as a singleton
export function InstanceScope(_scope: 'singleton' | 'request' | 'transient'): ClassDecorator {
    return PassthroughClassDecoratorResult;
}

// return a singleton if the class has defined itself as a singleton,
// otherwise return a new instance. this is the preferred method of access.
export function Instance<T>(cls: ClassType<T>): T {
    return new cls();
}
export const I = Instance;

export function namedClass<T extends ClassType>(name: string, cls: T): T {
    Object.defineProperty(cls, 'name', { value: name });
    return cls;
}

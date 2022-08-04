import { ClassType } from '@deepkit/core';
import { Logger } from '@deepkit/logger';

import { r } from '../app';

export function createLogger(subject: string | InstanceType<ClassType>) {
    const name = typeof subject === 'string' ? subject : subject.constructor.name;
    return r(Logger).scoped(name);
}

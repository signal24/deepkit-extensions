import {
    HttpBadRequestError,
    HttpError,
    HttpMiddleware,
    HttpRequest,
    HttpResponse,
    HttpUnauthorizedError,
    RouteParameterResolver,
    RouteParameterResolverContext
} from '@deepkit/http';
import { ActiveRecordClassType, Query } from '@deepkit/orm';

import { JWT } from '../auth';
import { getCompositeCacheKey, getOrCacheValue } from './store';

/**
 * base request JWT user ID lookup
 */
const EntityIdSymbol = Symbol('EntityId');
export async function getEntityIdFromRequest<T extends ActiveRecordClassType>(request: HttpRequest, EntityClass: T): Promise<any> {
    return getOrCacheValue(request, getCompositeCacheKey(EntityClass, EntityIdSymbol), _getEntityIdFromRequest);
}

async function _getEntityIdFromRequest(request: HttpRequest): Promise<any> {
    const jwt = await JWT.verifyWithRequest(request);
    if (!jwt) throw new HttpUnauthorizedError();
    if (!jwt.isValid) {
        if (!jwt.isSignatureValid) throw new HttpUnauthorizedError('invalid jwt signature');
        if (!jwt.isNotExpired) throw new HttpUnauthorizedError('expired jwt');
        throw new HttpUnauthorizedError('invalid jwt');
    }
    if (!jwt.subject) throw new HttpBadRequestError('no jwt subject');
    return jwt.subject;
}

/**
 * request JWT user ID to user object
 */
export async function getEntityFromRequest<T extends ActiveRecordClassType>(
    request: HttpRequest,
    EntityClass: T,
    id?: any
): Promise<InstanceType<T>> {
    return getOrCacheValue(request, EntityClass, async () => {
        const entityId = id ?? (await getEntityIdFromRequest(request, EntityClass));
        return getEntityById(EntityClass, entityId);
    });
}

/**
 * user-to-ID lookup (internal use)
 */
async function getEntityById<T extends ActiveRecordClassType>(EntityClass: T, id: any): Promise<InstanceType<T>> {
    const query: Query<InstanceType<T>> = EntityClass.query();
    return query.filter({ id } as any).findOne();
}

/**
 * auth middleware generator
 */
interface EntityValidator<T extends ActiveRecordClassType> {
    getEntityIdFromRequest(request: HttpRequest): Promise<any>;
    validateEntity?(request: HttpRequest, entity: InstanceType<T>): Promise<void>;
}
export function createAuthMiddleware<T extends ActiveRecordClassType>(EntityClass: T) {
    return class implements HttpMiddleware, EntityValidator<T> {
        async execute(request: HttpRequest, response: HttpResponse, next: (err?: any) => void) {
            try {
                const entityId = await getOrCacheValue(
                    request,
                    getCompositeCacheKey(EntityClass, EntityIdSymbol),
                    this.getEntityIdFromRequest.bind(this)
                );
                await this.loadAndValidateEntity(request, entityId);
                next();
            } catch (err) {
                if (err instanceof HttpError) {
                    response.writeHead(err.httpCode);
                    response.end(err.message);
                } else {
                    throw err;
                }
            }
        }

        async getEntityIdFromRequest(request: HttpRequest) {
            return getEntityIdFromRequest(request, EntityClass);
        }

        async loadAndValidateEntity(request: HttpRequest, id: any) {
            const validateFn = (this as EntityValidator<T>).validateEntity;
            if (validateFn) {
                const entity = await getEntityFromRequest(request, EntityClass, id);
                await validateFn(request, entity);
            }
        }
    };
}

/**
 * auth listener generator
 */
// type AuthFn<T> = (entity: T) => boolean;
// type GroupAuthMap<T> = Record<string, AuthFn<T>>;
// export function createAuthListener<T extends ActiveRecordClassType>(
//     EntityClass: T,
//     defaultGroup = 'authed',
//     groupMap?: GroupAuthMap<InstanceType<T>>
// ) {
//     const listener = class {
//         async onAuth(event: typeof httpWorkflow.onAuth.event) {
//             if (EntityClass && groupMap) {
//                 const applicableAuthGroups = Object.keys(groupMap).filter(group => event.route.groups.includes(group));
//                 if (applicableAuthGroups.length) {
//                     const entity = await this.getEntityFromRequest(event.request);
//                     for (const groupName in applicableAuthGroups) {
//                         if (!(await groupMap[groupName](entity))) {
//                             throw new HttpUnauthorizedError();
//                         }
//                     }
//                     return;
//                 }
//             }

//             if (event.route.groups.includes(defaultGroup)) {
//                 await this.getEntityIdFromRequest(event.request);
//             }
//         }

//         async getEntityIdFromRequest(request: HttpRequest) {
//             return getEntityIdFromRequest(request, EntityClass);
//         }

//         async getEntityFromRequest(request: HttpRequest) {
//             return getEntityFromRequest(request, EntityClass);
//         }
//     };
//     eventDispatcher.listen(httpWorkflow.onAuth)(listener.prototype, 'onAuth');
//     return listener;
// }

/**
 * standard authed entity resolver
 * requires the auth listener to have executed
 */
export function createAuthedEntityResolver<T extends ActiveRecordClassType>(EntityClass: T) {
    return class implements RouteParameterResolver {
        async resolve(context: RouteParameterResolverContext) {
            return getEntityFromRequest(context.request, EntityClass);
        }
    };
}

import { AbstractClassType, ClassType } from '@deepkit/core';
import { ActiveRecord, Database, DatabaseAdapter, DatabaseSession, OrmEntity } from '@deepkit/orm';
import { SQLDatabaseAdapter, SqlQuery, sqlSerializer } from '@deepkit/sql';
import { getSerializeFunction, ReceiveType, ReflectionClass } from '@deepkit/type';

import { FunctionNames } from '../types';

type QueryClassType<T> = ReceiveType<T> | ClassType<T> | AbstractClassType<T> | ReflectionClass<T>;
export class BaseDatabase<T extends DatabaseAdapter> extends Database<T> {
    async rawQuery<Q extends OrmEntity>(type: QueryClassType<Q>, sql: SqlQuery, existingSession?: DatabaseSession<any>): Promise<Q[]> {
        const session = existingSession ?? this.createSession();
        if (!(session.adapter instanceof SQLDatabaseAdapter)) {
            throw new Error('Cannot perform raw query on non-SQL database');
        }

        const adapter = session.adapter as SQLDatabaseAdapter;
        const query = adapter.rawFactory(session as any).create(sql);
        const rows = await query.find();

        const schema = ReflectionClass.from(type);
        const deserialize = getSerializeFunction(schema.type, /*adapter.platform.serializer.deserializeRegistry*/ sqlSerializer.deserializeRegistry);
        return rows.map(row => deserialize(row));
    }

    async rawQueryOne<Q extends OrmEntity>(type: QueryClassType<Q>, sql: SqlQuery, existingSession?: DatabaseSession<any>): Promise<Q | undefined> {
        const rows = await this.rawQuery(type, sql, existingSession);
        return rows[0];
    }
}

export declare type HasDefault = {
    __meta?: ['hasDefault'];
};
export type DefaultKeys<T> = { [K in keyof T]: T[K] extends HasDefault ? K : never }[keyof T];
export type DefaultsOptional<T> = { [K in keyof Pick<T, DefaultKeys<T>>]?: T[K] } & { [K in keyof Omit<T, DefaultKeys<T>>]: T[K] };
export type NewEntityData<T> = Omit<DefaultsOptional<T>, keyof ActiveRecord | FunctionNames<T>>;

export function createEntity<T extends ActiveRecord>(Entity: ClassType<T>, data: NewEntityData<T>): T {
    const entity = new Entity();
    Object.assign(entity, data);
    return entity;
}

export async function createPersistedEntity<T extends ActiveRecord>(
    Entity: ClassType<T>,
    data: NewEntityData<T>,
    session?: DatabaseSession<any>
): Promise<T> {
    const entity = createEntity(Entity, data);
    await persistEntity(entity, session);
    return entity;
}

export async function persistEntity<T extends ActiveRecord>(entity: T, session?: DatabaseSession<any>) {
    if (session) {
        session.add(entity);
        await session.flush();
    } else {
        await entity.save();
    }
}

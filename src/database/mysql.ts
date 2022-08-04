import { ClassType } from '@deepkit/core';
import { MySQLDatabaseAdapter } from '@deepkit/mysql';
import { Database, DatabaseSession } from '@deepkit/orm';
import { SQLDatabaseAdapter, sqlSerializer } from '@deepkit/sql';
import { metaAnnotation } from '@deepkit/type';

import { BaseAppConfig, getAppConfig } from '../app';
import { Coordinate } from '.';
import { BaseDatabase } from './common';

export type MySQLDatabaseSession = DatabaseSession<MySQLDatabaseAdapter>;

export function createMySQLDatabase(
    config: ConstructorParameters<typeof MySQLDatabaseAdapter>[0],
    entities: ConstructorParameters<typeof Database>[1]
): ClassType<BaseDatabase<MySQLDatabaseAdapter>> {
    return class extends BaseDatabase<MySQLDatabaseAdapter> {
        constructor() {
            const appConfig = getAppConfig<BaseAppConfig>();

            const adapter = new MySQLDatabaseAdapter({
                host: appConfig.MYSQL_HOST,
                port: appConfig.MYSQL_PORT,
                user: appConfig.MYSQL_USER,
                password: appConfig.MYSQL_PASSWORD,
                database: appConfig.MYSQL_DATABASE,
                ...config
            });

            setupMySQLAdapter(adapter);

            super(adapter, entities);
        }
    };
}

function setupMySQLAdapter(adapter: SQLDatabaseAdapter) {
    // support forcing a primitive into a JSON field
    adapter.platform.serializer.serializeRegistry.addDecorator(
        t => {
            return metaAnnotation.getForName(t, 'jsonEncoded') !== undefined;
        },
        (_type, state) => {
            state.addCodeForSetter(`
            ${state.setter} = JSON.stringify(${state.accessor});
        `);
        }
    );

    // register POINT as a coordinate
    adapter.platform.serializer.serializeRegistry.registerClass(Coordinate, (_type, state) => {
        state.addCodeForSetter(`
            const c = ${state.accessor};
            ${state.setter} = { type: 'Point', coordinates: [c.x, c.y] };
        `);
        state.ended = true;
    });
    sqlSerializer.deserializeRegistry.registerClass(Coordinate, (_type, state) => {
        state.addCodeForSetter(`
            const c = ${state.accessor};
            ${state.setter} = { x: c.coordinates[0], y: c.coordinates[1] };
        `);
        state.ended = true;
    });
}

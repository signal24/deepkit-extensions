import { SqlMigrationHandler } from '@deepkit/sql';
import { entity, PrimaryKey } from '@deepkit/type';

export * from './common';
export * from './mysql';
export * from './types';

// Deepkit fixes
@entity.name('_migrations')
class PatchedMigrationEntity {
    created: Date = new Date();
    constructor(public version: number & PrimaryKey) {}
}
export class PatchedSqlMigrationHandler extends SqlMigrationHandler {
    protected migrationEntity = PatchedMigrationEntity;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
require(`${__dirname}/../../../../@deepkit/sql/dist/cjs/src/sql-adapter`).SqlMigrationHandler = PatchedSqlMigrationHandler;

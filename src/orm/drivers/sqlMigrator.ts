import {Migrator, Driver} from './types.js'

export function createMigrator(query: Driver['query']) {
  return ({
    idColumn,
    nameColumn,
    runOnColumn,
    migrationsTable,
  }): Migrator => {
    const tables = () => query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = '${migrationsTable}'`,
    )
    const selectAll = () => query(
      `SELECT ${nameColumn} FROM ${migrationsTable} ORDER BY ${runOnColumn}, ${idColumn}`,
    )
    async function createTable() {
      await query(
        `CREATE TABLE ${migrationsTable} (${idColumn} SERIAL PRIMARY KEY, ${nameColumn} varchar(255) NOT NULL, ${runOnColumn} timestamptz NOT NULL)`,
      )
    }

    return {
      async delete(name, tx) {
        await query(`DELETE FROM "${migrationsTable}" WHERE ${nameColumn} = '${name}'`, [], tx)
      },
      async insert(name, tx) {
        await query(`INSERT INTO "${migrationsTable}" (${nameColumn}, ${runOnColumn}) VALUES ('${name}', NOW())`, [], tx)
      },
      tables,
      selectAll,
      createTable,
    }
  }
}

import {createMigration} from '../../../src/migrator/v1.js'

export default createMigration({
  async up({sql, defs}) {
    await sql.createTable('users', {
      id: {type: 'uuid', primary: true, default: defs.uuidV4},
      username: {type: 'varchar', notNull: true},
      email: {type: 'varchar', notNull: true, unique: true},
      type: {type: 'smallint', notNull: true},
      active: {type: 'bool', notNull: true, default: 'true'},
      created_at: {type: 'timestamptz', notNull: true, default: defs.now},
    })

    await sql.createTable('orders', {
      id: {type: 'uuid', primary: true, default: defs.uuidV4},
      user_id: {type: 'uuid', notNull: true},
      amount: {type: 'real', notNull: true},
      currency: {type: 'smallint', notNull: true},
      good_slug: {type: 'varchar', notNull: true},
      quantity: {type: 'real', notNull: true},
      payed_at: {type: 'timestamptz'},
      created_at: {type: 'timestamptz', notNull: true, default: defs.now},
    })
    await sql.foreignKey({table: 'orders', key: 'user_id'}, {table: 'users', key: 'id'})
  },
  async down({sql}) {
    await sql.dropTable('orders')
    await sql.dropTable('users')
  },
})

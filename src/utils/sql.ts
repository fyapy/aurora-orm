import {
  ColumnOperator,
  DropConstraint,
  DefaultColumn,
  CreateTable,
  AlterTable,
  ForeignKey,
  DropTable,
  Insert,
} from '../migrator/queryBuilder.js'

export function formatParams(sql: string) {
  return sql.split('?')
    .reduce((acc, curr, index, arr) => acc += arr.length - 1 === index
      ? curr
      : `${curr}$${index + 1}`, '')
}

export function migratorAstParsers() {
  function columnDefault(def: DefaultColumn | string | number) {
    switch (typeof def) {
    case 'number':
      return ` DEFAULT ${def}`
    case 'object':
      return ` DEFAULT ${def.sql}`
    case 'string':
      return ` DEFAULT '${def}'`
    }
  }
  function parseCreateTable(ast: CreateTable) {
    let sql = `CREATE TABLE "${ast.table}" (`

    sql += Object.entries(ast.columns)
      .map(([name, opts]) => {
        let column = `"${name}" ${opts.type}`

        if (opts.primary === true) {
          column += ' PRIMARY KEY'
        }
        if (opts.unique === true) {
          column += ' UNIQUE'
        }
        if (opts.notNull === true) {
          column += ' NOT NULL'
        }

        if (typeof opts.default !== 'undefined') {
          column += columnDefault(opts.default)
        }

        return column
      })
      .join(', ')

    sql += ')'
    return sql
  }
  function parseDropTable(ast: DropTable) {
    return `DROP TABLE "${ast.table}"`
  }

  function parseAlterTable(ast: AlterTable) {
    let sql = `ALTER TABLE "${ast.table}"`

    sql += Object.entries(ast.columns)
      .map(([name, opts]) => {
        if (opts.operator === ColumnOperator.AddColumn) {
          let sql = ` ADD COLUMN "${name}" ${opts.type}`

          if (opts.notNull === true) {
            sql += ' NOT NULL'
          }
          if (typeof opts.default !== 'undefined') {
            sql += columnDefault(opts.default)
          }

          return sql
        }
        if (opts.operator === ColumnOperator.DropColumn) {
          return ` DROP COLUMN "${name}"`
        }
        if (opts.operator === ColumnOperator.SetDefault) {
          return ` ALTER COLUMN "${name}" SET${columnDefault(opts.value)}`
        }
        if (opts.operator === ColumnOperator.SetType) {
          return ` ALTER COLUMN "${name}" TYPE ${opts.type}`
        }

        throw new Error('AlterTable AST parse error')
      })
      .join(', ')

    return sql
  }
  function parseForeignKey(ast: ForeignKey) {
    return `ALTER TABLE "${ast.foreign.table}" ADD FOREIGN KEY ("${ast.foreign.key}") REFERENCES "${ast.reference.table}" ("${ast.reference.key}") ON DELETE CASCADE`
  }
  function parseDropConstraint(ast: DropConstraint) {
    return `ALTER TABLE "${ast.table}" DROP CONSTRAINT "${ast.table}_${ast.column}_fkey"`
  }
  function parseInsert(ast: Insert) {
    const values = Object.values(ast.values)
      .map(value => typeof value === 'string' ? `'${value}'` : value)

    return `INSERT INTO "${ast.table}" (${Object.keys(ast.values).join(', ')}) VALUES (${values.join(', ')})`
  }

  return {
    parseCreateTable,
    parseAlterTable,
    parseDropTable,
    parseForeignKey,
    parseDropConstraint,
    parseInsert,
  }
}

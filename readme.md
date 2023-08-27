# Aurora-ORM <a href="https://npmjs.com/package/aurora-orm"><img src="https://badgen.net/npm/v/aurora-orm" alt="npm package"></a>

> Decorator-less, type safe, fast and low overhead ORM for Node.js and TypeScript.

Aurora ORM works both for PostgreSQL and YugabyteDB.

Aurora ORM is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping)
that can run in NodeJS and can be used with TypeScript and JavaScript environment.
Its goal is to always use only native JavaScript features and provide additional features like [Data migration tool](https://en.wikipedia.org/wiki/Data_migration) that help you to develop applications that uses databases.

Aurora ORM supports only [Data Mapper](https://designpatternsphp.readthedocs.io/en/latest/Structural/DataMapper/README.html) pattern.
And don't use unstable features like decorators and reflect-metadata that give you the ability to use modern JavaScript/TypeScript transpilers like [SWC](https://swc.rs/) or [ESbuild](https://esbuild.github.io/) to speed up development.

## Features

-   Support [Data Mapper](https://designpatternsphp.readthedocs.io/en/latest/Structural/DataMapper/README.html).
-   Models and type safe columns mapping.
-   Database-specific column types.
-   Relations.
-   Support functional programming composition pattern.
-   Indices.
-   Transactions.
-   Migrations.
-   Connection pooling.
-   Elegant-syntax.
-   Logging.
-   Connection configuration in json format.
-   Supports Postgres / YugabyteDB.
-   TypeScript and JavaScript support.
-   Support modern transpilers like [SWC](https://swc.rs/) or [ESbuild](https://esbuild.github.io/).
-   Produced code is performant, flexible, clean and maintainable.

With Aurora ORM your models look like this:

```typescript
import { createModel } from 'aurora-orm'

export interface User {
  id: number
  name: string
  age: number | null
  password: string
  addictions: number[]
}

export const UserModel = createModel<User>({
  table: 'users',
  mapping: {
    // Type Safe columns mapping
    id: 'id',
    name: 'name',
    age: 'age',
    password: {
      name: 'password',
      hidden: true,
    },
    addictions: 'addictions',
  },
})
```

And your domain logic looks like this:

```typescript
const user = await UserModel.create({
  name: 'John',
  age: 26,
  password: 'iLoveCats',
  addictions: [4],
})

const allUsers = await UserModel.findAll()
const firstUser = await UserModel.findOne(1) // find by id
const john = await UserModel.findOne({
  name: 'John',
  age: 26,
}) // find by name and age

await UserModel.delete(john)
```

## Installation

1. Install the npm package:
  `yarn add aurora-orm`
2. Install a database driver:
  - for **PostgreSQL**
    `yarn add pg`

## Quick Start

#### Creating a new connection from the configuration file.
Most of the times you want to store your connection options in a separate configuration file. It makes it convenient and easy to manage. You only need to create a `aurora-orm.json` file in the root directory of your application (near package.json), put your configuration there and in your app call connect() without any configuration passed:

```json
{
  "type": "postgresql", // optinal, default value 'postgresql'
  "host": "localhost",
  "port": 5432,
  "username": "test",
  "password": "test",
  "database": "test"
}
```

Or you can use `connectionString`, and if value starts with `env:[variable_name]` it will be automatically replaced with the value from the `.env` file:

```json
{
  "connectionString": "postgres://test:test@localhost:5432/test",
  // or if you need environment variable
  "connectionString": "env:DATABASE_URL",
}
```

#### Connect to database

```ts
import { connect } from 'aurora-orm'

// createConnection method will automatically read connection options
// from your aurora-orm.json file
await connect()
```

## Contributors

Before make pull request test library using [symlink](https://docs.npmjs.com/cli/v8/commands/npm-link).

```bash
yarn build && (yarn unlink || true) && yarn link
```

And run Jest tests.

```bash
yarn test
```

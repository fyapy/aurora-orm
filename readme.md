# Aurora-ORM <a href="https://npmjs.com/package/aurora-orm"><img src="https://badgen.net/npm/v/aurora-orm" alt="npm package"></a>

> Near-zero runtime ORM for Node.js and TypeScript

Aurora ORM support PostgreSQL.

> The library is made to solve the author personal problems, and is not intended to be a truly open source

Aurora ORM is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping)
that can run in NodeJS and can be used with TypeScript and JavaScript environment.
Its goal is to always use only native JavaScript features and provide additional features like [Data migration tool](https://en.wikipedia.org/wiki/Data_migration) that help you to develop applications that uses databases.

Aurora ORM supports only [Data Mapper](https://designpatternsphp.readthedocs.io/en/latest/Structural/DataMapper/README.html) pattern.
And don't use unstable features like decorators and reflect-metadata that give you the ability to use modern JavaScript/TypeScript transpilers like [SWC](https://swc.rs/) or [ESbuild](https://esbuild.github.io/) to speed up development.

## Benchmarks

These are the results from running the benchmarks on a Macbook Pro 2,4 GHz Intel Core i9 with Postgres 16.3 installation and Node 22.3.0.

You can run this benchmark yourself: `pnpm benchmark`

![results chart](./scripts/benchmark/results.png)
> higher is better

## Features

- Models and type safe columns mapping
- Database-specific column types
- Transactions
- Relations
- Indexes
- Logging
- Migrations
- Connection pooling
- TypeScript and JavaScript support
- Support functional programming composition pattern
- Produced code is performant, flexible, clean and maintainable
- Support modern transpilers like [SWC](https://swc.rs/) or [ESbuild](https://esbuild.github.io/)

## Installation

Install the npm package: `pnpm add aurora-orm`

## Quick Start

#### Connect to database

```ts
import {connect, Drivers} from 'aurora-orm'

await connect({
  config: {
    driver: Drivers.Postgres,

    connectionString: 'postgres://test:test@localhost:5432/test',
    // or
    host: 'localhost',
    port: 5432,
    username: 'test',
    password: 'test',
    database: 'test',
  },
})
```

#### Run migrations

Create migrator script:

```ts
import {runMigrationsAndExit, Drivers} from 'aurora-orm'

// Some code to load connectionString
const connectionString = 'postgres://test:test@localhost:5432/test'

const direction = process.argv[2] as 'down' | 'up'

await runMigrationsAndExit({
  config: {driver: Drivers.Postgres, connectionString},
  direction,
})
```

And add to `package.json` scripts:

```json
{
  "scripts": {
    "migrator:down": "tsx ./src/migrator.ts down",
    "migrator:up": "tsx ./src/migrator.ts up",
    "migrator:create": "aurora-orm create",
    // or with bun
    "migrator:down": "bun ./src/migrator.ts down",
    "migrator:up": "bun ./src/migrator.ts up",
    "migrator:create": "aurora-orm create",
  },
}
```

#### Define model

```ts
import {createModel} from 'aurora-orm'

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

#### And your domain logic looks like this:

```ts
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


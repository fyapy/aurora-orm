import {
  DataSource,
  DataSourceOptions,
  Repository,
} from 'typeorm'

import { Order as OrderEntity } from './entities/Order'
import { Item as ItemEntity } from './entities/Item'

export type Repositories = {
  ItemRepository: Repository<ItemEntity>
  OrderRepository: Repository<OrderEntity>
}

export async function initRepositories(
  typeOrmConfig: DataSourceOptions
): Promise<Repositories> {
  const datasource = new DataSource(typeOrmConfig)

  await datasource.initialize()

  return {
    ItemRepository: datasource.manager.getRepository(ItemEntity),
    OrderRepository: datasource.manager.getRepository(OrderEntity),
  }
}

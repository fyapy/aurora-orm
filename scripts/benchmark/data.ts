import {faker} from '@faker-js/faker'

import {getRandomElement, writeJSON} from '../utils.js'

export enum Currency {RUB, USD}
export enum UserType {Regular, Seller, Buyer}

export interface User {
  id: string
  username: string
  email: string
  type: UserType
  active: boolean
  createdAt: string
}

export interface Order {
  id: string
  userId: string
  amount: number
  currency: Currency
  goodSlug: string
  quantity: number
  payedAt: string | null
  createdAt: string
}

const createUser = (): User => ({
  id: faker.string.uuid(),
  username: faker.internet.userName(),
  email: faker.internet.email(),
  type: faker.helpers.enumValue(UserType),
  active: faker.datatype.boolean(),
  createdAt: faker.date.anytime(),
})

const amountRange = {min: 299, max: 19_999}
const quantityRange = {min: 1, max: 10}

const createOrder = (users: User[]): Order => ({
  id: faker.string.uuid(),
  userId: getRandomElement(users).id,
  amount: faker.helpers.rangeToNumber(amountRange),
  currency: faker.helpers.enumValue(Currency),
  goodSlug: faker.commerce.productName(),
  quantity: faker.helpers.rangeToNumber(quantityRange),
  payedAt: faker.datatype.boolean() ? faker.date.anytime() : null,
  createdAt: faker.date.anytime(),
})

function createData() {
  const users = new Array(10_000).fill(null).map(createUser)

  const orders = new Array(10_000).fill(null).map(() => createOrder(users))

  return {users, orders}
}

export function createDataFiles() {
  const {users, orders} = createData()

  writeJSON('./scripts/benchmark/data/users.json', users)
  writeJSON('./scripts/benchmark/data/orders.json', orders)
}

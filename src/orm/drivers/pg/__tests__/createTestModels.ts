import {fakeDriver} from '../../../../utils/tests.js'
import {JoinStrategies} from '../../../index.js'
import {createModel} from '../../../model.js'

export async function createTestModels() {
  const mockDriver = await fakeDriver([
    [{id: 'id1', name: 'first'}],
  ])

  interface ChildModelType {
    id: string
    name: string
    slug: string
    isPublished: boolean
    isVisible: boolean
    gameId: string
    status: number
    autoconvertPrices: boolean
    updatedAt: string
    createdAt: string
  }

  const ChildModel = createModel<ChildModelType>({
    mockDriver,
    table: 'childs',
    mapping: {
      id: 'id',
      name: 'name',
      slug: 'slug',
      isPublished: 'isPublished',
      isVisible: 'isVisible',
      gameId: 'gameId',
      status: 'status',
      autoconvertPrices: 'autoconvert_prices',
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
    },
  })

  interface GameModelType {
    id: string
    name: string
    slug: string
    sort: number
    updatedAt: string
    createdAt: string

    childs: ChildModelType[]
  }

  const GameModel = createModel<GameModelType>({
    mockDriver,
    table: 'games',
    mapping: {
      id: 'id',
      name: 'name',
      slug: 'slug',
      sort: 'sort',
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',

      childs: JoinStrategies.OneToMany({
        table: 'childs',
        foreignProp: 'gameId',
      }),
    },
  })

  return {GameModel, ChildModel}
}

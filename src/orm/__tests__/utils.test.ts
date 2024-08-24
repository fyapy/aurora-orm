import { manyMapper, mapper } from '../utils'

function createData(): Array<{
  id: number
  name: string
}> {
  return [
    {id: 1, name: 'Crop'},
    {id: 2, name: 'Roman'},
    {id: 3, name: 'Obache'},
    {id: 4, name: 'Orvel'},
  ]
}

function createDataToJoin(): Array<{
  id: number
  userId: number
  balance: number
}> {
  return [
    {id: 1, userId: 2, balance: 200},
    {id: 2, userId: 1, balance: 300},
    {id: 3, userId: 3, balance: 500},
  ]
}

const referenceProp = 'id'
const foreignProp = 'userId'

describe('orm/utils', () => {
  test('should be mapper map currect', () => {
    const data = createData()
    const dataToJoin = createDataToJoin()

    mapper('balance', data, referenceProp, dataToJoin, foreignProp)

    expect(data).toEqual([
      {id: 1, name: 'Crop', balance: {id: 2, userId: 1, balance: 300}},
      {id: 2, name: 'Roman', balance: {id: 1, userId: 2, balance: 200}},
      {id: 3, name: 'Obache', balance: {id: 3, userId: 3, balance: 500}},
      {id: 4, name: 'Orvel', balance: null},
    ])
  })

  test('should be manyMapper map currect', () => {
    const data = createData()
    const dataToJoin = createDataToJoin()

    manyMapper('balances', data, referenceProp, dataToJoin, foreignProp)

    expect(data).toEqual([
      {id: 1, name: 'Crop', balances: [{id: 2, userId: 1, balance: 300}]},
      {id: 2, name: 'Roman', balances: [{id: 1, userId: 2, balance: 200}]},
      {id: 3, name: 'Obache', balances: [{id: 3, userId: 3, balance: 500}]},
      {id: 4, name: 'Orvel', balances: []},
    ])
  })
})

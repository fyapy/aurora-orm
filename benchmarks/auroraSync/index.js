const { performance } = require('perf_hooks')
const { createModel } = require('../../dist')

function bench(cb, iteration = 10) {
  const numbers = []

  // cold start
  cb()

  for (let index = 0; index < iteration; index++) {
    const startTime = performance.now()
    cb()
    const endTime = performance.now()

    numbers.push(endTime - startTime)
  }

  if (iteration === 1) {
    console.log(`Function call ${numbers[0]} ms`)
  } else {
    numbers.sort((a, b) => a - b)

    console.log(`Function call ${numbers[Math.ceil(numbers.length / 2)].toFixed(6)} ms`)
  }

}

const UserModel = createModel({
  table: 'users',
  mapping: {
    id: 'id',
    name: 'name',
    age: 'age',
    addictions: 'addictions',
  },
  // queryRow: () => {},
})

bench(() => UserModel.update({
  where: 1,
  set: {
    age: 3,
  },
}), 100)
bench(() => UserModel.update({
  where: 1,
  set: {
    age: 3,
  },
}), 1000)
bench(() => UserModel.update({
  where: 1,
  set: {
    age: 3,
  },
}), 10000)

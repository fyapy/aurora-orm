export const mapper = (
  newPropName: string,
  list: Record<string, any>[],
  referenceProp: string,
  foreighList: Record<string, any>[],
  foreignProp: string,
) => {
  if (foreighList.length === 0) {
    for (const item of list) {
      item[newPropName] = null
    }
    return
  }

  const mapper = {}
  foreighList.forEach(c => mapper[c[foreignProp]] = c)

  const deleteForeight = referenceProp !== 'id'


  for (const item of list) {
    item[newPropName] = mapper[item[referenceProp]] ?? null

    if (deleteForeight) {
      delete item[referenceProp]
    }
  }
}
export const manyMapper = (
  newPropName: string,
  list: Record<string, any>[],
  referenceProp: string,
  foreighList: Record<string, any>[],
  foreignProp: string,
) => {
  if (foreighList.length === 0) {
    for (const item of list) {
      item[newPropName] = []
    }
    return
  }

  const mapper: Record<string, any[]> = {}
  foreighList.forEach(c => {
    const key = c[foreignProp]
    if (typeof mapper[key] !== 'undefined') {
      mapper[key].push(c)
    } else {
      mapper[key] = [c]
    }
  })

  const deleteForeight = referenceProp !== 'id'


  for (const item of list) {
    item[newPropName] = mapper[item[referenceProp]] ?? []

    if (deleteForeight) {
      delete item[referenceProp]
    }
  }
}

export function tableNameToModelName(table: string) {
  const name = table.replace(/s$/, '').replace(/\_/g, '')

  return name.charAt(0).toUpperCase() + name.slice(1)
}

export const makeUnique = (list: string[]) => [...new Set(list)]

export class AuroraFail extends Error {
  status: number

  constructor(message: string) {
    super()

    this.status = 404
    this.message = message
  }
}

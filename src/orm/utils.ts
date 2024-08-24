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
    return;
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
    return;
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

// export const joinStrategyWhere = (
//   model: Model,
//   data: any,
//   foreignProp: string,
//   referenceProp: string,
// ) => model.primaryKey === referenceProp
//   ? data[foreignProp]
//   : { [referenceProp]: data[foreignProp] }

export const makeUnique = (list: string[]) => [...new Set(list)]

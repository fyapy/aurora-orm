import { FastifyPluginAsync } from 'fastify'
import config from './config'
import { initRepositories } from './db'

export const typeormPlugin: FastifyPluginAsync = async (fastify) => {
  const { OrderRepository } = await initRepositories(config)

  fastify.get<{
    Querystring: {
      simple?: string
    }
  }>('/orders', async (req, res) => {
    const { simple } = req.query

    const options = simple
      ? {}
      : { relations: ['items'] }
    try {
      const orders = await OrderRepository.find(options)

      return res.status(200).send({ orders })
    } catch (error) {
      new Error('Error processing values')
    }
  })

  fastify.post<{
    Body: {
      user: string
      date: number
      items: Array<{
        name: string
        value: number
      }>
    }
  }>('/orders', async (req, res) => {
    try {
      const orders = OrderRepository.create(req.body)
      await OrderRepository.save(orders)

      return res.status(200).send({ orders })
    } catch (error) {
      new Error('Error processing values')
    }
  })
}

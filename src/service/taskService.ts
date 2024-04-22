/* eslint-disable no-await-in-loop */
import uuid from 'uuid-random'
import { isDebug, redisOptions } from '../config'
import { httpTaskMsgOption, renderResult, requestOptions, taskMsg, taskRequest, taskResult } from '../utils'
import { httpTask, baseService, snailServer, redisService, taskDoingCacheKey, taskListKey } from '../utils/taskBase'

export default class taskService {
  /**
   * 添加任务，返回taskId
   *
   * @param taskRequest
   * @param currTaskId
   * @returns
   */
  public async addTask(taskRequest: taskRequest, currTaskId?: string): Promise<string | null> {
    const taskId = currTaskId ? currTaskId : uuid()
    const dataKey = redisOptions.keyPrefix + taskId

    const taskMsg: taskMsg = {
      taskId,
      method: taskRequest.method,
      url   : taskRequest.url,
      params: taskRequest.params
      // callbackUrl: taskRequest.callbackUrl
    }

    const taskResult: taskResult = {
      success    : true,
      status     : 'waiting',
      callbackUrl: taskRequest.params?.callback
    }

    try {
      const insertTaskMsg = JSON.stringify(taskMsg)
      const insertTaskData = baseService.compress(taskResult)
      const dataRes = await redisService.setex(dataKey, insertTaskData, 600)

      if (!dataRes) {
        if (isDebug) console.log('Add task error: !dataRes', dataRes)
        return null
      }

      const res = await redisService.push(taskListKey, insertTaskMsg, (typeof currTaskId !== 'undefined'))

      if (!res) {
        if (isDebug) console.log('Add task error: !res', res)
        return null
      }

      return taskId
    } catch (err) {
      if (isDebug) console.log('addTask err:', err)
    }

    return null
  }

  /**
   * 获取任务详情
   *
   * @param taskId
   * @returns
   */
  public async getTask(taskId: string): Promise<renderResult | null> {
    let taskResult: renderResult | null = null

    try {
      const res = await redisService.get(redisOptions.keyPrefix + taskId)

      if (!res || !Buffer.isBuffer(res)) {
        if (!Buffer.isBuffer(res)) {
          console.log('!Buffer.isBuffer(res)', res)
        }
        return taskResult
      }

      try {
        const uncompressed = await baseService.uncompress(res)

        if (uncompressed === null) {
          if (isDebug) console.log('uncompressed is:', uncompressed)
          return taskResult
        }
        taskResult = JSON.parse(uncompressed)
      } catch (err) {
        if (isDebug) console.log(err)
        taskResult = JSON.parse(res.toString())
      }

      return taskResult
    } catch (err) {
      if (isDebug) console.log(err)
    }

    return taskResult
  }

  /**
   * 任务进程
   *
   */
  public async waitTask(): Promise<void> {
    console.log('Task is running.')

    while (true) {
      console.log('Re-brpop')

      let brpopItem: string | null

      try {
        brpopItem = await redisService.brpop(taskListKey)
        if (!brpopItem) {
          if (brpopItem !== '') {
            // 不是故意置空的
            await baseService.msleep(300)
          }
          continue
        }
      } catch (err) {
        await baseService.msleep(500)
        console.log('brpop Error, try again')
        continue
      }
      // 消息处理任务

      let taskMsg: taskMsg
      let taskDoingCacheField: string
      let dataKey: string

      try {
        taskMsg = JSON.parse(brpopItem)
        // 跳过缺少必要信息的任务
        if (!taskMsg || !taskMsg.taskId || !taskMsg.method || !taskMsg.url) {
          continue
        }
        dataKey = redisOptions.keyPrefix + taskMsg.taskId

        // 把取出的任务同时放入暂存区，如果进程中断，暂存区重新补上
        taskDoingCacheField = taskMsg.taskId + ':' + Date.now().toString()
        void redisService.hset(taskDoingCacheKey, taskDoingCacheField, brpopItem)

        // 设为处理中 doing
        const taskResult: taskResult = {
          success    : true,
          status     : 'doing',
          callbackUrl: taskMsg.params!.callback
        }
        const insertTaskData = baseService.compress(taskResult)

        await redisService.setex(dataKey, insertTaskData, 120)
        // continue
      } catch (e) {
        continue
      }

      const taskRes = await this.executeTask(taskMsg.method, taskMsg.url, taskMsg.params)

      /*
        如果执行中超过三分钟，则认为失败，任务机器销毁导致的任务中断等
        针对失败的任务，重新放入队列尾部
      */

      const taskRequest: taskRequest = {
        method: taskMsg.method,
        url   : taskMsg.url,
        params: taskMsg.params
      }

      let dataRes: boolean

      try {
        const insertData = baseService.compress(taskRes)

        dataRes = await redisService.setex(dataKey, insertData, 120)
      } catch (e) {
        console.log('wait catch: ', e)
        continue
      }

      if (dataRes) {
        if (taskMsg.params && taskMsg.params.callback) {
          // httpTask.addTask(taskMsg.params!.callback, taskMsg.taskId)
          const httpTaskMsg: httpTaskMsgOption = {
            ppteTaskId: taskMsg.taskId,
            url       : taskMsg.params.callback
          }

          void httpTask.addTask(httpTaskMsg)
        }
        // 执行完成，从暂存区删除
        console.log('del brpopItem:', brpopItem)
        void redisService.hdel(taskDoingCacheKey, taskDoingCacheField)
      } else {
        console.log('Update task result failed(and Re-insert): ' + dataKey)
        void this.addTask(taskRequest, taskMsg.taskId)
      }
    }
    // end while
  }

  // 异常中断的doing中的任务放入队列
  public async doingToTask(): Promise<void> {
    //    while(true) {
    // 获取所有的field和value
    const doingCache = await redisService.hgetAll(taskDoingCacheKey)

    if (!doingCache) {
      await baseService.msleep(1000)
      return
    }
    const doingTaskList: Record<string, unknown>[] = []

    Object.keys(doingCache).forEach((key) => {
      const field = key.slice(0, 36) || ''
      const createdAt = parseInt(key.slice(-13), 10) || 0
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const insertTaskMsg = doingCache[key].toString()
      const element: Record<string, unknown> = { key: field, createdAt, value: insertTaskMsg }

      doingTaskList.push(element)
    })

    for (const item of doingTaskList) {
      const itemObj = JSON.parse(JSON.stringify(item))

      if (typeof itemObj.createdAt !== 'number') {
        continue
      }
      // 超过2分钟
      if (Date.now() - itemObj.createdAt > 2 * 60 * 1000) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        const field = `${itemObj.key}:${itemObj.createdAt}`

        // 插入队列，删除缓存
        redisService.redisClient.batch()
          .rpush(taskListKey, itemObj.value)
          .hdel(taskDoingCacheKey, field)
          .exec((err, reply) => {
            if (err) {
              console.log(err)
              return
            }
            if (typeof reply !== 'object') {
              return
            }
            reply.forEach((ret, idx) => {
              if (idx % 2) {
                console.log('rpush ret: ', ret)
              } else {
                console.log('hdel ret: ', ret)
              }
            })
          })
      }
    }

    await baseService.msleep(8000)
    //    }
  }

  /**
   * 执行任务
   *
   * @param method
   * @param url
   * @param params
   * @returns
   */
  public async executeTask(method: string, url: string, params?: requestOptions): Promise<renderResult> {
    let renderResult: renderResult = {}

    switch (method) {
      case 'ssr':
      case 'screenshot':
      case 'pdf':
      case 'reslist':
      case 'trace':
      case 'coverage': {
        renderResult = await snailServer.render(url, method, params)
        break
      }
      case 'lighthouse': {
        renderResult = await snailServer.lighthouse(url, params)
        break
      }
      default: {
        renderResult.errno = 560
        renderResult.body = null
        break
      }
    }

    return renderResult
  }
}

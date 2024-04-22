/* eslint-disable no-await-in-loop */
import Koa from 'koa'
import uuid from 'uuid-random'
import validUrl from 'node-uri'
import { isDebug, port, connectionTimeout } from './config'
import { ppteTask, requestParamsDefault } from './utils/taskBase'
import { ParsedUrlQuery } from 'querystring'
import { taskRequest, taskResult } from './utils'

const app = new Koa({ env: 'development' })

server().then(() => {
  console.log('API Service listening on port', port)
}).catch((e: Error) => {
  console.log('Message: ', e.message)
})

async function server() {
  app.use(async (ctx) => {
    const response = await route(ctx)

    ctx.type = 'application/json; charset=utf-8'
    // ctx.type = 'text/html; charset=utf-8'
    ctx.body = response
    ctx.status = 200
  })

  app.listen(port).on('error', (err) => {
    console.log('app.err:', err)
  })
}

async function route(ctx: Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext, any>) {
  const path = ctx.request.path

  let response: taskResult = {
    success: false
  }

  const methodsMap = new Map([
    ['favicon.ico', null],
    ['ssr', ['get', 'new', 'fetch']],
    ['screenshot', ['get', 'new', 'fetch']],
    ['pdf', ['get', 'new', 'fetch']],
    ['reslist', ['get', 'new', 'fetch']],
    ['trace', ['get', 'new', 'fetch']],
    ['lighthouse', ['get', 'new', 'fetch']],
    ['coverage', ['get', 'new', 'fetch']]
  ])

  const words = path.split('/', 3)
  const method = words[1]
  const action = words[2]

  const actionList = methodsMap.get(method)

  if (!actionList) {
    response.error = 'API is not found.'
    return response
  }

  const getUrl = async (url: string | string[] | undefined) => url && typeof url === 'string' ? url : ''

  for (const item of actionList.values()) {
    if (action === item) {
      // 入参检查
      if (action === 'new') {
        const url = await getUrl(ctx.request.query.url)
        const checkResult = await checkUrl(url)

        if (checkResult.errno > 0) {
          response.error = checkResult.error
          return response
        }
        const paramsCheck = await checkParams(ctx.request.query)
        // console.log(paramsCheck)

        if (paramsCheck.errno > 0) {
          response.error = paramsCheck.error
          return response
        }

        const taskRequest: taskRequest = {
          method,
          url,
          params: paramsCheck.params
        }

        response = await verifyAddTask(await ppteTask.addTask(taskRequest))
        return response
      } else if (action === 'get') {
        const taskId = ctx.request.query.taskId
        const checkResult = await checkTaskId(taskId)

        if (checkResult.errno > 0) {
          response.error = checkResult.error
          return response
        }

        response = await verifyTaskResult(taskId)
        return response
      } else if (action === 'fetch') {
        const url = await getUrl(ctx.request.query.url)
        const checkResult = await checkUrl(url)

        if (checkResult.errno > 0) {
          response.error = checkResult.error
          return response
        }

        response = await verifyExecuteTaskResult(method, url)

        return response
      }
    }
  }

  response.error = 'API is not allow.'
  return response
}

async function verifyExecuteTaskResult(method: string, url: string) {
  const taskRet: taskResult = { success: false }

  const executeResult = await ppteTask.executeTask(method, url)

  if (executeResult.errno === 0 || !executeResult.errno) {
    taskRet.success = true
    taskRet.status = 'completed'
    taskRet.data = executeResult
  } else {
    taskRet.status = 'failed'
    taskRet.error = executeResult.error
    if (executeResult.errno === 551) {
      taskRet.error = 'Service temporarily unavailable'
    }
  }

  return taskRet
}

async function checkUrl(url: string): Promise<{
  error: string;
  errno: number;
}> {
  if (!url) {
    return { error: 'url is empty.', errno: 560 }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const ret: any = validUrl.checkWebURL(url)

    if (ret.valid !== true) {
      return { error: 'url is invalid.', errno: 560 }
    }
  } catch (err: any) {
    return { error: `[ ${err.code as string} ] ${err.message as string}`, errno: 560 }
  }

  return { error: '', errno: 0 }
}

async function checkTaskId(taskId: string | string[] | undefined) {
  if (typeof taskId !== 'string') taskId = ''

  if (!taskId) {
    return { error: 'taskId is empty.', errno: 560 }
  }

  if (!uuid.test(taskId)) {
    return { error: 'taskId is invalid.', errno: 560 }
  }
  return { error: '', errno: 0 }
}

async function checkParams(query: ParsedUrlQuery) {
  const result = {
    errno : 0,
    error : '',
    params: requestParamsDefault
  }

  if (typeof query !== 'object') return result

  if (query.callback && typeof query.callback === 'string') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const ret: any = validUrl.checkWebURL(query.callback)

      if (ret.valid === true) {
        result.params.callback = query.callback
      }
    } catch (err) { }

    if (!result.params.callback) {
      result.errno = 560
      result.error = 'callback url is invalid.'
      return result
    }
  }

  if (query.device === 'mobile') {
    result.params.device = 'mobile'
  }

  const viewportArr = typeof query.viewport === 'string' ? query.viewport.split(',') : []
  const viewportX = parseInt(viewportArr[0], 10)
  const viewportY = parseInt(viewportArr[1], 10)
  const viewportS = parseFloat(viewportArr[2])

  if (viewportS > 0 && viewportS <= 10 && (viewportS * viewportX) * (viewportS * viewportY) <= (7680 * 4320)) {
    result.params.viewport = {
      width            : viewportX,
      height           : viewportY,
      deviceScaleFactor: viewportS
    }
  }
  if (typeof query.lazy === 'string' && query.lazy.toLowerCase() === 'yes') {
    result.params.lazy = true
  }
  if (typeof query.extendResponse === 'string' && query.extendResponse.toLowerCase() === 'yes') {
    result.params.extendResponse = true
  }
  if (typeof query.referer === 'string' && query.referer) {
    result.params.referer = query.referer
  }
  if (typeof query.source === 'string' && query.source.toLowerCase() === 'yes') {
    result.params.source = true
  }
  if (typeof query.timeout === 'string') {
    const timeout = parseInt(query.timeout, 10)

    if (timeout >= 500 && timeout <= connectionTimeout) {
      result.params.timeout = timeout
    }
  }

  return result
}

async function verifyTaskResult(taskId: string | string[] | undefined) {
  const taskRet: taskResult = { success: false }

  if (typeof taskId !== 'string') taskId = ''
  if (!taskId) return taskRet
  if (isDebug) console.log(taskId)

  const taskRes = await ppteTask.getTask(taskId)

  if (!taskRes) {
    // redis is empty
    taskRet.status = 'none'
    taskRet.error = 'The task does not exist or has been cleaned up.'
    return taskRet
  }

  if (typeof taskRes.httpCode === 'number' && taskRes.httpCode > 0 && !taskRes.errno) {
    // 正常响应
    taskRet.success = true
    taskRet.status = 'completed'
    taskRet.data = taskRes
  } else {
    if (typeof taskRes.status === 'string') {
      taskRet.status = taskRes.status
      if (taskRes.status === 'waiting') {
        taskRet.success = true
        taskRet.error = 'Task is waiting to be executed.'
      } else if (taskRes.status === 'doing') {
        taskRet.success = true
        taskRet.error = 'Task is in progress.'
      } else {
        taskRet.error = taskRes.error || 'Unknown error.'
      }
    } else {
      taskRet.status = taskRes.status || 'failed'
      taskRet.error = taskRes.error || 'Unknown error.'
    }
  }

  return taskRet
}

async function verifyAddTask(taskId: string | null) {
  if (taskId) {
    return { success: true, taskId }
  }
  return { success: !!taskId, taskId }
}

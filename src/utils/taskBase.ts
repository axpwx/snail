import { redisOptions, deviceArgs } from '../config'
import { requestOptions } from '../utils'
import BaseService from '../service/baseService'
import SnailServer from '../snailServer'
import RedisService from '../service/redisService'
import TaskService from '../service/taskService'
import HttpTaskService from '../service/httpTaskService'

export const baseService = new BaseService()
export const snailServer = new SnailServer()
export const redisService = new RedisService()
export const ppteTask = new TaskService()
export const httpTask = new HttpTaskService()

export const httpTaskListKey = redisOptions.keyPrefix + 'httpTaskList'
export const taskDoingCacheKey = redisOptions.keyPrefix + 'taskDoingCache'
export const taskListKey = redisOptions.keyPrefix + 'taskList'
export const serverStatusMonitorKey = redisOptions.keyPrefix + 'serverStatusMonitor'
export const taskMonitorLockKey = redisOptions.keyPrefix + 'taskMonitorLock'

export const requestParamsDefault: requestOptions = {
  device        : 'pc',
  viewport      : deviceArgs.pc.viewport,
  lazy          : false,
  extendResponse: true,
  userAgent     : deviceArgs.pc.userAgent,
  callback      : undefined,
  referer       : undefined,
  timeout       : 5000
}

import superagent from 'superagent'
import uuid from 'uuid-random'
import { isDebug } from '../config'
import { httpTaskMsg, httpTaskMsgOption } from '../utils'
import { ppteTask, baseService, redisService, httpTaskListKey } from '../utils/taskBase'

export default class httpTaskService {
  /**
   * 添加callback任务，返回taskId
   *
   * @param httpTaskMsg
   * @returns
   */
  public async addTask(httpTaskMsg: httpTaskMsgOption): Promise<string | null> {
    const taskMsg: httpTaskMsg = {
      ppteTaskId: httpTaskMsg.ppteTaskId,
      url       : httpTaskMsg.url,
      taskId    : httpTaskMsg.taskId || uuid(),
      retryTimes: httpTaskMsg.retryTimes || 0,
      execTime  : httpTaskMsg.execTime || this.setNextTime(httpTaskMsg.retryTimes || 0, httpTaskMsg.execTime)
    }

    try {
      const res = await redisService.push(httpTaskListKey, JSON.stringify(taskMsg), true)

      if (!res) {
        if (isDebug) console.log('Add httpTask error.', res)
        return null
      }

      return taskMsg.taskId
    } catch (err) {
      if (isDebug) console.log('Add httpTask err:', err)
    }

    return null
  }

  /**
   * 任务进程
   *
   */
  public async waitTask(): Promise<void> {
    console.log('httpTask is running.')
    while (true) {
      console.log('httpTask Re-brpop')

      let brpopItem: string | null

      try {
        brpopItem = await redisService.brpop(httpTaskListKey)
        if (!brpopItem) {
          if (isDebug) console.log('!brpopItem:', httpTaskListKey)
          await baseService.msleep(500)
          continue
        }
      } catch (err) {
        await baseService.msleep(500)
        if (isDebug) console.log('httpTask brpop Error, try again')
        continue
      }

      const httpTaskMsg: httpTaskMsg = JSON.parse(brpopItem)

      if (!httpTaskMsg.taskId || !httpTaskMsg.url || !httpTaskMsg.ppteTaskId) {
        continue
      }

      if (httpTaskMsg.retryTimes > 7) {
        continue
      }
      console.log((httpTaskMsg.execTime - Date.now()) / 1000)
      if (httpTaskMsg.execTime > Date.now()) {
        await baseService.msleep(3000)
        void this.addTask(httpTaskMsg)
        void redisService.setTTL(httpTaskMsg.ppteTaskId, (httpTaskMsg.execTime - Date.now()) / 1000 + 120)
        continue
      }

      const data = await ppteTask.getTask(httpTaskMsg.ppteTaskId)

      if (!data) {
        continue
      }

      const resCode = await this.executeTask(httpTaskMsg.url, data)

      if (resCode === 0) {
        // 推送失败，插入队列，重新推送
        httpTaskMsg.retryTimes += 1
        httpTaskMsg.execTime = this.setNextTime(httpTaskMsg.retryTimes, httpTaskMsg.execTime || Date.now())
        void this.addTask(httpTaskMsg)
      }
    }
  }

  /**
   * 执行任务
   *
   * @param url
   * @param data
   * @returns
   */
  public executeTask = async (url: string, data: string | Record<string, unknown>): Promise<number> =>
    await this.httpClientPost(url, data)

  /**
   * Http 客户端 POST
   * @param url
   * @param data
   * @returns
   */
  public async httpClientPost(url: string, data: string | Record<string, unknown>): Promise<0 | 1 | -1> {
    if (!url || !data) return -1
    try {
      const resp = await superagent
        .post(url)
        .send(data)
        .set('accept', 'json')
        .set('content-type', 'application/json')
        .set('user-agent', 'Mozilla/5.0 (compatible; Snail-Client/1.0)')
        .timeout({ deadline: 5000, response: 3000 })

      console.log(resp)
      if (resp.ok === true && (resp.statusCode === 200 || resp.statusCode === 204)) {
        if (resp.text.toUpperCase().indexOf('SUCCESS') >= 0) {
          // 成功接收
          return 1
        }
      }
      return 0
    } catch (err) {
      return 0
    }
  }

  private setNextTime(retryTimes: number, execTime: number | undefined) {
    // 每隔5秒/30秒/1分钟/3分钟/5分钟/10分钟/30分钟调用
    if (!retryTimes) return 0
    execTime = execTime || 0

    if (retryTimes === 1) return execTime + 5 * 1000
    else if (retryTimes === 2) return execTime + 30 * 1000
    else if (retryTimes === 3) return execTime + 60 * 1000
    else if (retryTimes === 4) return execTime + 3 * 60 * 1000
    else if (retryTimes === 5) return execTime + 5 * 60 * 1000
    else if (retryTimes === 6) return execTime + 10 * 60 * 1000
    else if (retryTimes === 7) return execTime + 30 * 60 * 1000

    return 0
  }
}

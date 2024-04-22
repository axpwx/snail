/* eslint-disable require-jsdoc */
/* eslint-disable no-await-in-loop */
import osu from 'node-os-utils'
import BaseService from './service/baseService'

const baseService = new BaseService()
const cpu = osu.cpu

void start()

/*
积压的任务，超过阀值调度创建服务器，低于阀值销毁服务器
增加统计功能，渲染次数、平均耗时，cpu时间
*/

async function start() {
  while (true) {
    const count = cpu.count()

    console.log('CPU Count:', count)
    void cpu.usage().then((cpuPercentage) => {
      console.log('CPU Usage:', cpuPercentage)
    })
    console.log('Memory Usage:', process.memoryUsage())

    await baseService.msleep(1000)
  }
}

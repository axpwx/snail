import { ppteTask, redisService, baseService, serverStatusMonitorKey, taskMonitorLockKey } from './utils/taskBase'
import uuid from 'uuid-random'
import osu from 'node-os-utils'
import fs from 'fs'
import { execSync } from 'child_process'

const cpu = osu.cpu
const machineId = getMachineId()

void startDoingToTask()
void startStatusMonitor()

// Task监控补偿，限制全局单进程运行
async function startDoingToTask() {
  while (true) {
    const taskMonitorLock = await redisService.get(taskMonitorLockKey)

    if (taskMonitorLock) {
      void redisService.setex(taskMonitorLockKey, Date.now().toString(), 10)
      await baseService.msleep(5000)
      continue
    }

    const setRedisResult = await redisService.setex(taskMonitorLockKey, Date.now().toString(), 10)

    if (setRedisResult) {
      void ppteTask.doingToTask()
    }
    await baseService.msleep(5000)
  }
}

// 上报当前机器数据，cpu数量、负载等
async function startStatusMonitor() {
  while (true) {
    void cpu.usage().then((cpuPercentage) => {
      void reportData({
        cpuCount: cpu.count(),
        cpuPercentage,
        loadavg : cpu.loadavg()
      })
    })

    await baseService.msleep(5000)
  }
}

function getMachineId() {
  const platform = process.platform
  // eslint-disable-next-line no-shadow,@typescript-eslint/no-shadow
  let machineId = ''

  if (platform === 'linux') {
    const reg = /([a-fA-F0-9]{32})/

    try {
      const data = fs.readFileSync('/var/lib/dbus/machine-id', 'utf8')

      if (reg.test(data) === true) {
        machineId = data
      }
    } catch (err: any) {
      try {
        const data = fs.readFileSync('/etc/machine-id', 'utf8')

        if (reg.test(data) === true) {
          machineId = data
        }
      } catch (e: any) { }
    }
  } else if (platform === 'darwin') {
    // MacOS
    try {
      const command = 'ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID | awk -F \'"\' \'{print $4}\''
      const output = execSync(command, { encoding: 'utf8' })
      const reg = /([a-fA-F0-9]{8})-([a-fA-F0-9]{4})-([a-fA-F0-9]{4})-([a-fA-F0-9]{4})-([a-fA-F0-9]{12})/

      if (reg.test(output) === true) {
        machineId = output.toLowerCase()
      }
    } catch (err: any) { }
  } else if (platform === 'win32') {
    // reg query HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography /v MachineGuid

  } else if (platform === 'freebsd') {
    /*
    cat /etc/hostid
    # or (might be empty)
    kenv -q smbios.system.uuid
    */
  }

  if (!machineId) {
    console.warn('Cannot get the machineId, platform is:', platform)
    const idFile = './.machineId'

    try {
      const data = fs.readFileSync(idFile, 'utf8')

      if (uuid.test(data) === true) {
        machineId = data
      }
    } catch (err: any) { }

    if (!machineId) {
      machineId = uuid()
      fs.writeFileSync(idFile, machineId)
    }
  }

  return machineId
}

async function reportData(report: Record<string, unknown>) {
  const insertData = JSON.stringify({
    time: Date.now(),
    report
  })

  void redisService.hset(serverStatusMonitorKey, 'server:' + machineId, insertData)
}

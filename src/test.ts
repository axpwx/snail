import { snailServer, baseService } from './utils/taskBase'

start().catch(console.error)

async function start() {
  const url = 'https://wx.shunliandongli.com/home'

  console.time('all')

  console.time('ssr')
  const ssr = snailServer.render(url, 'ssr')

  console.log(ssr)
  console.timeEnd('ssr')

  console.time('screenshot')
  void snailServer.render(url, 'screenshot')
  console.timeEnd('screenshot')

  console.time('pdf')
  void snailServer.render(url, 'pdf')
  console.timeEnd('pdf')

  console.time('reslist')
  void snailServer.render(url, 'reslist')
  console.timeEnd('reslist')

  console.time('trace')
  void snailServer.render(url, 'trace')
  console.timeEnd('trace')

  console.time('lhTask')
  void snailServer.lighthouse(url)
  console.timeEnd('lhTask')

  console.time('testCompress')
  const value = {
    key1: 11111,
    key2: false,
    key3: { html: 'html content', status: 200 },
    key4: undefined
  }
  const compressed = baseService.compress(value)

  void baseService.uncompress(compressed)
  console.timeEnd('testCompress')

  console.time('msleep')
  await baseService.msleep(3000)
  console.log('msleep')
  console.timeEnd('msleep')

  console.timeEnd('all')
}

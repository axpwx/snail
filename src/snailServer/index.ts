import puppeteer from 'puppeteer'
import lighthouse from 'lighthouse'
import WebSocket from 'ws'
import { isDebug, browserWSEndpoint, connectionTimeout } from '../config'
import { renderResult, requestOptions } from '../utils'
import { requestParamsDefault } from '../utils/taskBase'
import { abortReq, setDevice, scrollTo, setRealFeature, getLocalStorage, getSessionStorage } from './utils'
import { IncomingMessage } from 'http'

export default class snailServer {
  /**
   * 渲染页面，用于SSR、截图等
   * 创建可以在 Chrome DevTools or timeline viewer 中打开的跟踪文件
   *
   * @param url
   * @param method
   * @param params
   * @returns
   */
  public async render(url: string, method: string, params?: requestOptions): Promise<renderResult> {
    process.on('unhandledRejection', (reason: Error, promise) => {
      console.log('Unhandled Rejection at:', promise, 'reason:', reason)
      // socket hang up是连接池超出了进程限制，需要等待
      if (reason.message === 'socket hang up') {
        setTimeout(() => {
          console.log()
          console.log()
          console.log('ErrorEvent: ' + reason.message)
          void this.render(url, method, params)
        }, 500)
      }
      return
    })

    params = params || requestParamsDefault
    const renderResult: renderResult = {
      httpCode: 0,
      body    : null
    }

    try {
      const browser = await puppeteer.connect({ browserWSEndpoint })
      const page = await browser.newPage()

      try {
        await page.setCacheEnabled(true)
        await setDevice(page, params)
        await setRealFeature(page)

        // page.on('close', () => { browser.disconnect() })
        page.on('error', (err) => {
          console.log(url, err)
        })
        page.on('pageerror', (err) => {
          console.log(url, err)
        })
        // 禁止下载
        const client = await page.target().createCDPSession()

        await client.send('Page.setDownloadBehavior', { behavior: 'deny' })
        if (method === 'screenshot' || method === 'pdf') {
          // 屏蔽弹窗
          page.on('dialog', (dialog) => {
            void dialog.dismiss()
          })
        }
        /*
        // 禁用alert，因为它会阻塞
        await page.evaluateOnNewDocument(() => {
          setTimeout(function() {
            // eslint-disable-next-line no-undef
            Object.defineProperty(window, 'alert', { value: function alert(parameter) { return undefined } })
          }, 40)
          // 延迟执行，因为0延迟会被检测出来
        })
        */

        /**
         * 设置一些需要在goto前进行的操作
         */
        let resList: string[] = []

        if (method === 'ssr' || method === 'reslist') {
          // 拦截请求，不实际加载img等资源
          await abortReq(page, method).then((res) => { resList = res }).catch(async (err: Error) => {
            console.log('catch err', err)
            await page.close()
            browser.disconnect()
            renderResult.error = err.message
            renderResult.errno = 554
            return renderResult
          })
        /*
          try {
            await page.setRequestInterception(true)
            page.on('request', (req) => {
              if (method === 'reslist') {
                if (!req.url().startsWith('data:')) {
                  resList.push(req.url())
                } else {
                  // if(isDebug) console.log(req.url())
                }
              }
              const allowlist = ['document', 'script', 'xhr', 'fetch', 'stylesheet']

              if (!allowlist.includes(req.resourceType())) {
                if (isDebug && method === 'ssr') {
                  console.log('Abort url: ' + req.resourceType() + ': ' + req.url())
                }
                return req.abort()
              }
              if (req.resourceType() === 'script' && (
                req.url().indexOf('.google-analytics.com') > -1 ||
                req.url().indexOf('.googletagmanager.com') > -1 ||
                req.url().indexOf('.hm.baidu.com') > -1 ||
                req.url().indexOf('.cnzz.com') > -1 ||
                req.url().indexOf('sdk.51.la') > -1 ||
                req.url().indexOf('js.users.51.la') > -1
              )) {
                return req.abort()
              }
              return req.continue()
            })
          } catch (err: any) {
            await page.close()
            browser.disconnect()
            renderResult.error = err.message
            renderResult.errno = 554
            return renderResult
          }
        */
        } else if (method === 'trace') {
          await page.tracing.start({ categories: ['devtools.timeline'], screenshots: true })
        } else if (method === 'coverage') {
          void page.coverage.startJSCoverage()
          void page.coverage.startCSSCoverage()
        }

        let resp: puppeteer.HTTPResponse | null
        let respErr: string | null = null

        try {
          resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: params.timeout, referer: params.referer })
        } catch (err: any) {
          resp = null
          respErr = err.message
        }

        if (!resp) {
          if (isDebug) console.log('!resp:', resp)
          await page.close()
          browser.disconnect()

          renderResult.errno = 553
          renderResult.error = respErr || 'Request failed.'

          return renderResult
        }

        if (method === 'screenshot' || method === 'pdf' || method === 'reslist') {
          await scrollTo(page, params)
        /*
          const dimensions = await page.evaluate(() => {
            return {
              width: document.documentElement.clientWidth,
              height: document.documentElement.clientHeight,
              maxHeight: Math.max(
                document.body.scrollHeight, document.documentElement.scrollHeight,
                document.body.offsetHeight, document.documentElement.offsetHeight,
                document.body.clientHeight, document.documentElement.clientHeight),
              deviceScaleFactor: window.devicePixelRatio
            }
          })

          const scrollHeight = page.viewport()?.height || params.viewport.height
          let scrollNum = Math.ceil(dimensions.maxHeight / scrollHeight)
          if (isDebug) {
            console.log('dimensions.maxHeight: ' + dimensions.maxHeight)
            console.log('scrollHeight: ' + scrollHeight)
            console.log('scrollNum: ' + scrollNum)
          }

          if (scrollNum > 1) {
            if (scrollNum > 10) scrollNum = 10
            for (let y = 1; y <= scrollNum; y += 1) {
              const posY = (y + 1) * scrollHeight
              await page.evaluate('window.scrollTo(0, ' + posY + ')')
              await page.waitForTimeout(300)
              if (isDebug) {
                console.log('y: ' + y)
                console.log('posY: ' + posY)
              }
            }
          }
        */
        }

        // mouse move
        await page.mouse.move(400, 400)
        await page.mouse.down()
        await page.mouse.move(491, 460)

        switch (method) {
          case 'ssr': {
            renderResult.body = await page.content()
            break
          }
          case 'screenshot': {
            const screenshot = await page.screenshot({ path: undefined, encoding: 'base64', fullPage: true })

            if (typeof screenshot === 'string' || Buffer.isBuffer(screenshot)) {
              renderResult.body = screenshot
            } else {
              renderResult.body = null
            }
            break
          }
          case 'pdf': {
            await page.emulateMediaType('screen')
            const pdf = await page.pdf({ format: 'a4', printBackground: true })

            renderResult.body = pdf.toString('base64')
            break
          }
          case 'reslist': {
            renderResult.body = resList
            break
          }
          case 'trace': {
            const tracecontent = await page.tracing.stop()

            renderResult.body = tracecontent.toString()
            break
          }
          case 'coverage': {
            const jsCoverage = await page.coverage.stopJSCoverage()
            const cssCoverage = await page.coverage.stopCSSCoverage()

            let totalBytesJS = 0
            let usedBytesJS = 0
            let totalBytesCSS = 0
            let usedBytesCSS = 0

            for (const entry of jsCoverage) {
              totalBytesJS += entry.text.length
              for (const range of entry.ranges) {
                usedBytesJS += range.end - range.start - 1
              }
            }
            for (const entry of cssCoverage) {
              totalBytesCSS += entry.text.length
              for (const range of entry.ranges) {
                usedBytesCSS += range.end - range.start - 1
              }
            }

            const jsCoverageNum = (usedBytesJS / totalBytesJS * 100).toFixed(2)
            const cssCoverageNum = (usedBytesCSS / totalBytesCSS * 100).toFixed(2)

            renderResult.body = { percentage: { js: jsCoverageNum, css: cssCoverageNum }, result: [...jsCoverage] }
            break
          }
          default: {
            renderResult.body = null
            break
          }
        }
        const respCode = resp.status() || 0

        renderResult.httpCode = respCode

        if (method === 'ssr' && params.extendResponse) {
          renderResult.cookies = await page.cookies()
          renderResult.localStorage = await getLocalStorage(page)
          renderResult.sessionStorage = await getSessionStorage(page)
          renderResult.headers = resp.headers()
        }

        await page.close()
        browser.disconnect()
        return renderResult
      } catch (err: any) {
        await page.close()
        browser.disconnect()
        console.log('555 err: ', err)

        renderResult.errno = 555
        renderResult.error = err.message
        return renderResult
      }
    } catch (err: any) {
      console.log('551 err: ', err)

      renderResult.errno = 551
      renderResult.error = err.message
      return renderResult
    }
  }

  /**
   * lighthouse评分
   *
   * @param url
   * @param params
   * @returns
   */
  public async lighthouse(url: string, params?: requestOptions): Promise<renderResult> {
    params = params || requestParamsDefault
    const renderResultSucc: renderResult = {
      httpCode: 200,
      body    : null
    }
    const renderResultErr: renderResult = {
      errno: 570,
      error: 'unknown error'
    }

    function getPortFromHeaders(req: IncomingMessage) {
      if (!req.rawHeaders || typeof req.rawHeaders !== 'object') return 0
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (req.rawHeaders[i].toLowerCase() === 'x-real-backend-port') {
          return parseInt(req.rawHeaders[i + 1], 10)
        }
      }
      return 0
    }

    const ws = new WebSocket(browserWSEndpoint, { handshakeTimeout: 100, timeout: params.timeout })
    const backendResult = new Promise((resolve, reject) => {
      ws.on('upgrade', (req) => {
        const backendPort: number = getPortFromHeaders(req)
        // console.log('upgrade:',backendPort)

        resolve(backendPort)
      })
      ws.on('close', (code) => {
        console.log('close:', code)
        reject(new Error(code.toString()))
      })
      ws.on('error', (err) => {
        // console.log('error1:',err)
        ws.close()
        reject(err)
      })

      setTimeout(() => {
        ws.close()
        reject(new Error('time out'))
      }, connectionTimeout * 2)
    })

    try {
      const browserPort = await backendResult

      if (typeof browserPort === 'number') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const lhr = await lighthouse(url, {
          port    : browserPort,
          output  : 'html',
          logLevel: isDebug ? 'info' : undefined
        })

        ws.close()

        renderResultSucc.body = lhr
        return renderResultSucc
      }
      return renderResultErr
    } catch (err: any) {
      renderResultErr.error = err.message
      return renderResultErr
    }
  }
}

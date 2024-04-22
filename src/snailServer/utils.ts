/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable prefer-const */
/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-var */
/* eslint-disable object-shorthand */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-proto */
/* eslint-disable newline-after-var */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-misused-promises */
import puppeteer from 'puppeteer'
import { isDebug } from '../config'
import { requestOptions } from '../utils'

export async function abortReq(page: puppeteer.Page, method: string): Promise<string[]> {
  try {
    const resList: string[] = []

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
      const resType = req.resourceType()

      if (!allowlist.includes(resType)) {
        if (isDebug && method === 'ssr') {
          console.log('Abort url: ' + resType + ': ' + req.url())
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
    return resList
  } catch (err: any) {
    console.log('catch err2:', err)
    throw err
  }
}

export async function scrollTo(page: puppeteer.Page, params: requestOptions): Promise<void> {
  const dimensions = await page.evaluate(() => {
    return {
      width    : document.documentElement.clientWidth,
      height   : document.documentElement.clientHeight,
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
    console.log('dimensions.maxHeight:', dimensions.maxHeight)
    console.log('scrollHeight:', scrollHeight)
    console.log('scrollNum:', scrollNum)
  }

  if (scrollNum > 1) {
    if (scrollNum > 10) scrollNum = 10
    for (let y = 1; y <= scrollNum; y += 1) {
      const posY = (y + 1) * scrollHeight

      await page.evaluate('window.scrollTo(0, ' + posY + ')')
      await page.waitForTimeout(300)
      if (isDebug) {
        console.log('y:', y)
        console.log('posY:', posY)
      }
    }
  }
}

/**
 * 设置真实浏览器特征
 *
 * check Urls:
 * https://bot.sannysoft.com/
 * https://arh.antoinevastel.com/bots/areyouheadless
 * https://infosimples.github.io/detect-headless/
 *
 * @param page
 */
export async function setRealFeature(page: puppeteer.Page): Promise<void> {
  // webdriver
  await page.evaluateOnNewDocument(() => {
    // @ts-ignore
    const newProto = navigator.__proto__
    delete newProto.webdriver
    // @ts-ignore
    navigator.__proto__ = newProto
  })

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
  })

  // iframe
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get: () => window
    })
  })

  await page.evaluateOnNewDocument(() => {
    // @ts-ignore
    window.chrome = {}
    // @ts-ignore
    window.chrome.app = {
      getDetails    : () => { },
      getIsInstalled: () => { },
      installState  : () => { },
      runningState  : () => { }
    }
    // @ts-ignore
    window.chrome.csi = () => { }
    // @ts-ignore
    window.chrome.loadTimes = () => { }
    // @ts-ignore
    window.chrome.runtime = () => { }
  })

  // plugins设置
  await page.evaluateOnNewDocument(() => {
    /* global MimeType MimeTypeArray PluginArray */
    const fakeData = {
      mimeTypes: [
        {
          type        : 'application/pdf',
          suffixes    : 'pdf',
          description : '',
          __pluginName: 'Chrome PDF Viewer'
        },
        {
          type        : 'application/x-google-chrome-pdf',
          suffixes    : 'pdf',
          description : 'Portable Document Format',
          __pluginName: 'Chrome PDF Plugin'
        },
        {
          type         : 'application/x-nacl',
          suffixes     : '',
          description  : 'Native Client Executable',
          enabledPlugin: Plugin,
          __pluginName : 'Native Client'
        },
        {
          type        : 'application/x-pnacl',
          suffixes    : '',
          description : 'Portable Native Client Executable',
          __pluginName: 'Native Client'
        }
      ],
      plugins: [
        {
          name       : 'Chrome PDF Plugin',
          filename   : 'internal-pdf-viewer',
          description: 'Portable Document Format'
        },
        {
          name       : 'Chrome PDF Viewer',
          filename   : 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
          description: ''
        },
        {
          name       : 'Native Client',
          filename   : 'internal-nacl-plugin',
          description: ''
        }
      ],
      fns: {
        namedItem: (instanceName) => {
          // Returns the Plugin/MimeType with the specified name.
          return function namedItem(name) {
            if (!arguments.length) {
              throw new TypeError(
                `Failed to execute 'namedItem' on '${instanceName}': 1 argument required, but only 0 present.`
              )
            }
            // @ts-ignore
            return this[name] || null
          }
        },
        item: (instanceName) => {
          // Returns the Plugin/MimeType at the specified index into the array.
          return function item(index) {
            if (!arguments.length) {
              throw new TypeError(
                `Failed to execute 'namedItem' on '${instanceName}': 1 argument required, but only 0 present.`
              )
            }
            // @ts-ignore
            return this[index] || null
          }
        },
        refresh: (instanceName) => {
          // Refreshes all plugins on the current page, optionally reloading documents.
          return function refresh() {
            return undefined
          }
        }
      }
    }
    // Poor mans _.pluck
    const getSubset = (keys, obj) => keys.reduce((a, c) => ({ ...a, [c]: obj[c] }), {})
    function generateMimeTypeArray() {
      const arr = fakeData.mimeTypes
        .map((obj) =>
          getSubset(['type', 'suffixes', 'description'], obj)
        )
        .map((obj) => Object.setPrototypeOf(obj, MimeType.prototype))
      arr.forEach((obj) => {
        Object.defineProperty(arr, obj.type, {
          value     : obj,
          enumerable: false
        })
      })

      // Mock functions
      // @ts-ignore
      arr.namedItem = fakeData.fns.namedItem('MimeTypeArray')
      // @ts-ignore
      arr.item = fakeData.fns.item('MimeTypeArray')

      return Object.setPrototypeOf(arr, MimeTypeArray.prototype)
    }

    const mimeTypeArray = generateMimeTypeArray()
    Object.defineProperty(Object.getPrototypeOf(navigator), 'mimeTypes', {
      get: () => mimeTypeArray
    })

    function generatePluginArray() {
      const arr = fakeData.plugins
        .map((obj) =>
          getSubset(['name', 'filename', 'description'], obj)
        )
        .map((obj) => {
          const mimes = fakeData.mimeTypes.filter(
            (m) => m.__pluginName === obj.name
          )
          // Add mimetypes
          mimes.forEach((mime, index) => {
            navigator.mimeTypes[mime.type].enabledPlugin = obj
            obj[mime.type] = navigator.mimeTypes[mime.type]
            obj[index] = navigator.mimeTypes[mime.type]
          })
          obj.length = mimes.length
          return obj
        })
        .map((obj) => {
          // Mock functions
          obj.namedItem = fakeData.fns.namedItem('Plugin')
          obj.item = fakeData.fns.item('Plugin')
          return obj
        })
        .map((obj) => Object.setPrototypeOf(obj, Plugin.prototype))
      arr.forEach((obj) => {
        Object.defineProperty(arr, obj.name, {
          value     : obj,
          enumerable: false
        })
      })

      // Mock functions
      // @ts-ignore
      arr.namedItem = fakeData.fns.namedItem('PluginArray')
      // @ts-ignore
      arr.item = fakeData.fns.item('PluginArray')
      // @ts-ignore
      arr.refresh = fakeData.fns.refresh('PluginArray')

      return Object.setPrototypeOf(arr, PluginArray.prototype)
    }

    const pluginArray = generatePluginArray()
    Object.defineProperty(Object.getPrototypeOf(navigator), 'plugins', {
      get: () => pluginArray
    })
  })

  // languages设置
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] })
  })

  // 屏幕方向
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(ScreenOrientation.prototype, 'type', { get: () => 'landscape-primary' })
    Object.defineProperty(ScreenOrientation.prototype, 'angle', { get: () => 0 })
  })
  // Fix HTMLElement animate toString (Puppeteer doesn't make it native code for some reason)
  await page.evaluateOnNewDocument(() => {
    const oldAnimate = HTMLElement.prototype.animate
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      value: function animate(parameters) {
        return oldAnimate(this, parameters)
      }
    })
  })

  // 页面可见性检测
  await page.evaluateOnNewDocument(() => {
    // https://adtechmadness.wordpress.com/2019/03/14/spoofing-viewability-measurements-technical-examples/
    Object.defineProperty(document, 'hidden', { get: () => false })
    Object.defineProperty(document, 'webkitHidden', { get: () => false })
    Object.defineProperty(Document.prototype, 'visiblityState', { get: () => 'visible' })
    Object.defineProperty(BarProp.prototype, 'visible', { get: () => true })
    Object.defineProperty(Document.prototype, 'onvisiblitychange', { set: (params) => function() { } })
    Object.defineProperty(Document.prototype, 'hasFocus', {
      value: function hasFocus(document) { return true }
    })
  })

  // 通知等权限
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query
    // @ts-ignore
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    )
  })
  // default broken image test
  await page.evaluateOnNewDocument(() => {
    ['height', 'width'].forEach((property) => {
      // store the existing descriptor
      const imageDescriptor = Object.getOwnPropertyDescriptor(
        HTMLImageElement.prototype, property
      )
      Object.defineProperty(HTMLImageElement.prototype, property, {
        ...imageDescriptor,
        get: function() {
          if (this.complete && this.naturalHeight === 0) { return 16 }
          // @ts-ignore
          return imageDescriptor.get.apply(this)
        }
      })
    })
  })

  await page.evaluateOnNewDocument(() => {
    /* Copied from Google Chrome v83 on Linux */
    var currentTime = new Date().getTime()
    var currentTimeDivided = currentTime / 1000
    var randOffset = Math.random() * 3

    Object.defineProperty(window, 'chrome', {
      writable    : true,
      enumerable  : true,
      configurable: false,
      value       : {}
    })

    // @ts-ignore
    Object.defineProperty(window.chrome, 'csi', {
      value: function csi() {
        // https://chromium.googlesource.com/chromium/src.git/+/master/chrome/renderer/loadtimes_extension_bindings.cc
        return {
          startE : currentTime,
          onloadT: currentTime + 3 * randOffset,
          pageT  : 30000 * randOffset,
          tran   : 15
        }
      }
    })

    // @ts-ignore
    Object.defineProperty(window.chrome, 'loadTimes', {
      value: function loadTimes() {
        return {
          requestTime                  : currentTimeDivided + 1 * randOffset,
          startLoadTime                : currentTimeDivided + 1 * randOffset,
          commitLoadTme                : currentTimeDivided + 2 * randOffset,
          finishDocumentLoadTime       : currentTimeDivided + 3 * randOffset,
          firstPaintTime               : currentTimeDivided + 4 * randOffset,
          finishLoadTime               : currentTimeDivided + 5 * randOffset,
          firstPaintAfterLoadTime      : 0,
          navigationType               : 'Other',
          wasFetchedViaSpdy            : true,
          wasNpnNegotiated             : true,
          npnNegotiatedProtocol        : 'h2',
          wasAlternateProtocolAvailable: false,
          connectionInfo               : 'h2'
        }
      }
    })

    const stripErrorWithAnchor = (err, anchor) => {
      const stackArr = err.stack.split('\n')
      const anchorIndex = stackArr.findIndex((line) =>
        line.trim().startsWith(anchor)
      )
      if (anchorIndex === -1) {
        // 404, anchor not found
        return err
      }
      // Strip everything from the top until we reach the anchor line (remove anchor line as well)
      // Note: We're keeping the 1st line (zero index) as it's unrelated (e.g. `TypeError`)
      stackArr.splice(1, anchorIndex)
      err.stack = stackArr.join('\n')
      return err
    }

    const makeError = {
      ErrorInInvocation: (fn) => {
        const err = new TypeError(`Error in invocation of app.${fn}()`)
        return stripErrorWithAnchor(err, `at ${fn} (eval at <anonymous>`)
      }
    }

    // eslint-disable-next-line max-len
    // https://github.com/berstend/puppeteer-extra/blob/9c3d4aace43cb44da984f1e2f581ad376ebefeea/packages/puppeteer-extra-plugin-stealth/evasions/chrome.app/index.js
    // @ts-ignore
    Object.defineProperty(window.chrome, 'app', {
      value: {
        InstallState: {
          DISABLED     : 'disabled',
          INSTALLED    : 'installed',
          NOT_INSTALLED: 'not_installed'
        },
        RunningState: {
          CANNOT_RUN  : 'cannot_run',
          READY_TO_RUN: 'ready_to_run',
          RUNNING     : 'running'
        },
        get isInstalled() { return false },
        getDetails: function getDetails() {
          if (arguments.length) {
            throw makeError.ErrorInInvocation(`getDetails`)
          }
          return null
        },
        getIsInstalled: function getIsInstalled() {
          if (arguments.length) {
            throw makeError.ErrorInInvocation(`getIsInstalled`)
          }
          return false
        },
        runningState: function runningState() {
          if (arguments.length) {
            throw makeError.ErrorInInvocation(`runningState`)
          }
          return 'cannot_run'
        }
      }
    })
  })

  // Overwrite iframe window object so we don't have to reapply the above evasions for every iframe
  // eslint-disable-next-line max-len
  // Stolen from https://github.com/berstend/puppeteer-extra/blob/ceca9c6fed0a9f39d6c80b71fd413f3656ebb704/packages/puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js
  await page.evaluateOnNewDocument(() => {
    try {
      const addContentWindowProxy = (iframe) => {
        const contentWindowProxy = {
          get(target, key) {
            if (key === 'self') { return this }
            if (key === 'frameElement') { return iframe }
            return Reflect.get(target, key)
          }
        }

        if (!iframe.contentWindow) {
          const proxy = new Proxy(window, contentWindowProxy)
          Object.defineProperty(iframe, 'contentWindow', {
            get() { return proxy },
            set(newValue) { return newValue },
            enumerable  : true,
            configurable: false
          })
        }
      }

      const handleIframeCreation = (target, thisArg, args) => {
        const iframe = target.apply(thisArg, args)
        const _iframe = iframe
        const _srcdoc = _iframe.srcdoc

        Object.defineProperty(iframe, 'srcdoc', {
          configurable: true,
          get         : function() { return _iframe.srcdoc },
          set         : function(newValue) {
            addContentWindowProxy(this)
            Object.defineProperty(iframe, 'srcdoc', {
              configurable: false,
              writable    : false,
              value       : _srcdoc
            })
            _iframe.srcdoc = newValue
          }
        })
        return iframe
      }

      const addIframeCreationSniffer = () => {
        const createElement = {
          get(target, key) { return Reflect.get(target, key) },
          apply: function(target, thisArg, args) {
            const isIframe =
              args &&
              args.length &&
              `${args[0]}`.toLowerCase() === 'iframe'
            if (!isIframe) {
              return target.apply(thisArg, args)
            }
            return handleIframeCreation(target, thisArg, args)
          }
        }
        document.createElement = new Proxy( document.createElement, createElement)
      }

      addIframeCreationSniffer()
    } catch (err) { }
  })

  // WEB GL
  await page.evaluateOnNewDocument(() => {
    WebGLRenderingContext.prototype.getParameter = (function getParameter(
      originalFunction
    ) {
      const paramMap = {}
      paramMap[0x9245] = 'Intel Open Source Technology Center'
      paramMap[0x9246] = 'Mesa DRI Intel(R) HD Graphics 5500 (Broadwell GT2)'
      paramMap[0x1f00] = 'WebKit'
      paramMap[0x1f01] = 'WebKit WebGL'
      paramMap[0x1f02] = 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'

      // eslint-disable-next-line no-shadow,@typescript-eslint/no-shadow
      return function getParameter(parameter) {
        // @ts-ignore
        return (paramMap[parameter] || originalFunction.call(this, parameter))
      }
    })(WebGLRenderingContext.prototype.getParameter)
  })
}

export async function setDevice(page: puppeteer.Page, params: requestOptions): Promise<void> {
  if (params.device === 'mobile') {
    await page.emulate({ userAgent: params.userAgent, viewport: params.viewport })
  } else {
    await page.setUserAgent(params.userAgent)
    await page.setViewport(params.viewport)
  }
}

export async function getLocalStorage(page: puppeteer.Page): Promise<Record<string, unknown>> {
  return await page.evaluate(() => {
    let json = {}
    for (let i = 0; i < localStorage.length; i ++) {
      let key = localStorage.key(i)
      if (!key) continue
      json[key] = JSON.parse(JSON.stringify(localStorage.getItem(key)))
      try {
        json[key] = JSON.parse(json[key])
      } catch (e) { }
    }
    return json
  })
}

export async function getSessionStorage(page: puppeteer.Page): Promise<Record<string, unknown>> {
  return await page.evaluate(function() {
    let json = {}
    for (let i = 0; i < sessionStorage.length; i ++) {
      let key = sessionStorage.key(i)
      if (!key) continue
      json[key] = JSON.parse(JSON.stringify(sessionStorage.getItem(key)))
      try {
        json[key] = JSON.parse(json[key])
      } catch (e) { }
    }
    return json
  })
}

// process.setMaxListeners(0)
import { RetryStrategyOptions } from 'redis'
const { env } = process
const getNumber = (value: any, defaults: number): number =>
  (typeof value === 'undefined' ? defaults : Number(value)) || defaults

export const isDebug             = false
export const platform            = process.platform
export const port                = getNumber(env.PORT, 18080)
export const proxyPort           = getNumber(env.SNAIL_PROXY_PORT, 13131)
export const maxPoolSize         = getNumber(env.MAX_POOL_SIZE, 1)
export const minPoolSize         = getNumber(env.MIN_POOL_SIZE, 1)
export const connectionTimeout   = getNumber(env.CONNECTION_TIMEOUT, 10000)
export const healthCheckEndpoint = env.HEALTH_CHECK_ENDPOINT || '/status'
export const browserWSEndpoint   = `ws://127.0.0.1:${proxyPort}/`

export const deviceArgs = {
  // iPhone 11 Pro
  mobile: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 ' +
               '(KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    viewport: {
      width            : 375,
      height           : 812,
      deviceScaleFactor: 3,
      isMobile         : true,
      hasTouch         : true,
      isLandscape      : false
    }
  },
  // MacBook PRO 13"
  pc: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
               '(KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    viewport: {
      width            : 1366,
      height           : 900,
      deviceScaleFactor: 2
    }
  }
}

export const puppeteerLaunchParams = {
  browser       : 'Chrome',
  headless      : env.HEADLESS !== 'false',
  executablePath: env.PUPPETEER_EXECUTABLE_PATH ||
                  '/Users/axpwx/webdata/htdocs/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [
    // '--single-process',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--disable-infobars',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-bundled-ppapi-flash',
    '--disable-background-networking',
    '--disable-client-side-phishing-detection',
    // fix pdf problem
    '--disable-features=AudioServiceOutOfProcess',
    '--hide-scrollbars',
    '--no-zygote',
    '--window-size=1920,1200',
    '--disable-gpu',
    '--disable-translate',
    '--disable-client-side-phishing-detection',
    '--safebrowsing-disable-auto-update',
    '--disable-component-update',
    platform === 'linux' ? '--userdata=/dev/shm' : ''
  ],
  ignoreDefaultArgs: ['--enable-automation']
}

export const redisOptions = {
  // host: '10.6.0.79',
  host                      : env.REDIS_HOST || '81.68.130.118',
  port                      : getNumber(env.REDIS_PORT, 443),
  auth_pass                 : env.REDIS_PASS || undefined,
  retry_unfulfilled_commands: true,
  return_buffers            : true,
  keyPrefix                 : 'OPS:Snail:',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  retry_strategy            : (options: RetryStrategyOptions): number | undefined | Error => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.log('The server refused the connection')
    }
    if (options.total_retry_time > 1000 * 60 * 60 * 24 * 7) {
      return new Error('Retry time exhausted')
    }
    if (options.attempt > 72000) {
      return undefined
    }
    return Math.min(options.attempt * 500, 30000)
  }
}

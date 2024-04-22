import { Pool, createPool } from 'generic-pool'
import { Browser } from 'puppeteer'
import { launchBrowser } from './utils'

export interface browserPoolOptions {
  maxPoolSize: number;
  minPoolSize: number;
  timeout: number;
}

const borrowedResources: Map<Browser, Date> = new Map()

export default class browserPool {
  public static factory = {
    create : (): Promise<Browser> => launchBrowser(),
    destroy: (browser: Browser): Promise<void> => browser.close()
  }

  private pool: Pool<Browser>
  private timeout?: number

  constructor(options: browserPoolOptions) {
    const maxPoolSize = options.maxPoolSize
    const minPoolSize = options.minPoolSize
    const max         = Math.max(maxPoolSize, 1)

    if (max > 10) {
      process.setMaxListeners(max)
    }
    const min = Math.max(minPoolSize, 1)

    setInterval(this.timeoutCheck.bind(this), options.timeout)
    this.timeout = options.timeout

    this.pool = createPool<Browser>(browserPool.factory, {
      max,
      min,
      acquireTimeoutMillis: this.timeout
    })
  }

  public async acquire(): Promise<Browser> {
    const browser = await this.pool.acquire()

    borrowedResources.set(browser, new Date())
    return browser
  }

  public async release(browser: Browser): Promise<void> {
    await this.pool.release(browser)
    borrowedResources.delete(browser)
    // console.log('browser is release')
  }

  public async destroy(browser: Browser): Promise<void> {
    await this.pool.destroy(browser)
    borrowedResources.delete(browser)
    // console.log('browser is destroy')
  }

  private async timeoutCheck(): Promise<void> {
    if (!this.timeout) {
      return
    }

    const now = Date.now()
    const timeout = this.timeout * 2

    for (const [browser, createdAt] of borrowedResources.entries()) {
      if (now - createdAt.valueOf() > timeout) {
        console.log('Possible browser leak detected')
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.pool.destroy(browser)
        } catch (_) { }
        borrowedResources.delete(browser)
      }
    }
  }
}

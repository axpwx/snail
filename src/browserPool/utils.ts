import { puppeteerLaunchParams } from '../config'
import puppeteer from 'puppeteer'
import debug from '../utils/debug'

const debugLog = debug('browser-pool:utils')

debugLog('got executablePath: %s', puppeteerLaunchParams.executablePath)

export async function launchBrowser(retries = 1): Promise<puppeteer.Browser> {
  try {
    console.log('launchBrowser')
    return await puppeteer.launch(puppeteerLaunchParams)
  } catch (err) {
    console.error(err)
    if (retries > 0) {
      debugLog(`Issue launching Chrome, retrying ${retries} times.`)
      return await launchBrowser(retries - 1)
    }

    debugLog('Issue launching Chrome, retries exhausted.')
    throw err
  }
}

import { maxPoolSize, minPoolSize, healthCheckEndpoint, connectionTimeout } from '../config'
import BrowserPool from '../browserPool'
import express, { Response } from 'express'
import { createServer, Server, IncomingMessage, ServerResponse, ClientRequest } from 'http'
import { createProxyServer } from 'http-proxy'
import { Socket } from 'net'

export default class snailProxy {
  private app = express()
  private browserPool = new BrowserPool({ maxPoolSize, minPoolSize, timeout: connectionTimeout / 2 })
  private httpProxy = createProxyServer()
  private poolServer: Server

  constructor() {
    if (healthCheckEndpoint) {
      this.app.get(healthCheckEndpoint, (_, res: Response) => {
        res.end('I am Snail and i am healthy.')
      })
    }

    this.poolServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      this.app(req, res)
    }).on('upgrade', (req: IncomingMessage, socket: Socket, head: any) => {
      console.log('proxy is upgrade')
      this.upgrade(req, socket, head).catch((err) => {
        if (socket.writable) {
          console.log(err)
          socket.end('HTTP/1.1 500 Internal Server Error')
        }
      })
    })

    this.httpProxy.on('proxyReqWs', (proxyReq: ClientRequest, req, socket, head: any) => {
      proxyReq.on('upgrade', (proxyRes: IncomingMessage) => {
        proxyRes.headers['X-Real-Backend-Port'] =
        (head && typeof head === 'object' && head.target && head.target.port) ? head.target.port : 0
      })
    })

    this.httpProxy.on('error', (err, req: IncomingMessage, res: ServerResponse) => {
      console.log('httpProxy is error')
      if (res.writeHead) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
      }

      res.end(`Issue communicating with Chrome: ${err.message}`)
    })

    this.httpProxy.on('close', (_, socket: Socket) => {
      console.log('client is close')
      if (socket.writable) {
        socket.end()
      }
    })
  }

  public listen(port: number, callback: (() => void)): void {
    this.poolServer.listen(port, callback)
  }

  public async upgrade(req: IncomingMessage, socket: Socket, head: Buffer): Promise<void> {
    let closed = false
    const earlyClose = () => { closed = true }

    socket.once('close', earlyClose)

    const browser = await this.browserPool.acquire().catch((err) => {
      socket.end('HTTP/1.1 503 Service Unavailable')
      throw err
    })

    if (closed || !socket.writable) {
      await this.browserPool.release(browser)
      return
    }
    socket.removeListener('close', earlyClose)

    const handler = new Promise((resolve, reject) => {
      socket.once('close', resolve)
      socket.once('error', reject)

      const { port, pathname } = new URL(browser.wsEndpoint())
      const target = `ws://127.0.0.1:${port}`

      req.url = pathname
      console.log('pathname:', target + pathname)

      this.httpProxy.ws(req, socket, head, { target })
    })

    const timeout = new Promise((_, reject) => {
      setTimeout(() => {
        if (socket.writable) {
          socket.end('HTTP/1.1 408 Request Timeout')
        }
        reject(new Error('Job has been timed out'))
      }, connectionTimeout)
    })

    return Promise.race([handler, timeout]).then(
      () => this.browserPool.release(browser),
      async (err) => {
        await this.browserPool.release(browser)
        throw err
      }
    )
  }
}

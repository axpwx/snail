/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/unbound-method */
import { isDebug, redisOptions } from '../config'
import assert from 'assert'
import { promisify } from 'util'
import redis from 'redis'

export default class redisService {
  public redisClient = redis.createClient(redisOptions)
  private expireAsync = promisify(this.redisClient.expire).bind(this.redisClient)
  private lpushAsync = promisify(this.redisClient.lpush).bind(this.redisClient)
  private rpushAsync = promisify(this.redisClient.rpush).bind(this.redisClient)
  private lindexAsync = promisify(this.redisClient.lindex).bind(this.redisClient)
  private brpopAsync = promisify(this.redisClient.brpop).bind(this.redisClient)
  private setexAsync = promisify(this.redisClient.setex).bind(this.redisClient)
  private delAsync = promisify(this.redisClient.del).bind(this.redisClient)
  private getAsync = promisify(this.redisClient.get).bind(this.redisClient)
  private hsetAsync = promisify(this.redisClient.hset).bind(this.redisClient)
  private hgetAsync = promisify(this.redisClient.hget).bind(this.redisClient)
  private hgetallAsync = promisify(this.redisClient.hgetall).bind(this.redisClient)
  private hdelAsync = promisify(this.redisClient.hdel).bind(this.redisClient)
  private hlenAsync = promisify(this.redisClient.hlen).bind(this.redisClient)
  private lsetAsync = promisify(this.redisClient.lset).bind(this.redisClient)
  private lremAsync = promisify(this.redisClient.lrem).bind(this.redisClient)

  constructor() {
    this.redisClient.on('error', (err) => {
      console.log('redis error:', err)
      assert(err instanceof Error)
    })

    this.redisClient.on('ready', () => {
      console.log('redis is ready')
      if (isDebug) {
        // console.log(this.redisClient)
      }
    })
  }

  public async push(key: string, data: string | Record<string, any>, isLeft?: boolean): Promise<number> {
    const command = isLeft ? this.lpushAsync : this.rpushAsync

    try {
      const res: number = command(key, data).then((msg: Buffer) => {
        return msg
      }).catch((err: any) => {
        if (isDebug) console.log(err)
        assert(err instanceof Error)
      })

      return res || 0
    } catch (e: any) { console.log('Redis push catch:', e.message) }

    return 0
  }

  /**
   * 封装的brpop
   *
   * @param key
   * @param timeout
   * @returns
   */
  public async brpop(key: string, timeout?: number): Promise<string | null> {
    timeout = timeout || 60 * 10
    try {
      const brpopItem: string | null = await this.brpopAsync(key, timeout).then((msg: Buffer) => {
        if (msg && msg[1] && Buffer.isBuffer(msg[1])) {
          return msg[1].toString()
        }
        return msg
      }).catch((err: any) => {
        console.log('brpop err: ', err)
        assert(err instanceof Error)
        return null
      })

      return brpopItem
    } catch (e: any) { console.log('Redis brpop catch:', e.message) }

    return null
  }

  public async del(key: string): Promise<number> {
    try {
      const res: number = await this.delAsync(key).then((msg: Buffer) => {
        return msg.toString()
      }).catch((err: any) => {
        console.log('Redis get del: ', err)
        assert(err instanceof Error)
        return 0
      })

      return res
    } catch (e: any) { console.log('Redis del catch:', e.message) }

    return 0
  }

  public async get(key: string): Promise<string | Buffer | null> {
    try {
      const res: string | Buffer | null = await this.getAsync(key).then((msg: Buffer) => {
        return msg
      }).catch((err: any) => {
        console.log('Redis get err: ', err)
        assert(err instanceof Error)
        return null
      })

      return res
    } catch (e: any) { console.log('Redis get catch:', e.message) }

    return null
  }

  public async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      const res: boolean = await this.hsetAsync(key, field, value).then((msg: Buffer) => {
        return typeof msg.toString() === 'number'
      }).catch((err: any) => {
        console.log('Redis hset err: ', err)
        assert(err instanceof Error)

        return false
      })

      return res
    } catch (e: any) {
      console.log('Redis hset catch:', e.message)
    }

    return false
  }

  public async hget(key: string, field: string): Promise<string | null> {
    try {
      const res: string | null = await this.hgetAsync(key, field).then((msg: Buffer) => {
        return msg.toString()
      }).catch((err: any) => {
        console.log('Redis hget err: ', err)
        assert(err instanceof Error)

        return null
      })

      return res
    } catch (e: any) {
      console.log('Redis hget catch:', e.message)
    }

    return null
  }

  public async hgetAll(key: string): Promise<string[] | null> {
    try {
      const res: string[] | null = await this.hgetallAsync(key).then((msg: Record<string, string | undefined>) => {
        return msg
      }).catch((err: any) => {
        console.log('Redis hgetAll err: ', err)
        assert(err instanceof Error)

        return null
      })

      return res
    } catch (e: any) {
      console.log('Redis hgetAll catch:', e.message)
    }

    return null
  }

  public async hdel(key: string, field: string | string[]): Promise<number> {
    try {
      const res: number = await this.hdelAsync(key, field).then((msg: Buffer) => {
        return msg.valueOf()
      }).catch((err: any) => {
        console.log('Redis hdel err: ', err)
        assert(err instanceof Error)

        return 0
      })

      return res
    } catch (e: any) {
      console.log('Redis hdel catch:', e.message)
    }

    return 0
  }

  public async hlen(key: string): Promise<number> {
    try {
      const res: number = await this.hlenAsync(key).then((msg: Buffer) => {
        return msg.valueOf()
      }).catch((err: any) => {
        console.log('Redis hlen err: ', err)
        assert(err instanceof Error)

        return 0
      })

      return res
    } catch (e: any) {
      console.log('Redis hlen catch:', e.message)
    }

    return 0
  }

  public async lindex(key: string, index: number): Promise<string | null> {
    try {
      const res: string | null = await this.lindexAsync(key, index).then((msg: Buffer) => {
        return msg ? msg.toString() : null
      }).catch((err: any) => {
        console.log('Redis lindex err: ', err)
        assert(err instanceof Error)

        return null
      })

      console.log('lindex res:', res)
      return res
    } catch (e: any) { console.log('Redis lindex catch:', e.message) }

    return null
  }

  public async lset(key: string, index: number, value: string): Promise<boolean> {
    try {
      const res: boolean = await this.lsetAsync(key, index, value).then((msg: Buffer) => {
        return msg.toString() === 'OK'
      })

      return res
    } catch (e: any) {
      console.log('Redis lset catch:', e.message)
    }
    return false
  }

  public async lrem(key: string, count: number, value: string): Promise<number> {
    try {
      const res: number = await this.lremAsync(key, count, value).then((msg: Buffer) => {
        return msg.valueOf()
      })

      return res
    } catch (e: any) {
      console.log('Redis lrem catch:', e.message)
    }

    return 0
  }

  /**
   * 带过期时间的SET
   *
   * @param key
   * @param value
   * @param ttl
   * @returns
   */
  public async setex(key: string, value: string | Buffer, ttl: number): Promise<boolean> {
    try {
      const res: boolean = await this.setexAsync(key, ttl, value).then((msg: Buffer) => {
        return (msg.toString('utf8') === 'OK')
      }).catch((err: any) => {
        assert(err instanceof Error)
        return false
      })

      return res
    } catch (e: any) { console.log('Redis catch:', e.message) }

    return false
  }

  /**
   * 设置Redis过期时间
   *
   * @param key
   * @param ttl
   * @returns
   */
  public async setTTL(key: string, ttl: number): Promise<boolean> {
    try {
      const res: boolean = await this.expireAsync(key, ttl).then((msg: number) => {
        return msg === 1
      }).catch((err: any) => {
        assert(err instanceof Error)
        return false
      })

      return res
    } catch (e: any) { console.log('Redis catch:', e.message) }

    return false
  }
}

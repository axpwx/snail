import { isDebug } from '../config'
import snappy from 'snappy'

export default class baseService {
  public msleep = async (ms: number): Promise<any> => new Promise((res) => setTimeout(res, ms))

  /**
   * 压缩
   *
   * @param value
   * @returns {Buffer}
   */
  public compress(value: string | Record<string, any> | null): Buffer {
    if (typeof value === 'object') {
      value = JSON.stringify(value)
    }

    return snappy.compressSync(value)
  }

  public async compressAsync(value: string | Record<string, any> | null): Promise<Buffer> {
    if (typeof value === 'object') {
      value = JSON.stringify(value)
    }
    const compressed = await snappy.compress(value).then((data) => {
      return data
    }).catch((err) => {
      if (isDebug) console.log(err)
      return Buffer.from('')
    })

    return compressed
  }

  /**
   * 解压
   *
   * @param compressed
   * @param sync
   * @returns
   */
  public async uncompress(compressed: Buffer): Promise<string | null> {
    try {
      return snappy.uncompressSync(compressed, { asBuffer: false })
    } catch (err) {
      if (isDebug) console.log(err)
      return null
    }
  }

  public async uncompressAsync(compressed: Buffer): Promise<string | null> {
    try {
      const uncompressed = await snappy.uncompress(compressed, { asBuffer: false }).then((data) => {
        return data
      }).catch((err) => {
        if (isDebug) console.log(err)
        return null
      })

      return uncompressed
    } catch (err) {
      if (isDebug) console.log(err)
      return null
    }
  }
}

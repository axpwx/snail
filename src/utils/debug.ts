import _debug from 'debug'

export default function debug(namespace: string): _debug.IDebugger {
  return _debug(`Snail:${namespace}`)
}

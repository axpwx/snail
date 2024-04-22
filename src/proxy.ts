import { proxyPort } from './config'
import SnailProxy from './snailProxy'

const proxy = new SnailProxy()

proxy.listen(proxyPort, () => {
  console.log('Snail Proxy is listening on', proxyPort)
})

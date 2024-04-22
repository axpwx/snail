# Snail
一只可爱的蜗牛，实现了分布式Puppeteer服务，主要功能包含服务端渲染（SSR）、截图、打印PDF、资源提取、性能测试、代码覆盖率、前端监控、lighthouse评分等。

![Snail架构图](https://github.com/axpwx/snail-private/raw/main/docs/architecture_diagram.png)

## 功能特性

* 通过引入browser池优化冷启动提高性能
* 优化的资源回收方式，避免内存泄露
* 使用Redis实现简易队列，接口支持异步请求，支持回调
* 分布式架构，支持超大规模服务
* 可充分利用弹性伸缩、批量计算等廉价资源，机器销毁状态不会导致执行中的任务丢失
* 提供一键安装脚本，支持Docker部署
* 提供REST API，简化外部调用 [API文档](https://github.com/axpwx/snail/blob/main/docs/apidoc.md)

## 如何使用

### 手动安装
需要自行安装字体、Chrome等，请参照[手动安装说明](#手动安装说明)
```shell
git clone --depth 1 https://github.com/axpwx/snail.git
npm install pm2 -g
npm install yarn -g
yarn install
yarn build
```

### Linux一键安装脚本
```shell
curl -sSL https://raw.githubusercontent.com/axpwx/snail-private/master/install.sh | sudo bash
```

### Doker部署:
```shell
git clone --depth 1 https://github.com/axpwx/snail.git
docker build -t snail .
docker run -p 13131:13131 snail
```

### 启动服务
```shell
#启动Proxy服务
yarn start:proxy

#启动Task服务
yarn start:task

#启动httpTask服务
yarn start:httpTask

#启动taskMonitor服务
yarn start:taskMonitor

#启动API服务
yarn start:api

#Test:
yarn test
```

### pm2方式启动
```shell
pm2 start process.json
```

## 分布式部署说明
分布式部署时请调整启动进程，各进程说明如下：
| 进程名称     | 用途                           | 说明                  |
|-------------|-------------------------------|----------------------|
| api         | 提供HTTP访问                   | 一般高可用即可          |
| proxy       | 提供Puppeteer Browser资源池服务 | 视并发情况部署          |
| task        | 任务处理服务                    | 视并发情况部署          |
| httpTask    | 回调处理服务                    | 视并发情况部署          |
| taskMonitor | 进程监控服务                    | 随proxy和task一起部署   |

分布式部署请将browserWSEndpoint设置成负载均衡器IP；
如果是7层负载均衡，健康检查路径请设置成healthCheckEndpoint指定的路径；

## API文档
[Snail API文档](https://github.com/axpwx/snail/blob/main/docs/apidoc.md)

## 手动安装说明
```shell
#glibc版本要求最低2.18

#安装字体和Chrome依赖
yum install -y pango.x86_64 libXcomposite.x86_64 \
  libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 \
  libXi.x86_64 libXtst.x86_64 cups-libs.x86_64 \
  libXScrnSaver.x86_64 libXrandr.x86_64 GConf2.x86_64 \
  alsa-lib.x86_64 atk.x86_64 gtk3.x86_64 vulkan \
  xdg-utils mkfontscale ipa-gothic-fonts \
  xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi \
  xorg-x11-utils xorg-x11-fonts-cyrillic \
  xorg-x11-fonts-Type1 xorg-x11-fonts-misc \
  liberation-fonts

mkdir -p /usr/share/fonts/chinese
cd /usr/share/fonts/chinese
mkfontscale
fc-list :lang=zh

#如要变更版本，请注意Chrome和Puppeteer之间的对应关系, https://github.com/puppeteer/puppeteer/blob/main/versions.js
wget https://dl.google.com/linux/chrome/rpm/stable/x86_64/google-chrome-stable-93.0.4577.82-1.x86_64.rpm
rpm -ivh google-chrome-stable-93.0.4577.82-1.x86_64.rpm

npm install yarn -g
npm install pm2 -g

cd ./snail
#不下载Puppeteer自带的chromium浏览器
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
yarn install
yarn build
```
## License
Snail is licensed under the terms of the MIT License. See the [LICENSE](/LICENSE) file for details.

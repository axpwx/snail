FROM centos:7.9.2009

# 所有机器
RUN cd /tmp && yum update -y && yum install -y wget curl nss ca-certificates openssl

# snappy依赖glibc-2.18
#RUN wget -nv https://ftp.gnu.org/gnu/glibc/glibc-2.18.tar.gz \
#  && tar -zxf glibc-2.18.tar.gz && cd glibc-2.18 \
#  && mkdir build && cd build && ../configure --prefix=/usr -q \
#  && make -j8 -s && make install && cd /tmp

RUN wget -nv https://nodejs.org/dist/v14.17.6/node-v14.17.6-linux-x64.tar.xz \
  && tar -C /usr --strip-components=1 -xf node-v14.17.6-linux-x64.tar.xz

# RUN wget -nv https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_x86_64 \
#  -O /usr/local/bin/dumb-init && chmod +x /usr/local/bin/dumb-init
# 如果github无法访问可使用这个备用
RUN wget -nv https://github.com.cnpmjs.org/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_x86_64 \
  -O /usr/local/bin/dumb-init && chmod +x /usr/local/bin/dumb-init

ENTRYPOINT ["dumb-init", "--"]

# Task机器必须安装
RUN yum install -y pango libXcomposite libXcursor libXdamage libXext libXi libXtst \
  cups-libs libXScrnSaver libXrandr GConf2 alsa-lib atk gtk3 vulkan xdg-utils kde-l10n-Chinese \
  fontconfig mkfontscale ttmkfdir google-noto-emoji-fonts ipa-gothic-fonts xorg-x11-fonts-* liberation-fonts \
  && yum -y groupinstall Fonts \
  && mkdir -p /usr/share/fonts/chinese && cd /usr/share/fonts/chinese && mkfontscale && fc-list :lang=zh

RUN wget -nv https://dl.google.com/linux/chrome/rpm/stable/x86_64/google-chrome-stable-93.0.4577.82-1.x86_64.rpm \
  && rpm -ih google-chrome-stable-93.0.4577.82-1.x86_64.rpm

ENV CONNECTION_TIMEOUT=30000 \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome" \
  HEADLESS=true \
  SNAIL_PROXY_PORT=13131 \
  HEALTH_CHECK_ENDPOINT=/status \
  REDIS_HOST="" \
  REDIS_PORT="" \
  REDIS_PASS=""

RUN npm config set registry https://registry.npmmirror.com \
  && npm install yarn -g \
  && npm install pm2 -g \
  && npm install lighthouse -g

WORKDIR /app

COPY . ./
RUN yarn install \
  && yarn build \
  && npm prune --production \
  && yum clean all && rm -rf /tmp/* /var/tmp/*

RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
  && mkdir -p /home/pptruser/Downloads \
  && chown -R pptruser:pptruser /home/pptruser \
  && chown -R pptruser:pptruser /app

USER pptruser
EXPOSE 13131 19001

CMD ["pm2-runtime", "start", "process.json"]

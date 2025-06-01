#!/bin/bash

install_path='/app'
tmp_path='/tmp/snail_install/'
chrome_version='93.0.4577.82-1'

get_os() {
  if [[ $(uname) == 'Darwin' ]]; then
    echo "macos"
  elif [[ $(uname) == 'Linux' ]]; then
    if type yum >/dev/null 2>&1; then
      echo "linux_rhel"
    elif type apt-get >/dev/null 2>&1; then
      echo "linux_ubuntu"
    else
      echo ""
    fi
  fi
}

get_glibc_version() { echo `getconf GNU_LIBC_VERSION | grep glibc | sed -e 's/^glibc //' | sed -e '2,$d' -e 's/-.*$//'`; }
version_compare() { echo "$@" | awk -F. '{ printf("%d%03d%03d%03d\n", $1,$2,$3,$4); }'; }

install_dependencies() {
  gcc_version=$(command gcc -dumpversion)
  if [[ $(version_compare $gcc_version) -lt $(version_compare "4.8.0") ]]; then
    echo ""
    echo "--------------------------------------------------"
    echo "!!! Please upgrade gcc version to 4.8 or later !!!"
    echo "--------------------------------------------------"
    echo ""
    exit 1
  fi
  glibc_version=$(get_glibc_version)
  if [[ $(version_compare $glibc_version) -lt $(version_compare "2.18") ]]; then
    echo "Install glibc-2.18..."
    cd ${tmp_path}
    wget -nv -t5 https://ftp.gnu.org/gnu/glibc/glibc-2.18.tar.gz \
      && tar -zxf glibc-2.18.tar.gz && cd glibc-2.18 \
      && mkdir build && cd build && ../configure --prefix=/usr -q \
      && make -j8 -s && make install
  fi

  node_version=$(command node --version | sed 's/[-/a-zA-Z]//g' |sed 's/.\{2\}$//')
  if [[ $(version_compare $node_version) -lt $(version_compare "12.0.0") ]]; then
    echo "Install nodejs..."
    cd ${tmp_path}
    wget -nv -t5 https://nodejs.org/dist/v14.17.6/node-v14.17.6-linux-x64.tar.xz \
      && tar -C /usr --strip-components=1 -xf node-v14.17.6-linux-x64.tar.xz
  fi

  if ! type yarn > /dev/null 2>&1 || ! type pm2 > /dev/null 2>&1; then
    echo "Install yarn && pm2..."
    npm config set registry https://registry.npmmirror.com \
      && npm install yarn -g \
      && npm install pm2 -g
  fi
}

rhel_install() {
  echo "Install dependencies..."
  rm -rf ${tmp_path} ; mkdir -p ${tmp_path} ; cd ${tmp_path} ; mkdir - p ${install_path}

  yum update -y
  yum install -y --skip-broken gcc gcc-c++ make autoconf git wget curl nss ca-certificates openssl \
    pango libXcomposite libXcursor libXdamage libXext libXi libXtst cups-libs libXScrnSaver \
    libXrandr GConf2 alsa-lib atk gtk3 vulkan xdg-utils kde-l10n-Chinese fontconfig mkfontscale \
    ttmkfdir google-noto-emoji-fonts ipa-gothic-fonts xorg-x11-fonts-* liberation-fonts libgbm-devel
  yum -y --skip-broken groupinstall Fonts --setopt=group_package_types=mandatory,default,optional
  mkdir -p /usr/share/fonts/chinese && cd /usr/share/fonts/chinese && mkfontscale && fc-list :lang=zh && cd ${tmp_path}
  
  install_dependencies;

  if ! type google-chrome >/dev/null 2>&1; then
    echo "Download Chrome..."
    cd ${tmp_path}
    wget -nv -t5 https://dl.google.com/linux/chrome/rpm/stable/x86_64/google-chrome-stable-${chrome_version}.x86_64.rpm \
      && rpm -ih google-chrome-stable-${chrome_version}.x86_64.rpm
  fi
}

ubuntu_install() {
  echo "Install dependencies..."
  rm -rf ${tmp_path} ; mkdir -p ${tmp_path} ; cd ${tmp_path} ; mkdir - p ${install_path}

  apt-get update && apt-get upgrade
  echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections
  apt-get install -y software-properties-common
  apt-add-repository -y ppa:malteworld/ppa
  apt-get install -y gawk autoconf make gcc gcc-c++ git && apt-get update
  apt-get install -y msttcorefonts fonts-noto-color-emoji fonts-noto-cjk fonts-liberation fonts-thai-tlwg \
    fontconfig libappindicator3-1 pdftk unzip locales gconf-service libasound2 libatk1.0-0 libc6 libcairo2 \
    libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
    ttf-wqy-zenhei xfonts-intl-chinese wqy* libappindicator1 libnss3 libnss3-dev lsb-release xdg-utils wget curl

  install_dependencies;

  if ! type google-chrome >/dev/null 2>&1; then
    echo "Download Chrome..."
    cd ${tmp_path}
    wget -nv -t5 https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${chrome_version}_amd64.deb \
      && dpkg -i google-chrome-stable_${chrome_version}_amd64.deb
  fi

  apt --fix-broken install -y
}

other_install() {
  echo "Please install it by yourself."
}

git_clone() {
  echo "git clone..."

  cd ${install_path}
  rm -rf ${install_path}/snail
  git clone --depth 1 https://github.com/axpwx/snail.git
  cd ${install_path}/snail
  rm -rf src/BrowserPool/
}

start_service() {
  echo "start service..."

  cd ${install_path}/snail
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true yarn install
  yarn build
  PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome" yarn start:proxy
  yarn start:task
  yarn start:httpTask
  yarn start:taskMonitor
  yarn start:api
}

os_release=$(get_os)

if [[ ${os_release} == 'linux_rhel' ]]; then
  rhel_install;
  git_clone;
  start_service;
elif [[ ${os_release} == 'linux_ubuntu' ]]; then
  ubuntu_install;
  git_clone;
  start_service;
else
  other_install;
fi

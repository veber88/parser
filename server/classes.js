const {URL} = require('url');
const phantom = require('phantom');

class checkCurrentHost {
  constructor(currentHostURL) {
    this.url = new URL(currentHostURL);
  }

  getHost() {
    return this.url.host;
  }

  getProtocol() {
    return this.url.protocol;
  }

  isCurrentHost(link) {
    let checkingUrl;
    try {
      checkingUrl = new URL(link);
    } catch (e) {
      checkingUrl = new URL(this.url.protocol + '//' + this.url.host + link);
    } finally {
      return this.url.host == checkingUrl.host;
    }
  }

  isValidHref(href) {
    try {
      return Boolean((new URL(href)).pathname);
    } catch (e) {
      try {
        return Boolean((new URL(this.url.protocol + '//' + this.url.host + href)).pathname) && checkPath(href);
      } catch (e) {
        return false;
      }
    }

    function checkPath(path) {
      let regex = /^\/[/a-zA-Z0-9-]+$/igm;
      return path.test(regex);
    }
  }
}


class pathNode {
  constructor(link, protocol, host, depth) {
    this.depth = depth;
    this.parsed = false;

    try {
      this.url = new URL(link);
    } catch (e) {
      this.url = new URL(protocol + '//' + host + link);
    }
  }

  isExist(linkToCheck) {
    let checkingHref;
    try {
      checkingHref = new URL(linkToCheck);
    } catch (e) {
      checkingHref = new URL(this.url.protocol + '//' + this.url.host + linkToCheck);
    } finally {
      return checkingHref.pathname == this.url.pathname;
    }
    console.log('hello from isExist')
  }

  getHref() {
    return this.url.href;
  }

  getDepth() {
    return this.depth;
  }

  setParsed() {
    this.parsed = true;
  }

  isParsed() {
    return this.parsed;
  }
}


class Page {
  constructor(url) {
    this.url = url;
  }

  async getContent() {
    let page, content, phantomjsInstance;
    try {
      phantomjsInstance = await phantom.create();
      page = await phantomjsInstance.createPage();

      return await Promise.race([(async () => {
        await page.open(this.url);
        let data = await page.property('content');
        await phantomjsInstance.exit();
        return data;
      })(), new Promise((resolve) => {
        setTimeout(() => {
          phantomjsInstance.exit().then(() => {
            resolve('');
          });
        }, 20000);
      })]);
      // await page.open(this.url);
      // let content = await page.property('content');
      // return content;
    } catch (e) {
      await phantomjsInstance.exit();
      return '';
    }
  }
}

module.exports = {pathNode: pathNode, checkCurrentHost: checkCurrentHost, Page: Page};
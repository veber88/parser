const {URL} = require('url');
const puppeteer = require('puppeteer');

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

  static async chromeHeadlessLaunch() {
    Page.chromeInstance = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  }

  async getContent() {
    let page, content, chromeHeadless;
    try {
      await Page.chromeInstance;
      page = await Page.chromeInstance.newPage();
      await page.goto(this.url, {waitUntil: 'load'});
      let data = await page.content();
      await page.close();
      return data;
    } catch (e) {
      return '';
    }
  }
}

Page.chromeHeadlessLaunch();

module.exports = {pathNode: pathNode, checkCurrentHost: checkCurrentHost, Page: Page};
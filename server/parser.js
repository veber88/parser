const cheerio = require('cheerio');
const fs = require('fs');
const {pathNode, checkCurrentHost, Page} = require('./classes.js');

// const DOMAIN_MAX_DEPTH = 1;

Array.prototype.contains = function(v) {
  for(var i = 0; i < this.length; i++) {
    if(this[i] === v) return true;
  }
  return false;
};

Array.prototype.getUnique = function() {
  var arr = [];
  for(var i = 0; i < this.length; i++) {
    if(!arr.contains(this[i])) {
      arr.push(this[i]);
    }
  }
  return arr;
};

async function parser(hosts, contextStrings, depth) {

  var parsingResult = {
    emails: [],
    phones: []
  };

  for (let host of hosts) {
      let domainData = await parseDomain(host);
      parsingResult.emails.push(...domainData.emails);
      parsingResult.phones.push(...domainData.phones);
  }

  return {emails: parsingResult.emails.getUnique(), phones: parsingResult.phones.getUnique()};


  async function parseDomain(host) {
    var parsingResult = {
      emails: [],
      phones: []
    };

    var currentHostChecker = new checkCurrentHost(host);

    let links = [];
    let rootPathNode = new pathNode(host, currentHostChecker.getProtocol(), currentHostChecker.getHost(), 0);
    links.push(rootPathNode);
    await addChildLinks(rootPathNode, links, currentHostChecker);

    for (let link of links) {
      let data = await getDataFromLink(link, links, currentHostChecker);
      parsingResult.emails.push(...data.emails);
      parsingResult.phones.push(...data.phones);
    }
    return parsingResult;
  }

  async function addChildLinks(parentLink, existingPathNodes, hostChecker) {

    if (parentLink.getDepth() < depth) {
      let page = new Page(parentLink.getHref());
      const $ = cheerio.load(await page.getContent());

      let childLinks = [];
      $('a').each((index, href) => {
        childLinks.push($(href).attr('href'));
      });
      parentLink.setParsed();

      for (hrefLink in childLinks) {
        let href = childLinks[hrefLink];
        if (href && hostChecker.isValidHref(href) && hostChecker.isCurrentHost(href) && !existingPathNodes.some((link) => link.isExist(href))) {
          let newPathNode = new pathNode(href, hostChecker.getProtocol(), hostChecker.getHost(), parentLink.getDepth() + 1);
          existingPathNodes.push(newPathNode);
          if (newPathNode.getDepth() < depth) {
            await addChildLinks(newPathNode, existingPathNodes, hostChecker);
          }
        }
      }
    }
  }


  async function getDataFromLink(link, parsedLinks, hostChecker) {

    let result = {
      emails: [],
      phones: []
    };

    let page = new Page(link.getHref());
    content = await page.getContent();
    if (!link.isParsed()) {
      const $ = cheerio.load(content);
      $('a').each((index, currLink) => {
        let href = $(currLink).attr('href');
        if (href && hostChecker.isValidHref(href) && hostChecker.isCurrentHost(href) && !parsedLinks.some((link) => link.isExist(href)) && (checkLinkHrefAttr(href, contextStrings) || checkLinkText($(currLink).text(), contextStrings))) {
          parsedLinks.push(new pathNode(href, hostChecker.getProtocol(), hostChecker.getHost(), link.getDepth() + 1));
        }
      });
      link.setParsed();
    }

    if (checkContent(content)) {
      result.emails = getParsedEmailData(content);
      result.phones = getParsedPhoneData(content);
    }


    // const $ = cheerio.load(await phantomjsPageObject.property('content'));
    // $('*').each((index, node) => {
    // });

    return result;
  }
}

function checkLinkText(linkText, phrases) {
  linkText = linkText.toLowerCase();
  return phrases.some((currentPhrase) => {
    return linkText.indexOf(currentPhrase) != -1;
  });
}

function checkLinkHrefAttr(hrefAttrValue, phrases) {
  var joinSymbols = [' ', '_', '', '-', '.', ':'];
  hrefAttrValue = hrefAttrValue.toLowerCase();
  return phrases.some((currentPhrase) => {
    return joinSymbols.some((symbol) => {
      return hrefAttrValue.indexOf(currentPhrase.split(' ').join(symbol)) != -1;
    });
  });
}



function checkContent(content) {
  let emailRegex = /\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}/ig,
    phoneRegex = /\(?[0-9]{3}\)?[\.\-\s]?[0-9]{3}[\.-][0-9]{4}/ig;
    return emailRegex.test(content.toString()) || phoneRegex.test(content.toString());

}

function getParsedEmailData(content) {
  let emailRegex = /\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}/ig;
  return content.toString().match(emailRegex) || [];
}

function getParsedPhoneData(content) {
  let phoneRegex = /\(?[0-9]{3}\)?[\.\-\s]?[0-9]{3}[\.-][0-9]{4}/ig;

  return content.toString().match(phoneRegex) || [];
}

module.exports = parser;
const fs = require('fs')

const addonPageTemplate = fs.readFileSync('./template/addon/index.html').toString()
const homePageTemplate = fs.readFileSync('./template/home/index.html').toString()
const homePageAddonTemplate = fs.readFileSync('./template/home/list-addon.html').toString()

const processHtml = (templateName, map) => {
  let template
  if (templateName === 'addonPage')
    template = addonPageTemplate
  else if (templateName === 'homePage')
    template = homePageTemplate
  else if (templateName === 'homePageAddon')
    template = homePageAddonTemplate

  var re = new RegExp(Object.keys(map).join('|'),'gi')
  return template.replace(re, matched => map[matched])
}

module.exports = processHtml

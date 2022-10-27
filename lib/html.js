const fs = require('fs')
const path = require('path')

const templateFolder = path.join(__dirname, '..', 'template')

const addonPageTemplate = fs.readFileSync(path.join(templateFolder, 'addon', 'index.html')).toString()
const homePageTemplate = fs.readFileSync(path.join(templateFolder, 'home', 'index.html')).toString()
const homePageAddonTemplate = fs.readFileSync(path.join(templateFolder, 'home', 'list-addon.html')).toString()

const processHtml = (templateName, map) => {
  let template
  if (templateName === 'addonPage')
    template = addonPageTemplate
  else if (templateName === 'homePage')
    template = homePageTemplate
  else if (templateName === 'homePageAddon')
    template = homePageAddonTemplate

  const re = new RegExp(Object.keys(map).join('|'),'gi')
  return template.replace(re, matched => map[matched])
}

module.exports = processHtml

const { graphql } = require('@octokit/graphql')
const sendDiscordMessage = require('./discord')
const fs = require('fs');
const needle = require('needle')
const asyncQueue = require('async.queue')
const slug = require('slug')
const config = require('./config.json')

const TOKEN = process.env.TOKEN

const request = graphql.defaults({
  headers: {
    authorization: `token ${TOKEN}`,
  },
})

const getPosts = (after) =>
  request(
    `{
    repository(name: "${config.repository}", owner: "${config.author}") {
      issues(states: [OPEN], first: 100${after ? ', after: "' + after + '"' : ''}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          number
          createdAt
          url
          body
          labels(first: 5) {
            nodes {
              color
              name
              id
            }
          }
          comments {
            totalCount
          }
          reactionGroups {
            content
            users {
              totalCount
            }
          }
        }
      }
    }
  }
`
  ).then((data) => data.repository.issues)

const getAllPosts = () => {
  return new Promise((resolve, reject) => {
    const allItems = []
    const loopPages = after => {
      getPosts(after).then(data => {
        data = data || {}
        data.nodes = data.nodes || []
        data.nodes.forEach(node => allItems.push(node))
        if ((data.pageInfo || {}).hasNextPage && data.pageInfo.endCursor)
          loopPages(data.pageInfo.endCursor)
        else
          resolve(allItems)
      })
    }
    loopPages()
  })
}

const syncLabels = (postId, proposedLabels, allLabels) => {
  const labels = proposedLabels.map(el => allLabels.find(elm => elm.name === el)).filter(el => !!el).map(el => el.id)
  if (!labels.length) return Promise.reject(Error('error: could not find any label id in order to update issue labels'));
  return request(
    `mutation {
  updateIssue(input: {id : "${postId}" , labelIds: ${JSON.stringify(labels)} }){
    issue {
          id
          title
        }
  }
}
`
  )
}

const closeIssueQueue = asyncQueue((task, cb) => {
  closeIssue(task.postId).then(() => { cb() }).catch(() => { cb() })
})

const closeIssue = (postId) => {
  // also adds label "very low score"
  return request(
    `mutation {
  updateIssue(input: {id : "${postId}" , state: CLOSED, labelIds: ["LA_kwDOFVUyTM8AAAABGbO_Bw"] }){
    issue {
          id
          title
        }
  }
}
`)
}

const syncLabelsQueue = asyncQueue((task, cb) => {
  syncLabels(task.postId, task.proposedLabels, task.allLabels).then(() => { cb() }).catch(() => { cb() })
})

let oldAddonList = []
let preferCached = false
let lastKnownUpdateTime = Date.now()

needle.get(`https://${config['netlify-domain']}/lastUpdate.json`, config.needle, (err, resp, body) => {
  // if an update was done less than 12h ago, then prefer updating from cache
  if ((body || {}).time) {
    console.log('got last known website update time')
    if (body.time > Date.now() - 12 * 60 * 60 * 1000) {
      lastKnownUpdateTime = body.time
      console.log('cache will be preferred over refreshing manifest data')
      preferCached = true
    }
  } else {
    console.log('warning: could not get last update time')
  }

  needle.get(`https://${config['netlify-domain']}/catalog.json`, config.needle, (err, resp, body) => {
    if ((body || [])[0].transportUrl && body[0].transportName && body[0].manifest) {
      console.log('loaded old addon catalog')
      oldAddonList = body
    } else {
      console.log('warning: could not load old addon catalog')
    }
    getAllPosts().then(data => {
      const addons = []
      const addons_collection = []
      const all_labels = [{ color: 'A08C80', name: 'show all' }]
      data.forEach(addon => {
        const meta = {
          name: addon.title,
          url: '',
          description: '',
          ups: 0,
          downs: 0,
          commentCount: 0,
          issueUrl: addon.url,
          proposedLabels: [],
          language: 'Multilingual',
        }
        const chunks = (addon.body || '').split(/\r?\n/)
        let readingFor = false
        chunks.forEach(chunk => {
          if (chunk === '### Addon Manifest URL')
            readingFor = 'url'
          else if (chunk === '### Addon Description')
            readingFor = 'description'
          else if (chunk === '### Language of Content')
            readingFor = 'language'
          else if (chunk === '### Choose Labels')
            readingFor = 'labels'
          else if (readingFor && chunk) {
            if (readingFor === 'url' && meta.url.endsWith('/manifest.json')) return;
            if (readingFor === 'labels' && chunk.toLowerCase().startsWith('- [x] ')) {
              meta.proposedLabels.push(chunk.replace('- [X] ','').replace('- [x] ', '').trim())
              return
            }
            if (readingFor === 'language') {
              lang = chunk.split('; ')[0].split(' (')[0].trim()
              if (lang !== '_No response_')
                meta[readingFor] = lang
              return
            }
            meta[readingFor] += chunk
            meta[readingFor] = meta[readingFor].trim()
          }
        })
        if (!meta.url.startsWith('https://') || !meta.url.endsWith('/manifest.json'))
          meta.url = ''
        if (meta.description === '_No response_')
          meta.description = ''
        if (meta.name && meta.url) {
          const reactionGroups = addon.reactionGroups || []
          meta.labels = (addon.labels || {}).nodes || []
          meta.labels.forEach(label => {
            if (label.name && !all_labels.some(el => label.name === el.name))
              all_labels.push(label)
          })
          let score = 0
          reactionGroups.forEach(group => {
            if ((group.users || {}).totalCount) {
              if (group.content === 'THUMBS_UP') {
                meta.ups = group.users.totalCount
                score += group.users.totalCount
              } else if (group.content === 'THUMBS_DOWN') {
                meta.downs = group.users.totalCount
                score -= group.users.totalCount
              }
            }
          })
          meta.issueNumber = addon.number
          meta.commentCount = (addon.comments || {}).totalCount || 0
          meta.postId = addon.id
          if (score > -10) {
            meta.score = score
            addons.push(meta)
          } else {
            closeIssueQueue.push({ postId: meta.postId })
          }
        }
      })

      // ensure that labels are the same as proposed by user submitting
      addons.forEach(addon => {
        if (addon.postId && addon.proposedLabels.length) {

          // we only sync labels on new issues, that only have the default "misc" label set
          if (addon.labels.length === 1 && addon.labels[0].name === 'misc') {}
          else return

          const diff = addon.proposedLabels.filter(x => !addon.labels.map(label => label.name).includes(x))

          if (diff.length) {
            // proposed labels are different than issue labels
            console.log('setting initial labels for: ' + addon.name)
            console.log(addon.proposedLabels)
            syncLabelsQueue.push({ postId: addon.postId, proposedLabels: addon.proposedLabels, allLabels: all_labels })
          }

        }
      })

      const listAddonHtml = fs.readFileSync('./template/home/list-addon.html').toString()
      const addonPageHeader = fs.readFileSync('./template/addon/header.html').toString()
      const addonPageFooter = fs.readFileSync('./template/addon/footer.html').toString()
      const addonPageContent = fs.readFileSync('./template/addon/content.html').toString()

      const dir = './out';

      if (!fs.existsSync(dir))
          fs.mkdirSync(dir)

      const listHtml = []

      const addDataForAddon = (listAddonHtml, body, task, labelsAreLinks) => {
        let addonHtml = listAddonHtml
        if (!body && !task) {
          // only the home page can be in this scenario (header / footer)
          addonHtml = addonHtml.split('{home-keywords}').join(config['meta-keywords'])
          addonHtml = addonHtml.split('{home-page-title}').join(config['page-title'])
          addonHtml = addonHtml.split('{home-meta-title}').join(config['meta-title'])
          addonHtml = addonHtml.split('{home-netlify-domain}').join(config['netlify-domain'])
          addonHtml = addonHtml.split('{home-favicon}').join(config['meta-favicon'])
          addonHtml = addonHtml.split('{home-description}').join(config['meta-description'])
          addonHtml = addonHtml.split('{repo-name}').join(config.author+'/'+config.repository)
          return addonHtml
        }
        // we replace netlify domain here again for the addon page header template
        addonHtml = addonHtml.split('{home-netlify-domain}').join(config['netlify-domain'])
        addonHtml = addonHtml.split('{addon-page-title-append}').join(config['meta-addon-title-append'])
        let labelsHtml = task.labels.map(el => el.name.split(' ').join('-')).join(' ')
        if (labelsHtml)
          labelsHtml = ' ' + labelsHtml
        addonHtml = addonHtml.replace('{labels}', labelsHtml)
        addonHtml = addonHtml.replace('{addon-id}', body.id)
        addonHtml = addonHtml.replace('{addon-version}', body.version)
        addonHtml = addonHtml.split('{addon-title}').join(body.name)
        if (body.description)
          addonHtml = addonHtml.split('{addon-description}').join(body.description)
        else
          addonHtml = addonHtml.split('{addon-description}').join('')
        const lowerCaseName = body.name.toLowerCase()
        addonHtml = addonHtml.replace('{addon-keywords}', [lowerCaseName, lowerCaseName + ' down', lowerCaseName + ' down or just me', lowerCaseName + ' site down', lowerCaseName + ' not working', lowerCaseName + ' not found', 'stremio addons', 'addons list'])
        addonHtml = addonHtml.split('{addon-logo}').join(body.logo || body.icon)
        addonHtml = addonHtml.replace('{addon-types}', task.labels.map(el => `<${labelsAreLinks ? 'a href="https://' + config['netlify-domain'] + '/' + (el.name === '<ion-icon class="back-arrow" name="arrow-back-outline"></ion-icon> all addons' ? '' : '?label=' + el.name.split(' ').join('-')) + '"' : 'span'} class="label label-addon-page" style="background-color: #${el.color}">${el.name}</${labelsAreLinks ? 'a' : 'span'}>`).join(''))
        addonHtml = addonHtml.replace('{addon-types-small}', task.labels.map(el => `<${labelsAreLinks ? 'a href="https://' + config['netlify-domain'] + '/' + (el.name === '<ion-icon class="back-arrow" name="arrow-back-outline"></ion-icon> all addons' ? '' : '?label=' + el.name.split(' ').join('-')) + '"' : 'span'} class="label label-small" style="background-color: #${el.color}">${el.name}</${labelsAreLinks ? 'a' : 'span'}>`).join(''))
        addonHtml = addonHtml.replace('{addon-score}', task.score)
        addonHtml = addonHtml.replace('{addon-ups}', task.ups)
        addonHtml = addonHtml.replace('{addon-downs}', task.downs)
        if (!task.ups && !task.downs)
          addonHtml = addonHtml.replace('{addons-score-faded}', ' addon-score-faded')
        else
          addonHtml = addonHtml.replace('{addons-score-faded}', '')
        if (!(body.behaviorHints || {}).configurationRequired)
          addonHtml = addonHtml.replace('{install-button}', '<a class="addon-button install-button" href="'+task.url.replace('https://','stremio://')+'">Install</a> <a class="addon-button copy-link-button" href="#" onClick="copyLink(event, \''+task.url+'\')">Copy Link</a>')
        else
          addonHtml = addonHtml.replace('{install-button}', '')
        if ((body.behaviorHints || {}).configurable)
          addonHtml = addonHtml.replace('{configure-button}', '<a class="addon-button configure-button" href="'+task.url.replace('/manifest.json','/configure')+'" target="_blank">Configure</a>')
        else
          addonHtml = addonHtml.replace('{configure-button}', '')
        if (task.commentCount)
          addonHtml = addonHtml.replace('{comments-button}', `<a href="${slug(body.name)}.html" class="addon-button last-addon-button"><ion-icon name="chatbubbles" class="gray-icon"></ion-icon> ${task.commentCount}</a>`)
        else
          addonHtml = addonHtml.replace('{comments-button}', '')
        addonHtml = addonHtml.split('{addon-page}').join(`${slug(body.name)}.html`)
        addonHtml = addonHtml.split('{issue-url}').join(task.issueUrl)
        addonHtml = addonHtml.split('{repo-name}').join(config.author+'/'+config.repository)
        if (task.language && task.language !== 'Multilingual')
          addonHtml = addonHtml.split('{addon-language}').join(`<div class="addon-language">${task.language} Content</div>`)
        else
          addonHtml = addonHtml.split('{addon-language}').join('')
        return addonHtml
      }

      const newAddons = []
      let firstOne = false

      const queue = asyncQueue((task, cb) => {
        const processManifest = addonManifest => {
          if (!addonManifest) {
            console.log('warning: could not find addon manifest for: ' + task.name)
            cb()
            return
          }
          addons_collection.push({
            transportUrl: task.url,
            transportName: 'http',
            manifest: addonManifest,
          })
          if (!firstOne || oldAddonList.length && !oldAddonList.find(el => ((el || {}).manifest || {}).id === addonManifest.id)) {
            firstOne = true
            task.manifest = addonManifest
            newAddons.push(task)
          }
          const addonHtml = addDataForAddon(listAddonHtml, addonManifest, task)
          task.labels = [{ color: 'A08C80', name: '<ion-icon class="back-arrow" name="arrow-back-outline"></ion-icon> all addons' }].concat(task.labels)
          let parsedAddonPage = addDataForAddon(addonPageContent, addonManifest, task, true)
          parsedAddonPage = parsedAddonPage.replace('{addon-list-item}', addonHtml)
          parsedAddonPage = parsedAddonPage.replace('{issue-number}', task.issueNumber)
          const parsedAddonHeader = addDataForAddon(addonPageHeader, addonManifest, task)
          let parsedAddonFooter = addDataForAddon(addonPageFooter, addonManifest, task)
          parsedAddonFooter = parsedAddonFooter.replace('{addon-url}', task.url)
          console.log('creating page for addon: ' + addonManifest.name)
          fs.writeFileSync(`${dir}/${slug(addonManifest.name)}.html`, parsedAddonHeader+parsedAddonPage+parsedAddonFooter)
          task.labels.shift() // remove "all addons" prefix from labels
          listHtml.push(addonHtml)
          cb()
        }
        const findCachedManifest = () => {
          let cachedManifest
          oldAddonList.some(oldAddon => {
            if (oldAddon.transportUrl === task.url) {
              if (!preferCached)
                console.log('warning: using cached manifest for: ' + task.name)
              cachedManifest = oldAddon.manifest
              return true
            }
          })
          return cachedManifest
        }
        if (preferCached) {
          const cachedManifest = findCachedManifest()
          if (cachedManifest) {
            processManifest(cachedManifest)
            return
          }
        }
        needle.get(task.url, config.needle, (err, resp, body) => {
          let addonManifest
          if ((body || {}).id && body.version) {
            addonManifest = body
          } else if (oldAddonList.length) {
            addonManifest = findCachedManifest()
          }
          processManifest(addonManifest)
        })
      }, 1)

      let header = fs.readFileSync('./template/home/header.html').toString()
      // move "misc" label to end of list
      const miscLabelIndex = all_labels.findIndex(label => label.name === 'misc')
      if (miscLabelIndex > -1)
        all_labels.push(all_labels.splice(miscLabelIndex, 1)[0])
      header = header.replace('{labels-list}', all_labels.map((el, ij) => `<span class="label${!ij ? ' selected' : ''}" style="background-color: #${el.color}">${el.name}</span>`).join(''))
      header = addDataForAddon(header)
      const footer = fs.readFileSync('./template/home/footer.html').toString()
      
      const parsedFooter = addDataForAddon(footer)

      queue.drain = () => {
        if (process.env.DISCORD_WEBHOOK && newAddons.length)
          sendDiscordMessage(newAddons)
        console.log('copying resources (styles, js, images)')
        fs.readdirSync('./resources').forEach(file => {
          const filePath = `./resources/${file}`
          if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
            console.log(`copied ${file} resource`)
            fs.copyFileSync(filePath, `${dir}/${file}`)
          }
        })
        fs.copyFileSync('./resources/styles.css', `${dir}/styles.css`)
        console.log('creating addons catalog json file')
        fs.writeFileSync(`${dir}/catalog.json`, JSON.stringify(addons_collection))
        console.log('creating home page')
        fs.writeFileSync(`${dir}/index.html`, header+listHtml.join('')+parsedFooter)
        if (!preferCached) {
          console.log('saving timestamp of last update to json')
          fs.writeFileSync(`${dir}/lastUpdate.json`, JSON.stringify({ time: Date.now() }))
        } else {
          console.log('persisting last known update time because cache was preferred')
          fs.writeFileSync(`${dir}/lastUpdate.json`, JSON.stringify({ time: lastKnownUpdateTime }))
        }
      }

      addons.sort((a,b) => { return a.score > b.score ? -1 : 1 })

      addons.forEach(addon => queue.push(addon))

    }).catch(e => console.error(e))
  })
})

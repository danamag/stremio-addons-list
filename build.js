const sendDiscordMessage = require('./discord')
const fs = require('fs');
const needle = require('needle')
const asyncQueue = require('async.queue')
const slug = require('slug')
const config = require('./config')
const graphql = require('./graphql')
const getCached = require('./cache')
const processHtml = require('./html')

getCached().then(cached => {
  if (cached.time && cached.time > Date.now() - config['prefer-cached-for']) {
    console.log('cache will be preferred over refreshing manifest data')
    cached.prefer = true
  }
  graphql.getAllPosts().then(data => {
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
        if (score > config['minimum-score']) {
          meta.score = score
          addons.push(meta)
        } else {
          graphql.closeIssueQueue.push({ postId: meta.postId })
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
          graphql.syncLabelsQueue.push({ postId: addon.postId, proposedLabels: addon.proposedLabels, allLabels: all_labels })
        }

      }
    })

    const dir = './out';

    if (!fs.existsSync(dir)) fs.mkdirSync(dir)

    const listHtml = []
    const newAddons = []

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
        if (cached.catalog.length && !cached.catalog.find(el => ((el || {}).manifest || {}).id === addonManifest.id)) {
          task.manifest = addonManifest
          newAddons.push(task)
        }
        
        let labelsHtml = task.labels.map(el => el.name.split(' ').join('-')).join(' ')
        if (labelsHtml) labelsHtml = ' ' + labelsHtml

        const lowerCaseName = addonManifest.name.toLowerCase()
        const keywordsForAddonPage = [lowerCaseName, lowerCaseName + ' down', lowerCaseName + ' down or just me', lowerCaseName + ' site down', lowerCaseName + ' not working', lowerCaseName + ' not found', 'stremio addons', 'addons list']

        const installButton = !(addonManifest.behaviorHints || {}).configurationRequire ? '<a class="addon-button install-button" href="'+task.url.replace('https://','stremio://')+'">Install</a> <a class="addon-button copy-link-button" href="#" onClick="copyLink(event, \''+task.url+'\')">Copy Link</a>' : ''
        const configButton = (addonManifest.behaviorHints || {}).configurable ? '<a class="addon-button configure-button" href="'+task.url.replace('/manifest.json','/configure')+'" target="_blank">Configure</a>' : ''
        const commentsButton = task.commentCount ? `<a href="${slug(addonManifest.name)}.html" class="addon-button last-addon-button"><ion-icon name="chatbubbles" class="gray-icon"></ion-icon> ${task.commentCount}</a>` : ''
        const language = task.language && task.language !== 'Multilingual' ? `<div class="addon-language">${task.language} Content</div>` : ''
        const addonsScoreFaded = !task.ups && !task.downs ? ' addon-score-faded' : ''

        const labelsForHomeHeader = task.labels.map(el => `<span class="label label-addon-page" style="background-color: #${el.color}">${el.name}</span>`).join('')
        const labelsForHomeAddon = task.labels.map(el => `<span class="label label-small" style="background-color: #${el.color}">${el.name}</span>`).join('')
        const labelsForAddonPage = task.labels.map(el => `<${'a href="https://' + config['netlify-domain'] + '/' + (el.name === '<ion-icon class="back-arrow" name="arrow-back-outline"></ion-icon> all addons' ? '' : '?label=' + el.name.split(' ').join('-')) + '"'} class="label label-addon-page" style="background-color: #${el.color}">${el.name}</a>`).join('')
        
        const map = {
          '{home-netlify-domain}': config['netlify-domain'],
          '{addon-page-title-append}': config['meta-addon-title-append'],
          '{labels}': labelsHtml,
          '{addon-id}': addonManifest.id,
          '{addon-version}': addonManifest.version,
          '{addon-title}': addonManifest.name,
          '{addon-description}': addonManifest.description || '',
          '{addon-keywords}': keywordsForAddonPage,
          '{addon-logo}': addonManifest.logo || addonManifest.icon,
          '{addon-types}': labelsForHomeHeader,
          '{addon-types-small}': labelsForHomeAddon,
          '{addon-types-links}': labelsForAddonPage,
          '{addon-score}': task.score,
          '{addon-ups}': task.ups,
          '{addon-downs}': task.downs,
          '{addons-score-faded}': addonsScoreFaded,
          '{install-button}': installButton,
          '{configure-button}': configButton,
          '{comments-button}': commentsButton,
          '{addon-page}': `${slug(addonManifest.name)}.html`,
          '{issue-url}': task.issueUrl,
          '{issue-number}': task.issueNumber,
          '{repo-name}': config.author+'/'+config.repository,
          '{addon-language}': language,
          '{addon-url}': task.url,
        }

        const addonHtml = processHtml('homePageAddon', map)

        task.labels = [{ color: 'A08C80', name: '<ion-icon class="back-arrow" name="arrow-back-outline"></ion-icon> all addons' }].concat(task.labels)
        labelsHtml = task.labels.map(el => el.name.split(' ').join('-')).join(' ')
        if (labelsHtml) labelsHtml = ' ' + labelsHtml
        map['{labels}'] = labelsHtml
        
        const parsedAddonPage = processHtml('addonPage', map)

        console.log('creating page for addon: ' + addonManifest.name)
        fs.writeFileSync(`${dir}/${slug(addonManifest.name)}.html`, parsedAddonPage)
        task.labels.shift() // remove "all addons" prefix from labels
        listHtml.push(addonHtml)
        cb()
      }
      const findCachedManifest = () => {
        let cachedManifest
        cached.catalog.some(oldAddon => {
          if (oldAddon.transportUrl === task.url) {
            if (!cached.prefer)
              console.log('warning: using cached manifest for: ' + task.name)
            cachedManifest = oldAddon.manifest
            return true
          }
        })
        return cachedManifest
      }
      if (cached.prefer) {
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
        } else if (cached.catalog.length) {
          addonManifest = findCachedManifest()
        }
        processManifest(addonManifest)
      })
    }, 1)

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
      // move "misc" label to end of list
      const miscLabelIndex = all_labels.findIndex(label => label.name === 'misc')
      if (miscLabelIndex > -1)
        all_labels.push(all_labels.splice(miscLabelIndex, 1)[0])
      const map = {
        '{home-keywords}': config['meta-keywords'],
        '{home-page-title}': config['page-title'],
        '{home-meta-title}': config['meta-title'],
        '{home-netlify-domain}': config['netlify-domain'],
        '{home-favicon}': config['meta-favicon'],
        '{home-description}': config['meta-description'],
        '{repo-name}': config.author+'/'+config.repository,
        '{labels-list}': all_labels.map((el, ij) => `<span class="label${!ij ? ' selected' : ''}" style="background-color: #${el.color}">${el.name}</span>`).join(''),
        '{addons-list}': listHtml.join(''),
      }
      const homePage = processHtml('homePage', map)
      fs.writeFileSync(`${dir}/index.html`, homePage)
      if (!cached.prefer) {
        console.log('saving timestamp of last update to json')
        fs.writeFileSync(`${dir}/lastUpdate.json`, JSON.stringify({ time: Date.now() }))
      } else {
        console.log('persisting last known update time because cache was preferred')
        fs.writeFileSync(`${dir}/lastUpdate.json`, JSON.stringify({ time: cached.time }))
      }
    }

    addons.sort((a,b) => { return a.score > b.score ? -1 : 1 })

    addons.forEach(addon => queue.push(addon))

  }).catch(e => console.error(e))
}).catch(e => console.error(e))

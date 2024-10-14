const _slug = require('slug')

_slug.charmap['+'] = 'plus'

const slug = (string, opts) => _slug(string, opts)

module.exports = slug

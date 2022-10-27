const { graphql } = require('@octokit/graphql')
const asyncQueue = require('async.queue')
const config = require('./config.json')

const request = graphql.defaults({
  headers: {
    authorization: `token ${process.env.TOKEN}`,
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

module.exports = {
  getPosts, getAllPosts, syncLabels, syncLabelsQueue, closeIssue, closeIssueQueue,
}

# The Great List of Stremio Addons

To see the great list of Stremio Addons go to [the website](https://stremio-addons.netlify.app/).

To submit a new addon to the list, use [this link](https://github.com/danamag/stremio-addons-list/issues/new?assignees=&labels=misc&template=submit-addon.yaml&title=Addon+Name).

To upvote / downvote an addon, find it in [the issues](https://github.com/danamag/stremio-addons-list/issues) and react with a thumbs up / down to the issue comment.

To comment on an addon, find it in [the issues](https://github.com/danamag/stremio-addons-list/issues) and comment on the issue, this will update the comments on the site too. (you can also comment with GitHub on the website directly)

To get notifications about new addons press the "Watch" button at the top right of this page. (you will receive email notifications for all new addon submissions)


## How Can I Help?

This project is completely automated, what addons get in the list and what addons are removed is decided by each and every one of you, the only requirement is a free GitHub profile.

So here's how you can help:
- add addons that are working (and not yet) in the list (by creating a new GitHub issue)
- give a thumbs up / down to the addons that are already in the list (through GitHub comment reactions)
- comment and discuss addons (through the GitHub commenting system)


## Project Features

- anyone can publish an addon
- publishers can choose labels
- publishers can choose content language (if applicable)
- everyone can vote on addons
- all addons are ordered by community votes
- addon labels
- filter by addon labels
- comments for addon pages
- rich text comments
- comments support reactions (emojis)
- "is it online?" real-time check for addons (on the addon page)
- notifications for new addon releases (through GitHub followship)
- search addons
- show comment count for each addon in the list


## How it works

When submitting an addon to the list, a github issue is created to represent this submission. If the original poster closes their issue, or someone with access to the project closes the issue, the addon will be removed from the list.

All addons in the list are ordered by the thumbs up / down votes of the github issues, if an addon has less than -10 votes it is removed from the list.

Labels for addons are a 1:1 copy of github labels used for issues, the colors chosen for these labels on github will also be used on the site.

Commenting on an issue will also add the comments to the dedicated addon page on the website.

The site is currently refreshed based on the following triggers:
- a new issue is created (a new addon was submitted)
- a new release was created
- a new commit was made
- a label was created, edited or removed
- a new comment was made to an issue (to update comment count)
- daily at 08:15 by GitHub Actions (to update votes if no other event did)


## Fork me

This project is available under the MIT license and uses exclusively free resources. (GitHub WebHooks and Netlify)

To create your own Stremio Addons list:
- fork this project
- enable issues for your fork: `Settings` > `Features` > `Issues`
- edit `/config.json` with your repo information
- connect Netlify to your GitHub fork (on `main` branch)
- in Netlify: `Sites` > `(choose site)` > `Site Settings` > `Build & deploy` > `Build settings`: Base directory = "Not set" ; Build command = "npm run build" ; Publish directory = "out/"
- create a GitHub API token: `Settings` > `Developer Settings` (bottom left) > `Personal access tokens` (left side) > `Tokens` (classic) > `Generate new token` (copy the token to clipboard)
- add GitHub API token to Netlify: `Sites` > `(choose site)` > `Site Settings` > `Build & deploy` > `Environment` > `Environment Variables` > (add key called "TOKEN" and paste GitHUB API token)
- create a Netlify Hook: `Sites` > `(choose site)` > `Site Settings` > `Build & deploy` > `Continuous deployment` > `Build hooks` > `Add build hook` > (copy the URL from the hook)
- create a GitHub WebHook: `Settings` > `WebHooks` (left side menu) > `Add WebHook` (top right button): Payload URL = URL copied from Netlify ; choose "Let me select individual events" ; ensure "Active" is enabled
- choose events that will trigger the website builds: Issues; Labels; Releases; Pushes (optional events: Issue comments)
- press "Add webhook"
- add GitHub Repository Secret for Netlify Hook: `Settings` > `Secrets` (left side menu) > `Actions` > `New repository secret`: Name = "NETLIFY_BUILD_WEBHOOK" ; Paste URL copied from Netlify as Secret (this is needed for the GitHub Action from `/.github/workflows/main.yml` which will do a daily build to update votes)
- on Github go to: `Issues` > `Labels` (top right button) > (add labels that you need, delete labels that you don't need) (if you want to use the default labels, check the `/.github/ISSUE_TEMPLATE/submit-addon.yaml` file to see the list)
- open `/.github/ISSUE_TEMPLATE/submit-addon.yaml` and edit the labels to match the ones you use for your addons list (if not using the default labels)

You're done!


### Extras

- you can also set the "DISCORD_WEBHOOK" environment variable in Netlify, this will make it notify on Discord every time a new addon is published (a new issue is created)
- by default this project only allows submitting issues with the "Publish Stremio Addon" issue template, if you want to allow blank issues too, then edit the `/.github/ISSUE_TEMPLATE/config.yml` file and set `blank_issues_enabled: true`

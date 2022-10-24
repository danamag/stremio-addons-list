# The Great List of Stremio Addons

To see the great list of Stremio Addons go to [the website](https://stremio-addons.netlify.app/).

To submit a new addon to the list, use [this link](https://github.com/danamag/stremio-addons-list/issues/new?assignees=&labels=misc&template=submit-addon.yaml&title=Addon+Name).

To upvote / downvote an addon, find it in [the issues](https://github.com/danamag/stremio-addons-list/issues) and react with a thumbs up / down to the issue comment.

To comment on an addon, find it in [the issues](https://github.com/danamag/stremio-addons-list/issues) and comment on the issue, this will update the comments on the site too. (you can also comment with GitHub on the website directly)

To get notifications about new addons press the "Watch" button at the top right of this page. (you will receive email notifications for all new github issues / addon submissions)


## How Can I Help?

This project is completely automated, what addons get in the list and what addons are removed is decided by each and every one of you, the only requirement is a free GitHub profile.

So here's how you can help:
- add addons that are working (and not yet) in the list (by creating a new GitHub issue)
- give a thumbs up / down to the addons that are already in the list (through GitHub comment reactions)
- comment and discuss addons (through the GitHub commenting system)
- propose new things and get involved! all github issues that are not created based on the "Publish Stremio Addon" issue template will not be added to the addon list, so you can still create issues normally for feature requests and bug reports!


## Project Features

- anyone can publish an addon
- everyone can vote on addons
- all addons are ordered by community votes
- addon labels
- filter by addon labels
- comments for addon pages
- rich text comments
- comments support reactions (emojis)
- "is it online?" real-time check for addons (on the addon page)
- notifications for new addon releases (through GitHub followship)


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


## Fork me

This project is available under the MIT license and uses exclusively free resources. (GitHub WebHooks and Netlify)

To create your own Stremio Addons list:
- fork this project
- enable issues for your fork: Settings -> Features -> Issues
- edit `/config.json` with your repo information
- connect Netlify to your GitHub fork (on `main` branch)
- in Netlify: Sites -> (choose site) -> Site Settings -> Build & deploy -> Build settings: Base directory = "Not set" ; Build command = "npm run build" ; Publish directory = "out/"
- create a GitHub API token: Settings -> Developer Settings (bottom left) -> Personal access tokens (left side) -> Tokens (classic) -> Generate new token (copy the token to clipboard)
- add GitHub API token to Netlify: Sites -> (choose site) -> Site Settings -> Build & deploy -> Environment -> Environment Variables -> (add key called "TOKEN" and paste GitHUB API token)
- create a Netlify Hook: Sites -> (choose site) -> Site Settings -> Build hooks -> Add build hook (and copy the URL from the hook)
- create a GitHub WebHook: Settings -> WebHooks (left side menu) -> Add WebHook (top right button): Payload URL = URL copied from Netlify ; choose "Let me select individual events" ; ensure "Active" is enabled
- choose events that will trigger the website builds: Issues; Labels; Releases; Pushes (other events that could be used: Issue comments)
- press "Add webhook"

You're done!

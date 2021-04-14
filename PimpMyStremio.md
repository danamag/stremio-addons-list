# What is PimpMyStremio?

[PimpMyStremio](https://github.com/sungshon/PimpMyStremio) is a local addon manager for Stremio, that gives access to many Stremio addons that cannot be found anywhere else.

What is it though? To better understand this, you first need to understand how Stremio works.

So what is Stremio? How does it work? How is it different from Kodi?

Kodi is an application that allows streaming from various sources based on local addons. It's important to note "local addons" from this, because Stremio is a similar application that streams from various sources based on remote addons, Stremio has no concept of local addons. What does this all mean? It means Kodi's addons extract these streaming sources using your computer, while Stremio extracts these streaming sources using web servers across the internet, that simply serve the end results to the users.

Now all this is nice, but why should you, as a user, care about all of this?

Well, for one, remote addons are safer, they cannot intervene with your computer in any way. But local addons are more powerful, mostly because they are harder to be stopped, can use better extractors to get streams and can't have server issues. Remote addons also have other pros though, for example, Stremio also has a Web Client, that does not require anything installed and will work with all addons that don't use torrents.

So why is PimpMyStremio needed? Because it was built by the Stremio community to create an environment of building, updating and using local addons for Stremio. This actually fills a very big gap that was always missing in Stremio.

But there's one more issue here: safety. And it's a big issue, how can PimpMyStremio ensure the safety of it's users? Well, it's currently doing this by sandboxing each addon, restricting them to use a whitelist of modules, removing their File System access and anything else that could otherwise bring harm to the users.

What is the result? An application that currently houses 40 very powerful Stremio addons, from numerous genres of interest. These addons can't be found anywhere else, and many of them can be used with just Stremio Web. (which again, doesn't require Stremio installed at all)

Want to try out PimpMyStremio? You can find the Win, OSX and Linux versions on [the download page](https://github.com/sungshon/PimpMyStremio/releases), there is also a [quick start guide](https://github.com/sungshon/PimpMyStremio/blob/master/docs/user-guide.md).

Want to see what addons to expect from it before downloading? Then check out it's [addons list](https://github.com/sungshon/PimpMyStremio/blob/master/src/addonsList.json).

Do you want to run it on Android? Check out these community projects / guides:
- [PMS Android](https://github.com/sleeyax/pms-android)
- [PimpMyStremio through Termux](https://gist.github.com/sleeyax/e9635eb352a4fcdf94194f763d743689)

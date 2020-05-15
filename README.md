# Should I pipe it?

__Is this installation script safe to pipe into my shell?__

Piping an installation script into your shell is a common, easy, yet risky way for developers to install command-line applications.

This is a simple attempt to solve the latter problem.

## How it works

1. Add a link to Should I pipe it? next to the installation instructions for your app. E.g., for the Site.js install script:

    <pre><code><strong>https://should-i-pipe.it/</strong>https://sitejs.org/install</pre></code>

2. Follow the link and copy your script’s [BLAKE2b-512](https://en.wikipedia.org/wiki/BLAKE_%28hash_function%29#BLAKE2b_algorithm) hash. e.g., [for the above script](https://should-i-pipe.it/https://sitejs.org/install):

    ```
    ce5c4c8c5118ba01a1b88e9ca23ff81a09d3cf12e66983947cbd59f1ca4f5a906f59d02142d05aac9d304874123b42f2639436151d4e675b8d0549a6c9f4de6c
    ```

3. Fork this repository and clone your fork.

4. Create a branch with the URL to your install script (omit the https:// prefix in the branch name). e.g.,

    ```
    git checkout -b sitejs.org/install
    ```

5. Create a verification object for your script in the [verified-hashes.json file](https://github.com/small-tech/should-i-pipe-it/blob/master/.dynamic/verified-hashes.json) and add yourself as the first verifier in its `verifiers` array. Make sure you set `isAuthorOfScript` to `true` if you wrote the script and set it to `false` if you’re verifying someone else’s script. Leave your verifier `url` empty for now.

    __Make sure you [sign your commits](https://help.github.com/en/github/authenticating-to-github/about-commit-signature-verification) and that your commits show as verified on GitHub.__ Pull requests with unsigned/unverified commits will not be accepted.

    e.g.,

    ```json
    {
      "ce5c4c8c5118ba01a1b88e9ca23ff81a09d3cf12e66983947cbd59f1ca4f5a906f59d02142d05aac9d304874123b42f2639436151d4e675b8d0549a6c9f4de6c": {
        "url": "https://sitejs.org/install",
        "verifiers": [
          {
            "name": "Aral Balkan",
            "isAuthorOfScript": true,
            "url": ""
          }
        ]
      }
    }
    ```

6. Push your changes to your fork and create a pull request here. Format the title of the pull request as `Verifying <domain>/<path>`. Leave the description empty unless you have any special notes that are not covered by the data in your entry. e.g.,

    ```
    Verifying sitejs.org/install
    ```

7. Once you’ve opened your pull request, copy the URL of your pull request and update your verification entry with the url under the `verifiers[your-index].url` key. Your name will be linked to this pull request on the site so that people can verify the verifiers and can do so without needing any extra data from you.

    So the entry in the preceding example would become:

    ```json
    {
      "ce5c4c8c5118ba01a1b88e9ca23ff81a09d3cf12e66983947cbd59f1ca4f5a906f59d02142d05aac9d304874123b42f2639436151d4e675b8d0549a6c9f4de6c": {
        "url": "https://sitejs.org/install",
        "verifiers": [
          {
            "name": "Aral Balkan",
            "isAuthorOfScript": true,
            "url": "https://github.com/small-tech/should-i-pipe-it/pull/1"
          }
        ]
      }
    }
    ```

8. Push your changes to the branch so that they show up in the pull request.

9. Ideally ask some other friends to verify your script also. Three verifiers per script would be ideal. I don’t think we need more than five.

## Verification requirements

Verified installation scripts:

  - Must not be malicious.
  - Must not violate a person’s privacy.
  - Must not have apparent security issues.
  - Must be served over TLS (https).
  - Must be served using a content type of `text/plain`, `text/x-shellscript`, `application/x-sh`, or `application/x-csh`.

Note that my own [Site.js](https://sitejs.org)’s install script is being erroneously served as content type `application/x-install-instructions` by Site.js’s Express static server. I have [an issue open](https://source.small-tech.org/site.js/app/-/issues/168) to fix this after the next release. Until then, temporarily, Should I pipe it? also accepts this content type.

## Developer documentation

This is a [Site.js](https://sitejs.org) app. The source code you see here is the whole app.

To run it, clone this repository, install Site.js (make sure you check the install script with Should I pipe it 😜), switch to your working directory, and type:

```bash
site
```

Then, visit __https://localhost__ to see your local version.

## Thoughts? Comments?

Please let me know what you think about this approach (and if you have any comments and suggestions) by opening an issue.

My goal in the longer term is to evolve this so that scripts with three verifications are marked as verified instead of just one.

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Powered by Site.js

[Site.js](https://sitejs.org) is a complete [small technology](https://small-tech.org/about/#small-technology) tool for developing, testing, and deploying a secure static or dynamic personal web site or app with zero configuration. With Node.js, (soon) Hugo, and more bundled into a single binary.


## Copyright

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).

## License

[AGPL version 3.0 or later.](https://www.gnu.org/licenses/agpl-3.0.en.html)

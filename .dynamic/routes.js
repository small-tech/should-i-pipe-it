//////////////////////////////////////////////////////////////////////
//
// Should I pipe it?
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// Released under AGPL version 3.0 or later.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
//////////////////////////////////////////////////////////////////////

const https          = require('https')
const crypto         = require('crypto')
const verifiedHashes = require('./verified-hashes.json')

function escapeHtml(text) {
  // Courtesy: https://stackoverflow.com/a/4835406/92548
  var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, function(m) { return map[m] })
}

// First, make a head request. If this is not a text/plain file (or, until I implement content-type overrides
// in Site.js, the erroneously labelled application/x-install-instructions that Express’s static server
// returns for https://site.js/install) or if the presented size of the file is larger than what’s reasonable,
// abort the request here. Note: the server might be lying so the actual protection is implemented in the GET call.
function preVerifyDownloadViaHeadRequest (url) {
  return new Promise((resolve, reject) => {
    const headRequest = https.request(url, {method: 'HEAD'}, response => {
      const reportedContentType = response.headers['content-type']
      const reportedContentSize = response.headers['content-length']

      if (!reportedContentType.startsWith('text/plain') && !reportedContentType.startsWith('application/x-install-instructions')) {
        reject(new Error(`This does not look like an installation script. Its content type is not text/plain.`))
      }

      if (parseInt(reportedContentSize) > 100000) {
        reject(new Error('The script is over 100KB in size. This is huge for an installation script. Be careful.'))
      }

      resolve()
    })

    headRequest.setTimeout(3000, () => {
      reject(new Error('Timed out while attempting to get information about the script.'))
    })

    headRequest.end()
  })
}

// Given that we download arbitrary content off the Interwebs, I’m rolling my own fetch method here so I can
// have checks for file type and file size as well as a reasonable timeout. No fun getting owned while trying to help
// other folks to not get owned ;)
async function downloadInstallationScript(url) {
  await preVerifyDownloadViaHeadRequest(url)

  return new Promise((resolve, reject) => {
    const getRequest = https.get(url, response => {
      const statusCode = response.statusCode
      if (statusCode !== 200) { reject(new Error(statusCode)) }

      let body = ''
      response.on('data', chunk => {
        body += chunk
        if (body.length > 100000) {
          reject(new Error('The download is over 100KB but was reported as being smaller. Aborting. Be careful.'))
        }
      })

      response.on('end', () => { resolve(body) })
    })
    getRequest.setTimeout(3000, () => {
      reject(new Error('Timed out while attempting to download the script.'))
    })
  })
}

const html = (response, advice, details, colors) => {
  response.type('html')
  response.end(`
  <!doctype html>
    <html lang='en'>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Should I pipe it? ${advice}</title>
    <style>
      html { font-family: system-ui, sans; background-color: whitesmoke; padding: 0 1rem 0 1rem; }
      body { margin: 1rem auto 2rem auto; max-width: 760px; }
      pre, #advice {
        padding: 1rem;
        white-space: pre-wrap;
        word-break: break-word;
        box-shadow: 0 0 0.5rem rgba(17,17,17,0.25);
        border-radius: 0.75rem;
        background-color: white;
      }
      ul { list-style: none; }
      ul li.true:before { content: '✅';  margin-right: 0.5em; }
      ul li.false:before { content: '❌'; margin-right: 0.5em; }
      li { margin-left: -2.5em; padding-bottom: 0.25em; }
      p { max-width: 760px; }
      a { color: ${colors.links}; text-decoration-thickness: 0.10em; }
      #advice { background-color: ${colors.advice}; color: white;}
      #advice small { display: block; margin-top: 1.25em; font-size: 0.75em;}
      #advice a { color: white; }
      #hash button { min-width: 6em; margin-left: 1em; }
      #hash pre { display: flex; justify-content: space-between; align-items: center; }
      #fund-us { background-color: lightgray; padding: 1em; margin: 2em -1em; }
    </style>
    <h1>Should I pipe it?</h1>
    ${advice ? `<h2 id='advice'>${advice}</h2>` : ''}
    ${details}
    <section id='fund-us'>
      <h3>Like this? <a href='https://small-tech.org/'>Fund us!</a></h3>
      <p>We are a tiny, independent not-for-profit.</p>
      <p>We exist in part thanks to patronage by people like you. If you share our vision and want to support our work, please <a href='https://small-tech.org/fund-us'>become a patron or donate to us</a> today and help us continue to exist.</p>
    </section>
    <p>Shared with &hearts; by <a href='https://small-tech.org'>Small Technology Foundation</a>.</p>
    <p><a href='https://small-tech.org/privacy'>Our privacy policy</a> is “we exist to protect your privacy.”</p>
    <p><a href='https://source.small-tech.org/aral/should-i-pipe-it'>View source</a>.</p>
    <script>
    function copyHashToClipboard () {
      const hash = document.querySelector('#hash-value')
      const selectedHash = document.createRange()
      selectedHash.selectNode(hash)
      window.getSelection().addRange(selectedHash)

      try {
        const success = document.execCommand('copy')
        if (!success) console.log('Failed to copy the hash.')
      } catch(error) {
        console.log('Copy command threw an error', error)
      }

      // Remove the selections - NOTE: Should use
      // removeRange(range) when it is supported
      window.getSelection().removeRange(selectedHash)
    }
    </script>
    `)
}

const usage = '<pre><code><strong>https://should-i-pipe.it/</strong><em>https://</em>link.to/some/script</code></pre>'

const regularColours  = { advice: 'orangered', links: 'steelblue' }
const warningColours  = { advice: 'crimson', links: 'steelblue' }
const verifiedColours = { advice: 'darkgreen', links: 'darkgreen' }

module.exports = async app => {
  app.get('/*', async (request, response) => {
    const url = request.url.replace('/', '')
    if (url.startsWith('https://')) {
      try {
        const source = await downloadInstallationScript(url)

        const hash = crypto.createHash('blake2b512').update(source).digest('hex')
        const sourceHtml = escapeHtml(source)

        let details = ''
        let colours = regularColours
        let advice = `No one has verified this script yet. Please <a href='#source'>check the code yourself</a>.<small>Want to vouch for it? Here’s how.</small></a>`

        if (hash in verifiedHashes) {
          const verifiedHash = verifiedHashes[hash]
          const isOriginalUrl = verifiedHash.url === url
          details = `
          <h2>Details</h2>
          <ul id='verification-details'>
            <li class='true'>Matches the hash of a script we know.</li>
            <li class='true'>Is verified by the people listed below.</li>
            <li class='${isOriginalUrl ? "true'>Is" : "false'>Is NOT"} being served from its original URL.</li>
          </ul>
          <h2 id='verifiers'>Verifiers</h2>
          <ul>
            ${verifiedHash.verifiers.reduce((html, verifier) => `${html}<li><a href='${verifier.url}'>${verifier.name}</a> ${verifier.isTheAuthor ? '(the author of the script)' : ''}</li>`, '')}
          </ul>
          `
          advice= `It should be fine, but always <a href='#source'>check the code yourself</a> also.`
          colours = verifiedColours
        }
        details = `
          ${details}
          <section id='hash'>
            <h2>Hash</h2>
            <pre>
              <code id='hash-value'>${hash}</code>
              <button id='copy-button' onclick="copyHashToClipboard()">Copy</button>
            </pre>
          </section>
          <section id='source'>
            <h2>Source</h2>
            <pre><code>${sourceHtml}</code></pre>
          </section>
        `
        return html(response, advice, details, colours)
      } catch (error) {
        let errorMessage
        if (error.message === '404') {
          errorMessage = 'Error 404: There is no script at that URL.'
        } else {
          errorMessage = `Error: could not download the script. <small>(${error.message})</small>`
        }
        return html(response, errorMessage, `<h3>Usage</h3>${usage}`, warningColours)
      }
    } else if (url.startsWith('http://')) {
      return html(response, `No, that’s an insecure URL! <small><a href='https://should-i-pipe.it/${url.replace("http://", "https://")}'>Try the URL again with an HTTPS prefix.</a></small>`, '', warningColours)
    } else {
      return html(response, '', `<h2>Usage</h2>${usage}`, regularColours)
    }
  })
}

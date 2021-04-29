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

// First, make a head request. If this is not a valid content type or if the presented size of the file is larger than
// what’s reasonable, abort the request here. Note: the server might be lying so the actual protection is implemented
// in the GET call.
function preVerifyDownloadViaHeadRequest (url) {
  return new Promise((resolve, reject) => {
    const headRequest = https.request(url, {method: 'HEAD'}, response => {
      const statusCode = response.statusCode
      const reportedContentType = response.headers['content-type']
      const reportedContentSize = response.headers['content-length']

      if (statusCode !== 200) { reject(new Error(statusCode)) }

      if (
        !reportedContentType.startsWith('text/plain')
        && !reportedContentType.startsWith('application/x-sh')
        && !reportedContentType.startsWith('application/x-csh')
        && !reportedContentType.startsWith('text/x-shellscript')
        && !reportedContentType.startsWith('text/x-sh')
        && !reportedContentType.startsWith('application/x-install-instructions')
      ) {
        reject(new Error(`<p>This does not look like an installation script.</p><p>(Its content type is not text/plain, text/x-sh, text/x-shellscript, application/x-sh, or application/x-csh.)</p>`))
      }

      if (parseInt(reportedContentSize) > 100000) {
        reject(new Error('The script is over 100KB in size. This is huge for an installation script. Be careful.'))
      }
      resolve()
    })

    headRequest.on('error', error => {
      reject(error)
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
        if (Buffer.byteLength(body) > 100000) {
          reject(new Error('The download is over 100KB but was reported as being smaller. Aborting. Be careful.'))
        }
      })

      response.on('end', () => { resolve(body) })
    })
    getRequest.on('error', error => {
      reject(error)
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
    <title>Should I pipe it? ${advice ? ` – ${advice.title}` : ''}</title>
    <style>
      * { border-box: }
      html { font-family: system-ui, sans; background-color: whitesmoke; padding: 0 1rem 0 1rem; }
      h1 { font-size: 3rem; margin: 0.5em 0;}
      h2 { font-size: 2rem; margin: 1em 0 0.5em 0; }
      h3 { font-size: 1.5rem; }
      footer, h1, h2, h3 { margin-left: 1rem; }
      body { margin: 1rem auto 2rem auto; max-width: 760px; color: #304349; }
      pre, .rounded-box { padding: 1rem; box-shadow: 0 0 0.5rem rgba(42,42,42,0.25); border-radius: 0.75rem; }
      .rounded-box h2, .rounded-box h3 { margin-left: 0; }
      pre { white-space: pre-wrap; word-break: break-word; background-color: white; }
      ul { list-style: none; }
      ul li.true:before { content: '✅';  margin-right: 0.5em; }
      ul li.false:before { content: '❌'; margin-right: 0.5em; }
      li { margin-left: -3rem; padding-bottom: 0.25em; }
      #verifiers + ul li { margin-left: -1.25rem; }
      a { color: ${colors.links}; text-decoration-thickness: 0.10em; }
      #advice { background-color: ${colors.advice}; color: white;}
      #advice h2 { margin-top: 0; }
      #advice p:first-of-type { display: block; margin-top: 1em; font-size:1.5rem; margin-bottom: -0.25em;}
      #advice p:last-of-type { margin-bottom : 0; }
      #advice a { color: white; }
      #hash button { min-width: 6em; margin-left: 1em; }
      #hash pre { display: flex; justify-content: space-between; align-items: center; }
      #fund-us { background-color: lightgray; margin: 2em 0; box-shadow: none; border: 4px solid darkgray; }
    </style>
    <h1>Should I pipe it?</h1>
    ${advice ? `<section id='advice' class='rounded-box'><h2>${advice.title}</h2>${advice.body}</section>` : ''}
    ${details}
    <section id='fund-us' class='rounded-box'>
      <h3>Like this? <a href='https://small-tech.org/fund-us'>Fund us!</a></h3>
      <p>We are a tiny, independent not-for-profit.</p>
      <p>We exist in part thanks to patronage by people like you. If you share our vision and want to support our work, please <a href='https://small-tech.org/fund-us'>become a patron or donate to us</a> today and help us continue to exist.</p>
    </section>
    <footer>
      <p>Shared with &hearts; by <a href='https://small-tech.org'>Small Technology Foundation</a>.</p>
      <p><a href='https://small-tech.org/privacy'>Our privacy policy</a> is “we exist to protect your privacy.”</p>
      <p><a href='https://github.com/small-tech/should-i-pipe-it'>View source</a>.</p>
    </footer>
    <script>
    function copyHashToClipboard () {
      const hash = document.querySelector('#hash-value')
      const selectedHash = document.createRange()
      selectedHash.selectNode(hash)
      window.getSelection().addRange(selectedHash)

      let successfullyCopied = false
      try { successfullyCopied = document.execCommand('copy') } catch (error) { /* do nothing */ }

      // Remove the selections - NOTE: Should use
      // removeRange(range) when it is supported
      window.getSelection().removeRange(selectedHash)

      // Provide feedback.
      const copyButton = document.querySelector('#copy-button')
      copyButton.innerHTML = successfullyCopied ? '👍' : '❌'
      setTimeout(() => { copyButton.innerHTML = 'Copy'}, 700)
    }
    </script>
    `)
}

const usage = "<pre><code><strong>https://should-i-pipe.it/</strong><em>https://</em>link.to/some/script</code></pre>"

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
        let advice = {
          title: 'We don’t know.',
          body: `<p><a href='#source'>Please check the code yourself</a>.<p>
            <p>If it looks good to you, help us <a href='https://github.com/small-tech/should-i-pipe-it/blob/master/README.md'>verify it</a>.</p>`
        }

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
            ${verifiedHash.verifiers.reduce((html, verifier) => `${html}<li><a href='${verifier.url}'>${verifier.name}</a> ${verifier.isAuthorOfScript ? '(the author of the script)' : ''}</li>`, '')}
          </ul>
          `
          advice= {
            title: 'It looks fine to us…',
            body: `<p>But please read the details below and decide for yourself.</p>
              <p>You can also <a href='#source'>check the code for yourself</a>.</p>`
          }
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
        let errorMessage = { title: 'Oops!', body: error.message }
        if (error.message === '404' || error.code === 'ENOTFOUND') {
          errorMessage.title = 'Error 404'
          errorMessage.body = '<p>There was no file at that address.</p><p>(Please check the URL and try again.)</p>'
        }
        return html(response, errorMessage, `<h3>Usage</h3>${usage}`, warningColours)
      }
    } else if (url.startsWith('http://')) {
      return html(response, { title: 'No, that’s not a secure download!', body: `<p>You should only be connecting to sites over TLS.</p><p>(<a href='https://should-i-pipe.it/${url.replace("http://", "https://")}'>Try the link again with an HTTPS prefix.</a>)</p>`}, '', warningColours)
    } else {
      return html(response, false, `<h2>Usage</h2>${usage}`, regularColours)
    }
  })
}

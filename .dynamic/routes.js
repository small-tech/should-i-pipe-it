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

const crypto         = require('crypto')
const prepareRequest = require('bent')
const verifiedHashes = require('./verified-hashes.json')

// Courtesy: https://stackoverflow.com/a/4835406/92548
function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, function(m) { return map[m] })
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
        const sourceRequest = prepareRequest('string')
        const source = await sourceRequest(url)

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
          <h2 id='hash'>Hash</h2>
          <pre><code>${hash}</code></pre>
          <h2 id='source'>Source</h2>
          <pre><code>${sourceHtml}</code></pre>
        `
        return html(response, advice, details, colours)
      } catch (error) {
        if (error.message.includes('404')) error.message = 'Error 404: There is no script at that URL.'
        return html(response, error.message, `<h3>Usage</h3>${usage}`, warningColours)
      }
    } else if (url.startsWith('http://')) {
      return html(response, `No, that’s an insecure URL! <small><a href='https://should-i-pipe.it/${url.replace("http://", "https://")}'>Try the URL again with an HTTPS prefix.</a></small>`, '', warningColours)
    } else {
      return html(response, '', `<h2>Usage</h2>${usage}`, regularColours)
    }
  })
}

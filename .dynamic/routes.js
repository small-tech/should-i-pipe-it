const prepareRequest = require('bent')

const html = (response, title, text) => {
  response.type('html')
  response.end(`<html><head><title>Should I pipe it? (${title})</title></head><body><h1>Should I pipe it?</h1><h2>${title}</h2><p>${text}</p></body></html>`)
}

const usage = '<pre><code><strong>https://should-i-pipe.it/</strong><em>https://</em>link.to/some/script</code></pre>'

module.exports = async app => {
  app.get('/*', async (request, response) => {
    const url = request.url.replace('/', '')
    if (url.startsWith('https://')) {
      let source = null
      const sourceRequest = prepareRequest('string')
      try {
        source = await sourceRequest(url)
      } catch (error) {
        return html(response, error.message, `<h3>Usage</h3>${usage}`)
      }
      return html(response, 'Here’s the code, read it and decide:', `<pre><code>${source}</code></pre>`)
    } else if (url.startsWith('http://')) {
      return html(response, 'No, that’s an insecure URL!', 'Don’t pipe that into your shell. Try the URL again with an <strong>https://</strong> prefix.')
    } else {
      return html(response, 'Usage', usage)
    }
  })
}

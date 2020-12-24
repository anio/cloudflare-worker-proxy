/*
 * Cloudflare-worker-proxy
 *
 */

const cookiename  = '__cfmainstream'
const html        = `<html><form>` +
                    `<input placeholder="https://domain.tld" name="__url"/> ` +
                    `<button>open</button></form></html>`

var request, url, mainstream


function getCookie(cookies, name) {
    let match, re = /(.*?)=(.*?)(?:\s*;\s*|$)/g
    while (match = re.exec(cookies))
      if(match[1] == name)
        return match[2]
}


async function getResponse() {
  let opts     = await getOpts()
  let response = await fetch(mainstream.origin + url.pathname, opts)

  response = new Response(response.body, response)
  if(url.searchParams.get('__url'))
    response.headers.append('Set-Cookie',
    `${cookiename}=${mainstream.origin}; secure; httpOnly`)
  return response
}


async function getOpts() {
  let headers = {}
  let body    = !['GET', 'HEAD'].includes(request.method) ?
                await request.text() : null

  for(const header of request.headers.entries()) {
    let [name, value] = header

    if(value.indexOf(url.hostname) != -1)
      value = value.replaceAll(url.hostname, mainstream.hostname)
    headers[name] = value
  }
  return {method: request.method, headers: headers, body: body}
}


addEventListener("fetch", event => {
  request     = event.request
  url         = new URL(request.url)
  mainstream  = url.searchParams.get('__url')

  if(!mainstream)
    mainstream = getCookie(request.headers.get("Cookie"), cookiename)

  if(!mainstream || !/^https?:\/\//.test(mainstream))
    return event.respondWith(new Response(html,
      {headers: {'Content-Type': 'text/html'}}))

  mainstream = new URL(mainstream)
  return event.respondWith(getResponse())
})

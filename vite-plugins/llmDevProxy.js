import { Buffer } from 'node:buffer'
import http from 'node:http'
import https from 'node:https'
import { pipeline } from 'node:stream/promises'
import { URL } from 'node:url'

const STRIP_REQUEST_HEADERS = new Set([
	'host',
	'connection',
	'keep-alive',
	'transfer-encoding',
	'content-length',
	'accept-encoding',
	'upgrade',
	'te',
	'trailer',
	'proxy-connection',
	'proxy-authenticate',
	'proxy-authorization',
	'x-llm-target-origin'
])

const STRIP_RESPONSE_HEADERS = new Set([
	'transfer-encoding',
	'connection',
	'content-encoding',
	'location'
])

const MAX_REDIRECTS = 5
const GENERIC_PROXY_ERROR = '请求失败，请稍后重试'

const TLS_CERT_CODES = new Set([
	'CERT_HAS_EXPIRED',
	'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
	'DEPTH_ZERO_SELF_SIGNED_CERT',
	'SELF_SIGNED_CERT_IN_CHAIN',
	'ERR_TLS_CERT_ALTNAME_INVALID'
])

function sanitizeUpstreamRequestHeaders(incoming) {
	const headers = {}
	for (const [key, value] of Object.entries(incoming)) {
		if (STRIP_REQUEST_HEADERS.has(key.toLowerCase())) continue
		if (value !== undefined) headers[key] = value
	}
	return headers
}

function formatProxyError(err) {
	if (!err) return GENERIC_PROXY_ERROR
	const code = err.cause?.code || err.code
	const msg = err.message || String(err)
	// Keep detail in server logs only; browser should show a generic message
	console.error('[llm-dev-proxy]', code || '', msg)
	return GENERIC_PROXY_ERROR
}

function endWithGenericError(res, statusCode, logDetail) {
	if (logDetail) console.error('[llm-dev-proxy]', logDetail)
	if (!res.headersSent && !res.writableEnded) {
		res.statusCode = statusCode
		res.end(GENERIC_PROXY_ERROR)
	}
}

function isTlsCertError(err) {
	return TLS_CERT_CODES.has(err?.cause?.code || err?.code || '')
}

function requestOnce(upstreamUrl, { method, headers, body, insecure }) {
	return new Promise((resolve, reject) => {
		let parsed
		try {
			parsed = new URL(upstreamUrl)
		} catch (err) {
			reject(err)
			return
		}

		const outbound = { ...headers, host: parsed.host }
		const hasBody = !!(body && body.length && method !== 'GET' && method !== 'HEAD')
		if (hasBody) outbound['content-length'] = String(body.length)

		const transport = parsed.protocol === 'https:' ? https : http
		const options = {
			protocol: parsed.protocol,
			hostname: parsed.hostname,
			port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
			path: `${parsed.pathname}${parsed.search}`,
			method,
			headers: outbound
		}
		if (parsed.protocol === 'https:') {
			options.rejectUnauthorized = !insecure
		}

		const req = transport.request(options, (upstreamRes) => {
			resolve({
				status: upstreamRes.statusCode || 502,
				headers: upstreamRes.headers,
				body: upstreamRes,
				location: upstreamRes.headers.location
			})
		})
		req.on('error', reject)
		if (hasBody) req.write(body)
		req.end()
	})
}

async function requestWithRedirects(upstreamUrl, opts) {
	let currentUrl = upstreamUrl
	let method = opts.method || 'GET'
	let body = opts.body
	const headers = { ...opts.headers }
	let insecure = !!opts.insecure

	for (let i = 0; i <= MAX_REDIRECTS; i++) {
		let result
		try {
			result = await requestOnce(currentUrl, { method, headers, body, insecure })
		} catch (err) {
			if (!insecure && isTlsCertError(err)) {
				insecure = true
				result = await requestOnce(currentUrl, { method, headers, body, insecure: true })
			} else {
				throw err
			}
		}

		const status = result.status
		if (status >= 300 && status < 400 && result.location) {
			result.body.resume()
			const next = new URL(result.location, currentUrl)
			if (next.origin !== new URL(currentUrl).origin) {
				console.error('[llm-dev-proxy] cross-origin redirect blocked', next.href)
				throw new Error(GENERIC_PROXY_ERROR)
			}
			currentUrl = next.href
			if (
				status === 303 ||
				((status === 301 || status === 302) && method !== 'GET' && method !== 'HEAD')
			) {
				method = 'GET'
				body = undefined
				delete headers['content-type']
			}
			continue
		}

		return result
	}

	console.error('[llm-dev-proxy] too many redirects', MAX_REDIRECTS)
	throw new Error(GENERIC_PROXY_ERROR)
}

function contentTypeOf(headers) {
	const raw = headers?.['content-type'] || headers?.['Content-Type'] || ''
	return String(Array.isArray(raw) ? raw[0] : raw).toLowerCase()
}

function setResponseHeaders(res, upstreamHeaders) {
	for (const [key, value] of Object.entries(upstreamHeaders || {})) {
		if (!key || value == null) continue
		if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue
		res.setHeader(key, value)
	}
}

/**
 * Dev-only: browser calls `/llm-proxy/...?__target=origin` to avoid CORS.
 * Forwards to `{origin}{path}` with TLS softening and captive-portal detection.
 */
export function llmDevProxyPlugin() {
	return {
		name: 'llm-dev-proxy',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (!req.url?.startsWith('/llm-proxy')) {
					next()
					return
				}

				let parsed
				try {
					parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
				} catch {
					endWithGenericError(res, 400, 'invalid proxy URL')
					return
				}

				const targetOrigin =
					parsed.searchParams.get('__target') || req.headers['x-llm-target-origin']
				if (!targetOrigin) {
					endWithGenericError(res, 502, 'missing target origin')
					return
				}

				parsed.searchParams.delete('__target')
				const upstreamPath = parsed.pathname.replace(/^\/llm-proxy/, '') || '/'
				const upstreamUrl = `${targetOrigin}${upstreamPath}${parsed.search}`

				const bodyChunks = []
				req.on('data', (chunk) => bodyChunks.push(chunk))
				req.on('error', (err) => {
					endWithGenericError(res, 502, err?.message || 'request error')
				})

				req.on('end', () => {
					void (async () => {
						const body = Buffer.concat(bodyChunks)
						const headers = sanitizeUpstreamRequestHeaders(req.headers)
						const upstream = await requestWithRedirects(upstreamUrl, {
							method: req.method || 'GET',
							headers,
							body,
							insecure: false
						})

						if (contentTypeOf(upstream.headers).includes('text/html')) {
							upstream.body.resume()
							console.error('[llm-dev-proxy] upstream returned HTML instead of API data')
							throw new Error(GENERIC_PROXY_ERROR)
						}

						res.statusCode = upstream.status
						setResponseHeaders(res, upstream.headers)
						if (upstream.body) {
							try {
								await pipeline(upstream.body, res)
							} catch (pipeErr) {
								if (!res.headersSent && !res.writableEnded) throw pipeErr
							}
						} else if (!res.writableEnded) {
							res.end()
						}
					})().catch((err) => {
						if (!res.headersSent && !res.writableEnded) {
							res.statusCode = 502
							res.end(formatProxyError(err))
						}
					})
				})
			})
		}
	}
}

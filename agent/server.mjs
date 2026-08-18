import http from 'node:http'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const projectArgIndex = args.indexOf('--project')
const projectRoot = path.resolve(projectArgIndex >= 0 ? args[projectArgIndex + 1] || process.cwd() : process.cwd())
const port = Number(process.env.MULTICLASS_AGENT_PORT || 4317)

function send(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': 'http://localhost:5173',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  response.end(JSON.stringify(body))
}

function isInsideProject(target) {
  const relative = path.relative(projectRoot, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function openWithVSCode(target, line) {
  return new Promise((resolve, reject) => {
    const location = `${target}:${Math.max(1, Number(line) || 1)}`
    execFile('code', ['--goto', location], { windowsHide: true }, error => {
      if (!error) return resolve('vscode')
      execFile('explorer.exe', [target], { windowsHide: true }, explorerError => {
        if (explorerError) reject(error)
        else resolve('default-app')
      })
    })
  })
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {})
  if (request.method === 'GET' && request.url === '/health') return send(response, 200, { ok: true, projectRoot })
  if (request.method !== 'POST' || request.url !== '/open-file') return send(response, 404, { error: 'Not found' })

  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 1024 * 1024) return send(response, 413, { error: 'Request too large' })
  }
  try {
    const payload = JSON.parse(body || '{}')
    const relativeFile = String(payload.file || '').replaceAll('/', path.sep)
    const target = path.resolve(projectRoot, relativeFile)
    if (!relativeFile || !isInsideProject(target)) return send(response, 400, { error: 'File is outside the configured project' })
    const openedBy = await openWithVSCode(target, payload.line)
    return send(response, 200, { ok: true, openedBy, file: target })
  } catch (error) {
    return send(response, 500, { error: error.message || 'Could not open file' })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Multiclass agent listening on http://127.0.0.1:${port}`)
  console.log(`Project root: ${projectRoot}`)
})

process.on('SIGINT', () => server.close(() => process.exit(0)))

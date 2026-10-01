import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal(root) {
  const path = resolve(root, '.env.local')
  if (!existsSync(path)) {
    throw new Error('Missing .env.local with SUPABASE_ACCESS_TOKEN')
  }
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    env[key] = value
  }
  return env
}

function parseArgs(argv) {
  const files = []
  const rest = []
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--file' || argv[i] === '-f') {
      const next = argv[i + 1]
      if (!next) throw new Error('Missing path after --file')
      files.push(next)
      i += 1
      continue
    }
    rest.push(argv[i])
  }
  return { files, rest }
}

function splitStatements(sql) {
  return sql
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `${part};`)
}

const root = process.cwd()
const env = loadEnvLocal(root)
const token = env.SUPABASE_ACCESS_TOKEN
const projectRef = env.SUPABASE_PROJECT_REF
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is empty')
if (!projectRef) throw new Error('SUPABASE_PROJECT_REF is empty')

const { files, rest } = parseArgs(process.argv.slice(2))
const fromFiles = files.map((file) => readFileSync(resolve(root, file), 'utf8'))
const sql = [...fromFiles, rest.join('\n')].filter(Boolean).join('\n\n').trim()
if (!sql) throw new Error('Provide SQL as arguments or --file path.sql')

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
const statements = splitStatements(sql)

for (const query of statements) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const text = await response.text()
  let payload = text
  try {
    payload = JSON.parse(text)
  } catch {
    /* keep raw text */
  }
  if (!response.ok) {
    console.error(JSON.stringify({ ok: false, status: response.status, query, payload }, null, 2))
    process.exit(1)
  }
  console.log(JSON.stringify({ ok: true, status: response.status, query, payload }, null, 2))
}

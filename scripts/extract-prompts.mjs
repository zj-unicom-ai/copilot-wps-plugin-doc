/**
 * Build prompts.json (+ codes.js) from:
 * 1) Optional CSV import (legacy), or
 * 2) Existing domain JSON files under src/config/prompts/domains/
 *
 * Run: npm run extract-prompts
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const KEEP_CODES = new Set([
	'selection_continuation',
	'full_text_continuation',
	'expanding',
	'summary',
	'organization',
	'full_text_summary',
	'selection_summary',
	'translation2CN',
	'translation2Other',
	'intelligent_correction',
	'correction_report',
	'polish_write_one',
	'polish_write_two',
	'polish_write_three',
	'mind_map'
])

const DOMAIN_MAP = {
	polish: ['polish_write_one', 'polish_write_two', 'polish_write_three'],
	correction: ['intelligent_correction', 'correction_report'],
	chat: [
		'selection_continuation',
		'full_text_continuation',
		'expanding',
		'summary',
		'organization',
		'full_text_summary',
		'selection_summary',
		'mind_map'
	],
	translation: ['translation2CN', 'translation2Other']
}

function parseCsvRecords(text) {
	const records = []
	let i = 0
	const len = text.length

	while (i < len) {
		if (text[i] === '\n' || text[i] === '\r') {
			i++
			continue
		}

		const fields = []
		while (i < len) {
			let value = ''
			if (text[i] === '"') {
				i++
				while (i < len) {
					if (text[i] === '"') {
						if (text[i + 1] === '"') {
							value += '"'
							i += 2
						} else {
							i++
							break
						}
					} else {
						value += text[i]
						i++
					}
				}
			} else {
				while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
					value += text[i]
					i++
				}
			}
			fields.push(value)
			if (text[i] === ',') {
				i++
				continue
			}
			break
		}
		if (fields.length > 1) records.push(fields)
		while (i < len && (text[i] === '\n' || text[i] === '\r')) i++
	}
	return records
}

function getDomainForCode(code) {
	for (const [domain, codes] of Object.entries(DOMAIN_MAP)) {
		if (codes.includes(code)) return domain
	}
	return 'chat'
}

function loadFromCsv(csvPath) {
	const text = fs.readFileSync(csvPath, 'utf8')
	const rows = parseCsvRecords(text)
	const header = rows[0]
	const codeIdx = header.indexOf('code')
	const contentIdx = header.indexOf('content')
	const titleIdx = header.indexOf('title')
	const deletedIdx = header.indexOf('is_deleted')
	const updateIdx = header.indexOf('update_time')

	const byCode = {}

	for (let r = 1; r < rows.length; r++) {
		const row = rows[r]
		const code = row[codeIdx]?.trim()
		if (!code || !KEEP_CODES.has(code)) continue
		if (row[deletedIdx] === '1') continue

		const updateTime = row[updateIdx] || ''
		const existing = byCode[code]
		if (!existing || updateTime >= existing.updateTime) {
			byCode[code] = {
				code,
				title: row[titleIdx] || code,
				content: row[contentIdx] || '',
				updateTime
			}
		}
	}
	return byCode
}

function loadFromDomains(domainsDir) {
	const byCode = {}
	if (!fs.existsSync(domainsDir)) return byCode
	for (const file of fs.readdirSync(domainsDir)) {
		if (!file.endsWith('.json')) continue
		const bucket = JSON.parse(fs.readFileSync(path.join(domainsDir, file), 'utf8'))
		for (const [code, entry] of Object.entries(bucket)) {
			if (!KEEP_CODES.has(code)) continue
			byCode[code] = {
				code,
				title: entry.title || code,
				content: entry.content || '',
				updateTime: ''
			}
		}
	}
	return byCode
}

function writeOutputs(outDir, domainsDir, byCode) {
	fs.mkdirSync(outDir, { recursive: true })
	fs.mkdirSync(domainsDir, { recursive: true })

	const prompts = {}
	const domainBuckets = Object.fromEntries(Object.keys(DOMAIN_MAP).map((d) => [d, {}]))

	for (const [code, item] of Object.entries(byCode)) {
		const entry = { title: item.title, content: item.content }
		prompts[code] = entry
		const domain = getDomainForCode(code)
		domainBuckets[domain][code] = entry
	}

	for (const [domain, bucket] of Object.entries(domainBuckets)) {
		fs.writeFileSync(path.join(domainsDir, domain + '.json'), JSON.stringify(bucket, null, 2), 'utf8')
	}

	fs.writeFileSync(path.join(outDir, 'prompts.json'), JSON.stringify(prompts, null, 2), 'utf8')

	const codesContent =
		'// Auto-generated prompt code constants\nexport const PROMPT_CODES = ' +
		JSON.stringify(Object.keys(prompts).sort(), null, 2) +
		'\n'
	fs.writeFileSync(path.join(outDir, 'codes.js'), codesContent, 'utf8')

	console.log('Extracted ' + Object.keys(prompts).length + ' prompts to ' + outDir)
}

function main() {
	const csvCandidates = [
		path.join(root, 'docs', 'prompts', 'prompts-import.csv'),
		path.join(root, 'prompts-import.csv')
	]
	const csvPath = csvCandidates.find((p) => fs.existsSync(p))
	const outDir = path.join(root, 'src', 'config', 'prompts')
	const domainsDir = path.join(outDir, 'domains')

	let byCode
	if (csvPath) {
		console.log('Loading prompts from CSV:', csvPath)
		byCode = loadFromCsv(csvPath)
	} else {
		console.log('CSV not found; merging domain JSON from', domainsDir)
		byCode = loadFromDomains(domainsDir)
		if (Object.keys(byCode).length === 0) {
			console.error('No prompts found in domains/*.json')
			process.exit(1)
		}
	}

	writeOutputs(outDir, domainsDir, byCode)
}

main()

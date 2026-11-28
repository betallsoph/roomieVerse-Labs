import fs from 'fs'
import path from 'path'

const htmlPath = path.resolve('dist/pitch-investor-rm-2026x/index.html')
const html = fs.readFileSync(htmlPath, 'utf8')

const VN =
  /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/

function decode(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function isScreenshotTag(tag) {
  return /pitch-media|slide-\d|lozido|enha|mona|appendix|chu-|khach-|card-/i.test(tag)
}

function visibleText(inner) {
  const withoutShots = inner.replace(/<(img|video|source)\b[^>]*>/gi, (tag) => (isScreenshotTag(tag) ? '' : tag))
  const alts = []
  withoutShots.replace(/\balt="([^"]*)"/gi, (_, alt) => {
    alts.push(decode(alt))
    return ''
  })
  const text = decode(withoutShots.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  return { text, alts }
}

function blocks(lang) {
  const found = []
  const re = new RegExp(`<(span|div)\\b([^>]*\\sdata-lang="${lang}"[^>]*)>`, 'g')
  let match
  while ((match = re.exec(html))) {
    const tag = match[1]
    const openEnd = match.index + match[0].length
    let depth = 1
    let i = openEnd
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf(`<${tag}`, i)
      const nextClose = html.indexOf(`</${tag}>`, i)
      if (nextClose < 0) break
      const openIsTag = nextOpen !== -1 && nextOpen < nextClose && /[\s>]/.test(html[nextOpen + tag.length] || '')
      if (openIsTag) {
        depth += 1
        i = nextOpen + tag.length + 1
      } else {
        depth -= 1
        if (depth === 0) {
          found.push({ index: match.index, inner: html.slice(openEnd, nextClose) })
          re.lastIndex = nextClose + tag.length + 3
        } else {
          i = nextClose + tag.length + 3
        }
      }
    }
  }
  return found
}

function whereFor(index) {
  const before = html.slice(0, index)
  const footerAt = before.lastIndexOf('<footer')
  const idAt = before.lastIndexOf('id="')
  if (footerAt > idAt) return 'footer'
  const ids = [...before.matchAll(/\sid="([^"]+)"/g)]
  const id = ids.length ? ids.at(-1)[1] : ''
  if (/^slide-\d+$/.test(id)) return `slide ${id.slice(6)}`
  if (id === 'appendix-story') return 'appendix story'
  if (id === 'appendix-system') return 'appendix system'
  if (id.startsWith('appendix-slide-')) return `appendix ${id.slice('appendix-slide-'.length)}`
  if (!id || id === 'pitch-fee-calc') return before.includes('id="slide-') ? id || 'slide' : 'slide 1'
  return id
}

const enBlocks = blocks('en')
const viBlocks = blocks('vi')
const failures = []

for (const block of enBlocks) {
  const { text, alts } = visibleText(block.inner)
  if (VN.test(text)) failures.push(text.slice(0, 180))
  for (const alt of alts) {
    if (VN.test(alt)) failures.push(`alt: ${alt.slice(0, 180)}`)
  }
}

if (viBlocks.length !== enBlocks.length) {
  console.error(`VI/EN block count differs: ${viBlocks.length} vi, ${enBlocks.length} en`)
  process.exit(1)
}

const pairs = []
for (let i = 0; i < viBlocks.length; i += 1) {
  pairs.push({
    where: whereFor(viBlocks[i].index),
    vi: visibleText(viBlocks[i].inner).text,
    en: visibleText(enBlocks[i].inner).text,
  })
}

const outPath = '/Users/antt/Desktop/pitch-en-pairs.json'
fs.writeFileSync(outPath, JSON.stringify(pairs, null, 2))
console.log(`pairs ${pairs.length} → ${outPath}`)
console.log(`en blocks ${enBlocks.length}`)

if (failures.length) {
  console.error(`Vietnamese letters in English copy: ${failures.length}`)
  for (const failure of failures.slice(0, 20)) console.error(failure)
  process.exit(1)
}

console.log('check-pitch-en: clean')

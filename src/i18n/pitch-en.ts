import { pitchEnMap } from './pitch-en-map'

export const pitchEn: Record<string, string> = pitchEnMap

const VN =
  /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/

export function hasVietnamese(text: string) {
  return VN.test(text)
}

export function digitRuns(text: string) {
  const stripped = text.replace(/[.,\s\u00a0\u202f]/g, '')
  return (stripped.match(/\d+/g) ?? []).slice().sort()
}

export function toEnNumber(input: string) {
  let s = String(input)
  const tokens: string[] = []
  const hold = (match: string) => {
    tokens.push(match)
    return `\uE000${tokens.length - 1}\uE001`
  }
  s = s.replace(/\$\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$\d+(?:\.\d+)?/g, hold)
  s = s.replace(/\d{1,3}(?:\.\d{3})+/g, (match) => match.replaceAll('.', ','))
  s = s.replace(/(\d+),(\d{1,2})(?!\d)/g, '$1.$2')
  s = s.replace(/(\d[\d.,]*)\s*tỷ/gi, '$1 billion VND')
  s = s.replace(/(\d[\d.,]*)\s*triệu/gi, '$1 million VND')
  s = s.replace(/(\d[\d.,]*)\s*đ(?![\p{L}\p{M}])/gu, '$1 VND')
  s = s.replace(/\uE000(\d+)\uE001/g, (_, index: string) => tokens[Number(index)])
  return s
}

export function en(vi: string) {
  const translated = pitchEn[vi]
  if (translated === undefined) {
    throw new Error(`Missing pitch EN translation: ${JSON.stringify(vi)}`)
  }
  return translated
}

export function toEn(vi: string) {
  if (Object.prototype.hasOwnProperty.call(pitchEn, vi)) return pitchEn[vi]
  return toEnNumber(vi)
}

for (const [vi, translated] of Object.entries(pitchEn)) {
  if (hasVietnamese(translated)) {
    throw new Error(`EN translation contains Vietnamese letters: ${JSON.stringify(translated)}`)
  }
  const viRuns = digitRuns(vi).join('\0')
  const enRuns = digitRuns(translated).join('\0')
  if (viRuns !== enRuns) {
    throw new Error(`Pitch map number mismatch\nVI: ${vi}\nEN: ${translated}`)
  }
}

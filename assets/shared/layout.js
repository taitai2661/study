export const offline = () => navigator.onLine ? '' : '<div class="offline-banner">オフラインで利用中です。</div>'

export function header(base = '../', current = '', grade = null) {
  const page = name => current === name ? ' aria-current="page"' : ''
  const suffix=grade!==null&&grade!==''&&Number.isInteger(Number(grade))?`?grade=${encodeURIComponent(grade)}`:''
  return `<header class="site-header no-print"><a class="brand" href="${base}"><span class="brand-mark">✓</span><span>まなびば</span></a><nav><a${page('print')} href="${base}print/${suffix}">プリントをつくる</a><a${page('web')} href="${base}web/${suffix}">Webでまなぶ</a><a${page('calculator')} href="${base}calculator/">でんたく</a><a${page('scientific-calculator')} href="${base}scientific-calculator/">関数電卓</a><a${page('converter')} href="${base}converter/">単位変換</a><a${page('history')} href="${base}web/history.html${suffix}">きろく</a></nav></header>`
}

export function footer(base = '../', message = '個人情報の入力は不要。学習記録はこの端末だけに保存されます。') {
  return `<footer class="site-footer no-print"><p>${message}</p><a href="${base}about/">教材の基準と出典</a></footer>`
}

// Presentation helpers deliberately keep the learning data separate from the
// UI.  A grade is part of the URL, so a bookmarked worksheet or answer page
// keeps the same reading level.
export const gradeFrom=(value,fallback=null)=>{
  const grade=Number(value)
  return Number.isInteger(grade)&&grade>=1&&grade<=12?grade:fallback
}

export const isLowerGrade=grade=>{const value=gradeFrom(grade,0);return value>=1&&value<=3}
export const gradeLabel=(grade,long=true)=>{
  const value=gradeFrom(grade)
  if(!value)return ''
  if(value<=6)return `小学${value}年${long?'生':''}`
  if(value<=9)return `中学${value-6}年${long?'生':''}`
  return `高校${value-9}年${long?'生':''}`
}

export const gradeFromSearch=(search=location.search,fallback=null)=>gradeFrom(new URLSearchParams(search).get('grade'),fallback)

// 算数と数学は、学年によって呼び名だけが変わる一つの教科として扱う。
// 教材データの subject は学習指導要領どおりに保持し、UI でだけ統一する。
export const isMathSubject=subject=>subject==='算数'||subject==='数学'||subject==='算数・数学'
export const subjectForGrade=(subject,grade)=>isMathSubject(subject)?(gradeFrom(grade,1)>=7?'数学':'算数'):subject
export const subjectGroup=subject=>isMathSubject(subject)?'算数・数学':subject

export function withGrade(href,grade){
  if(!gradeFrom(grade))return href
  const url=new URL(href,location.href)
  url.searchParams.set('grade',String(grade))
  return `${url.pathname}${url.search}${url.hash}`.replace(/^\//,'') || href
}

const lowCopy={
  '学年':'がくねん','教科':'きょうか','単元':'たんげん','問題':'もんだい','問題数':'もんだいの かず','答え':'こたえ','答える':'こたえる','答えを見る':'こたえを みる',
  '学習':'がくしゅう','記録':'きろく','復習':'ふくしゅう','結果':'けっか','正解':'せいかい','不正解':'ちがうよ','もう一度':'もういちど',
  '選ぶ':'えらぶ','選んで':'えらんで','はじめる':'はじめる','続ける':'つづける','終了する':'おわる','戻る':'もどる',
  '小学':'しょうがく','年生':'ねんせい','領域':'りょういき','理科':'りか','算数':'さんすう','国語':'こくご','漢検':'かんけん',
  '学習を終了する':'がくしゅうを おわる','学習を続ける':'がくしゅうを つづける','単元をえらぶ':'たんげんを えらぶ',
  'この単元をはじめる':'この たんげんを はじめる','何問やる？':'なんもん やる？','問':'もん','きろくを見る':'きろくを みる',
  '前回の単元を続ける':'まえの たんげんを つづける','最近まちがえた問題を復習':'さいきん まちがえた もんだいを ふくしゅう',
  'まだちょうせんしていません':'まだ ちょうせんして いません','何を学ぶ？':'なにを まなぶ？','学びたい単元をえらぼう。':'まなびたい たんげんを えらぼう。',
  'せいかい！':'せいかい！','おしい！ もう一度':'おしい！ もういちど','よく考えられたね。':'よく かんがえられたね。','つぎへ':'つぎへ',
  '問題をえらぶ':'もんだいを えらぶ','この問題はひらけません':'この もんだいは ひらけません','もどって、もう一度えらんでね。':'もどって、もういちど えらんでね。'
}

export const textFor=(text,grade)=>{
  const value=String(text)
  if(!isLowerGrade(grade))return value
  return Object.entries(lowCopy).sort(([a],[b])=>b.length-a.length).reduce((out,[from,to])=>out.split(from).join(to),value)
}

// Content authors can add {kana:{unit,summary,objectives,prompt}} to a unit.
// The fallback preserves existing content until a reviewed reading is supplied.
export function unitText(unit,key,grade){
  const value=isLowerGrade(grade)&&unit?.kana?.[key]!==undefined?unit.kana[key]:unit?.[key]
  return Array.isArray(value)?value.map(item=>textFor(item,grade)):textFor(value??'',grade)
}

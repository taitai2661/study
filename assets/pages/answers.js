import {COUNTS,escapeHtml,makeProblems,answerRows,normalizeAnswer} from '../shared/core.js'
import {offline} from '../shared/layout.js'
import {loadUnitIndex,loadUnit,loadItemCatalog} from '../data/data-loader.js'
import {gradeFrom,gradeLabel,isLowerGrade,textFor,unitText} from '../shared/presentation.js'
import {removedJapaneseUnitGrade} from '../shared/japanese.js'

const root=document.querySelector('#root')
let units=[],itemCatalog=[]
const appRoot=new URL('../../',import.meta.url)

const answerList=(rows,answers=[],checked=false)=>`<ol class="answer-check-list">${rows.map((row,index)=>{
  const value=answers[index]||''
  const isCorrect=checked&&normalizeAnswer(value)===normalizeAnswer(row.answer)
  const isWrong=checked&&value&&!isCorrect
  return `<li class="answer-check-item ${checked?(isCorrect?'is-correct':isWrong?'is-wrong':'is-empty'):''}">
    <span class="answer-check-number">${row.number}</span>
    <div class="answer-check-question">${row.question}</div>
    <label class="answer-check-entry"><span>あなたの答え</span><input data-answer-index="${index}" autocomplete="off" value="${escapeHtml(value)}" aria-label="第${row.number}問の答え"></label>
    ${checked?`<div class="answer-check-result"><b>${isCorrect?'○ 正解':isWrong?'△ もう一度':'− 未回答'}</b><strong>答え：${escapeHtml(row.answer)}</strong></div>`:''}
  </li>`
}).join('')}</ol>`
const unitOptions=selected=>units.filter(unit=>!(unit.subject==='国語'&&unit.area==='漢字')).map(unit=>`<option value="${escapeHtml(unit.id)}" ${unit.id===selected?'selected':''}>${unit.kankenGrade?`漢検${unit.kankenGrade}級`:gradeLabel(unit.grade,false)}｜${escapeHtml(unit.area)}｜${escapeHtml(unit.unit)}</option>`).join('')

function errorPage(){
  const printUrl=new URL('print/',appRoot)
  root.innerHTML=`${offline()}<main class="answer-check-page"><section class="friendly-error"><span>？</span><h1>答えを表示できません</h1><p>QRコードを読み取り直すか、プリント作成画面でもう一度作ってください。</p><a class="button primary" href="${escapeHtml(printUrl.href)}">プリントをつくる</a></section></main>`
}

function manualPage(defaults={}){
  const selectedUnit=units.find(unit=>unit.id===defaults.unitId)||units[0]
  const selectedCount=COUNTS.includes(defaults.count)?defaults.count:COUNTS[1]||COUNTS[0]
  const seedValue=defaults.seedValue||''
  root.innerHTML=`${offline()}<main class="answer-check-page">
    <header class="answer-check-header">
      <a class="learn-home-link" href="${escapeHtml(new URL('print/',appRoot).href)}">← プリントをつくる</a>
    </header>
    <section class="answer-check-card" aria-labelledby="answer-title">
      <div class="answer-check-heading"><span>答え合わせ</span><h1 id="answer-title">プリントの答えを見る</h1><p>プリントに書かれている内容を入力してください。</p></div>
      <form class="answer-manual-form" id="answer-form">
        <label><span>単元</span><select id="unit" required>${unitOptions(selectedUnit?.id)}</select></label>
        <label><span>問題数</span><select id="count" required>${COUNTS.map(count=>`<option value="${count}" ${count===selectedCount?'selected':''}>${count}問</option>`).join('')}</select></label>
        <label><span>問題セットID</span><input id="seed" required autocomplete="off" placeholder="例：abc-123" value="${escapeHtml(seedValue)}"></label>
        <button class="button primary" type="submit">答えを表示</button>
      </form>
    </section>
  </main>`
  root.querySelector('#answer-form').onsubmit=event=>{
    event.preventDefault()
    const url=new URL('answer.html',appRoot)
    url.searchParams.set('unit',root.querySelector('#unit').value)
    url.searchParams.set('count',root.querySelector('#count').value)
    url.searchParams.set('seed',root.querySelector('#seed').value.trim())
    history.pushState(null,'',url)
    draw()
  }
}

async function draw(){
  const params=new URLSearchParams(location.search)
  const unitId=params.get('unit')
  const count=Number(params.get('count'))
  const seedValue=params.get('seed')?.trim()
  const removedGrade=removedJapaneseUnitGrade(unitId)
  if(removedGrade){
    location.replace(new URL(`japanese-notice/?grade=${removedGrade}`,appRoot))
    return
  }
  let unit=units.find(item=>item.id===unitId)
  if(!unitId&&!count&&!seedValue){
    manualPage()
    return
  }
  if(!unit||!COUNTS.includes(count)||!seedValue){
    manualPage({unitId,count,seedValue})
    return
  }
  try{
    unit={...unit,...await loadUnit(unit.id)}
    if(['story','pictograph'].includes(unit.problemKind))itemCatalog=await loadItemCatalog()
  }catch{
    root.innerHTML=`${offline()}<main class="answer-check-page"><section class="friendly-error"><h1>教材データを読み込めませんでした</h1><p>通信を確認して、もう一度お試しください。</p><button class="button primary" id="retry-load">もう一度読み込む</button></section></main>`
    root.querySelector('#retry-load').onclick=()=>draw()
    return
  }
  const grade=gradeFrom(params.get('grade'),unit.grade)
  const rows=answerRows(makeProblems(unit,count,seedValue,itemCatalog,{lowGrade:isLowerGrade(grade)}))
  let answers=Array(rows.length).fill('')
  let checked=false
  const printUrl=new URL('print/',appRoot)
  printUrl.searchParams.set('unit',unit.id)
  printUrl.searchParams.set('count',String(count))
  printUrl.searchParams.set('seed',seedValue)
  printUrl.searchParams.set('grade',String(grade))
  const practiceUrl=new URL('web/practice.html',appRoot)
  practiceUrl.searchParams.set('unit',unit.id)
  practiceUrl.searchParams.set('count',String(count))
  practiceUrl.searchParams.set('seed',seedValue)
  practiceUrl.searchParams.set('q','1')
  practiceUrl.searchParams.set('subject',unit.subject)
  const renderAnswers=()=>{
    const answered=answers.filter(Boolean).length
    const correct=checked?rows.filter((row,index)=>normalizeAnswer(answers[index])===normalizeAnswer(row.answer)).length:0
    root.innerHTML=`${offline()}<main class="answer-check-page">
    <header class="answer-check-header">
      <a class="learn-home-link" href="${escapeHtml(new URL(`print/?grade=${grade}`,appRoot).href)}">← ${textFor('プリントをつくる',grade)}</a>
      <a class="history-link" href="${escapeHtml(printUrl.href)}">${textFor('同じプリントを開く',grade)}</a>
    </header>
    <section class="answer-check-card" aria-labelledby="answer-title">
      <div class="answer-check-heading"><span>${textFor('答え合わせ',grade)}</span><h1 id="answer-title">${escapeHtml(unitText(unit,'unit',grade))}</h1><p>${checked?`${answered}問中 ${correct}問 正解です。答えを見ながら確認しよう。`:'答えを書いたら、まとめて確認しよう。'}</p></div>
      <dl class="answer-check-meta"><div><dt>${textFor(unit.kankenGrade?'級':'学年',grade)}</dt><dd>${unit.kankenGrade?`漢検${unit.kankenGrade}級`:textFor(gradeLabel(unit.grade,false),grade)}</dd></div><div><dt>${textFor('問題数',grade)}</dt><dd>${count}${textFor('問',grade)}</dd></div><div><dt>問題セットID</dt><dd>${escapeHtml(seedValue)}</dd></div></dl>
      <div class="answer-check-progress" aria-live="polite"><span>${checked?'採点結果':`回答済み ${answered} / ${count}`}</span><b>${checked?`${correct} / ${count}`:`${answered} / ${count}`}</b></div>
      <form id="answer-check-form">${answerList(rows,answers,checked)}<div class="answer-check-actions"><button class="button primary" type="submit">${checked?'もう一度答える':'答えを確認する'}</button>${!checked?'<button class="answer-reveal" id="reveal-answers" type="button">答えだけを見る</button>':''}</div></form>
      <nav class="answer-next-actions" aria-label="次にできること"><a class="answer-next-action is-web" href="${escapeHtml(practiceUrl.href)}"><span>Webで学習</span><strong>同じ単元をもう一度とく <i>→</i></strong><small>${count}${textFor('問',grade)}・${escapeHtml(seedValue)}</small></a><a class="answer-next-action is-print" href="${escapeHtml(printUrl.href)}"><span>プリントを印刷</span><strong>同じ問題をもう一度印刷 <i>→</i></strong><small>${count}${textFor('問',grade)}・${escapeHtml(seedValue)}</small></a></nav>
    </section>
  </main>`
    root.querySelectorAll('[data-answer-index]').forEach(input=>input.addEventListener('input',event=>{
      answers[Number(event.currentTarget.dataset.answerIndex)]=event.currentTarget.value.slice(0,80)
      if(!checked){
        const currentAnswered=answers.filter(Boolean).length
        root.querySelector('.answer-check-progress').innerHTML=`<span>回答済み ${currentAnswered} / ${count}</span><b>${currentAnswered} / ${count}</b>`
      }
    }))
    root.querySelector('#answer-check-form').onsubmit=event=>{
      event.preventDefault()
      if(checked){checked=false;renderAnswers();return}
      checked=true
      renderAnswers()
    }
    root.querySelector('#reveal-answers')?.addEventListener('click',()=>{checked=true;renderAnswers()})
    if(unit.kankenGrade){
      const note=document.createElement('p')
      note.className='kanken-trademark-note'
      note.textContent='「漢検」は公益財団法人 日本漢字能力検定協会の登録商標です。本教材は同協会の公式・認定教材ではありません。'
      root.querySelector('.answer-check-card').append(note)
    }
  }
  renderAnswers()
}

async function start(){
  if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../../sw.js',import.meta.url)).catch(()=>{})
  units=await loadUnitIndex()
  draw()
}

start().catch(errorPage)

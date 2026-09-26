import {COUNTS,escapeHtml,loadState,saveState,saveSolvedProblems,offlineReviews,seed,makeProblems,normalizeAnswer,answerInputWidth,summary} from '../shared/core.js'
import {offline} from '../shared/layout.js'
import {loadUnitIndex,loadUnit,loadItemCatalog} from '../data/data-loader.js'
import {gradeFrom,gradeLabel,isLowerGrade,isMathSubject,subjectForGrade,subjectGroup,textFor,unitText} from '../shared/presentation.js'
import {removedJapaneseUnitGrade} from '../shared/japanese.js'

const root=document.querySelector('#root')
const page=document.body.dataset.page
let units=[],itemCatalog=[]

const areaId=area=>area.split(' ')[0]
const areaNames={A:'数と計算',B:'図形',C:'測定',D:'データ',漢字:'漢字',漢検対策:'漢検対策',語彙:'ことばの学習',エネルギー:'エネルギー',粒子:'粒子',生命:'生命',地球:'地球'}
const params=()=>new URLSearchParams(location.search)
const isKankenUnitId=value=>/^kanken-(10|9|8|7|6|5)-/.test(value||'')
const practiceHref=(unit,count,seedValue=seed(),question=1,subject)=>{
  const search=new URLSearchParams({unit,count:String(count),seed:seedValue,q:String(question)})
  if(subject)search.set('subject',subject)
  return `practice.html?${search}`
}
const replacePracticeUrl=(unit,count,seedValue,question,subject)=>globalThis.history.replaceState(null,'',practiceHref(unit,count,seedValue,question,subject))
const remember=(key,value)=>{try{sessionStorage.setItem(`purinto:${key}`,String(value))}catch{}}
const recall=key=>{try{return sessionStorage.getItem(`purinto:${key}`)}catch{return null}}
const selectedGrade=()=>gradeFrom(params().get('grade')||recall('selected-grade'),1)
const selectedSubject=()=>{
  const subject=params().get('subject')||recall('selected-subject')||'算数'
  return subject==='国語'&&isKankenUnitId(params().get('unit'))?'漢検':subject
}
const registerWorker=()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../../sw.js',import.meta.url)).catch(()=>{})}
const cacheOfflineReviewShell=()=>{if('serviceWorker'in navigator)navigator.serviceWorker.ready.then(registration=>registration.active?.postMessage({type:'cache-offline-review'})).catch(()=>{})}
const clearOfflineReviewShell=()=>{if('serviceWorker'in navigator)navigator.serviceWorker.ready.then(registration=>registration.active?.postMessage({type:'clear-offline-review-cache'})).catch(()=>{})}
const homeLink=grade=>`<a class="learn-home-link" href="../">← ${textFor('まなびばへ',grade)}</a>`
const visibleUnit=()=>true
const levelLabel=(subject,grade)=>subject==='漢検'?`漢検${11-grade}級（小学${grade}年修了程度）`:gradeLabel(grade)
const mathKeypadKeys=kind=>{
  const digits=['0','1','2','3','4','5','6','7','8','9']
  if(kind.startsWith('hs'))return [...digits,'x','i','√','＋','−','／','（','）','²','³','C','，']
  if(kind==='expressionCalculation')return [...digits,'x','＋','−']
  if(kind==='expandFactor')return [...digits,'x','＋','−','×','（','）','²']
  if(kind==='squareRoot')return [...digits,'√']
  if(['simultaneousEquations','quadraticEquation'].includes(kind))return [...digits,'−','，']
  return [...digits,'−']
}
const mathKeyLabel=key=>({'＋':'足す','−':'引く','×':'掛ける','／':'割る','（':'左かっこ','）':'右かっこ','²':'二乗','³':'三乗','√':'平方根','，':'区切り'}[key]||key)
const sanitizeMathAnswer=value=>String(value).replace(/[^0-9０-９a-zA-Zａ-ｚＡ-Ｚ√＋+\-−×*^²().,，、=＝/／]/g,'').slice(0,40)
const mathKeypad=(kind,width)=>`<div class="math-keypad" style="--answer-input-width:${width}px" role="group" aria-label="数式入力キーボード">
  <div class="math-keypad-keys">${mathKeypadKeys(kind).map(key=>`<button class="math-key" type="button" data-math-key="${escapeHtml(key)}" aria-label="${mathKeyLabel(key)}を入力">${escapeHtml(key)}</button>`).join('')}</div>
  <div class="math-keypad-actions"><button class="math-key math-key-action" type="button" data-math-action="backspace" aria-label="1文字削除">⌫</button><button class="math-key math-key-action" type="button" data-math-action="clear" aria-label="すべて消去">消去</button></div>
</div>`

function learningShortcuts(subject,grade){
  const state=loadState()
  const recent=[...state.solvedProblems].sort((a,b)=>Date.parse(b.solvedAt)-Date.parse(a.solvedAt))
  const last=recent.find(row=>{
    const unit=units.find(candidate=>candidate.id===row.unitId)
    return unit&&visibleUnit(unit)
  })
  const missed=recent.find(row=>!row.firstTryCorrect)
  if(!last&&!missed)return ''
  const cards=[]
  if(last){
    const unit=units.find(candidate=>candidate.id===last.unitId)
    cards.push(`<a class="learning-shortcut" href="${practiceHref(unit.id,10,seed(),1,unit.subject)}"><span>前回の単元を続ける</span><strong>${escapeHtml(last.unitName)}</strong><small>もう一度ちょうせんする →</small></a>`)
  }
  if(missed)cards.push(`<a class="learning-shortcut is-review" href="review.html?id=${encodeURIComponent(missed.id)}"><span>最近まちがえた問題を復習</span><strong>${escapeHtml(missed.unitName)}</strong><small>1問だけ復習する →</small></a>`)
  return `<section class="learning-shortcuts" aria-label="前回の学習と復習">${cards.join('')}</section>`
}

function unitCards(grade,selectedArea,subject=selectedSubject()){
  const state=loadState()
  const course=params().get('course')||''
  return units.filter(u=>visibleUnit(u)&&u.grade===grade&&u.subject===subject&&(!course||u.course===course)&&(!selectedArea||areaId(u.area)===selectedArea)).map(u=>{
    const rows=[...state.solvedProblems.filter(p=>p.unitId===u.id)].sort((a,b)=>Date.parse(b.solvedAt)-Date.parse(a.solvedAt))
    const session=[]
    for(let i=0;i<rows.length;i++){
      if(i>0&&Date.parse(rows[i-1].solvedAt)-Date.parse(rows[i].solvedAt)>60_000)break
      session.push(rows[i])
    }
    const status=session.length?`さいきん：${session.filter(p=>p.firstTryCorrect).length} / ${session.length}`:textFor('まだちょうせんしていません',grade)
    return `<article class="unit-choice-card">
      <div class="unit-choice-copy"><span>${u.kankenGrade?`漢検${u.kankenGrade}級｜${u.targetCharacters}字`:escapeHtml(textFor(u.area,grade))}</span><h2>${escapeHtml(unitText(u,'unit',grade))}</h2><p>${escapeHtml(unitText(u,'summary',grade))}</p><small>${status}</small></div>
      <fieldset><legend>${textFor('何問やる？',grade)}</legend><div class="unit-counts">${COUNTS.map(n=>`<label><input type="radio" name="count-${u.id}" value="${n}" ${n===10?'checked':''}><span>${n}<small>${textFor('問',grade)}</small></span></label>`).join('')}</div></fieldset>
      <button class="unit-start" data-unit="${u.id}">${textFor('この単元をはじめる',grade)} <span>→</span></button>
    </article>`
  }).join('')
}

function bindUnitStarts(){
  root.querySelectorAll('.unit-start').forEach(button=>button.onclick=()=>{
    const unit=button.dataset.unit
    const count=root.querySelector(`[name="count-${unit}"]:checked`).value
    remember('selected-unit',unit)
    remember('problem-count',count)
    location.href=practiceHref(unit,count,seed(),1,units.find(item=>item.id===unit)?.subject)
  })
}

function bindFilterScrollHints(){
  root.querySelectorAll('.filter-scroll-area').forEach(scroller=>{
    const sidebar=scroller.closest('.grade-sidebar')
    if(!sidebar)return
    const update=()=>{
      const overflow=scroller.scrollWidth-scroller.clientWidth>1
      const atStart=scroller.scrollLeft<=1
      const atEnd=scroller.scrollLeft+scroller.clientWidth>=scroller.scrollWidth-1
      sidebar.classList.toggle('has-filter-overflow',overflow)
      sidebar.classList.toggle('can-scroll-filter-back',overflow&&!atStart)
      sidebar.classList.toggle('can-scroll-filter-forward',overflow&&!atEnd)
    }
    scroller.addEventListener('scroll',update,{passive:true})
    window.addEventListener('resize',update,{passive:true})
    if('ResizeObserver'in window)new ResizeObserver(update).observe(scroller)
    requestAnimationFrame(update)
  })
}

function areas(){
  let grade=selectedGrade()
  let subject=selectedSubject()
  if(params().get('subject')==='国語'&&isKankenUnitId(params().get('unit'))){
    const url=new URL(location.href)
    url.searchParams.set('subject','漢検')
    history.replaceState(null,'',url)
  }
  subject=subjectForGrade(subject,grade)
  const supportedGrades=[...new Set(units.filter(u=>visibleUnit(u)&&u.subject===subject).map(u=>u.grade))].sort((a,b)=>a-b)
  if(supportedGrades.length&&!supportedGrades.includes(grade))grade=supportedGrades[0]
  remember('selected-grade',grade)
  remember('selected-subject',subject)
  const availableSubjects=[...new Set(units.filter(visibleUnit).map(u=>subjectGroup(u.subject)))]
  const course=params().get('course')||''
  const courses=[...new Set(units.filter(u=>visibleUnit(u)&&u.grade===grade&&u.subject===subject).map(u=>u.course).filter(Boolean))]
  const areaIds=[...new Set(units.filter(u=>visibleUnit(u)&&u.grade===grade&&u.subject===subject&&(!course||u.course===course)).map(u=>areaId(u.area)))]
  const grouped=areaIds.map(id=>{
    const sourceArea=units.find(u=>visibleUnit(u)&&u.grade===grade&&u.subject===subject&&areaId(u.area)===id)?.area||''
    const name=subject==='数学'?sourceArea.replace(/^[A-D]\s*/,''):areaNames[id]||id, cards=unitCards(grade,id,subject)
    return cards?`<section class="unit-area-section" aria-labelledby="area-${id}">
      <div class="unit-area-heading"><span>${id}領域</span><h2 id="area-${id}">${name}</h2></div>
      <div class="unit-choice-list">${cards}</div>
    </section>`:''
  }).join('')
  const subjectLinks=availableSubjects.map(group=>{
    const isMath=isMathSubject(group)
    const grades=units.filter(u=>visibleUnit(u)&&(isMath?isMathSubject(u.subject):u.subject===group)).map(u=>u.grade)
    const nextGrade=grades.includes(grade)?grade:Math.min(...grades)
    const targetSubject=subjectForGrade(group,nextGrade)
    return `<a href="?subject=${encodeURIComponent(targetSubject)}&grade=${nextGrade}" ${subjectGroup(subject)===group?'aria-current="page"':''}>${textFor(subjectForGrade(group,grade),grade)}</a>`
  }).join('')
  const gradeLinks=Array.from({length:12},(_,index)=>index+1)
    .filter(n=>isMathSubject(subject)?units.some(u=>visibleUnit(u)&&isMathSubject(u.subject)&&u.grade===n):units.some(u=>visibleUnit(u)&&u.subject===subject&&u.grade===n))
    .map(n=>{
      const targetSubject=subjectForGrade(subject,n)
      return `<a href="?subject=${encodeURIComponent(targetSubject)}&grade=${n}" ${n===grade?'aria-current="page"':''}>${subject==='漢検'?`漢検${11-n}級`:gradeLabel(n)}</a>`
    }).join('')
  root.innerHTML=`${offline()}<main class="learn-hub learn-hub--selection">
    <header class="learn-hub-head">${homeLink(grade)}<div class="learn-hub-actions"><a class="calculator-link" href="../calculator/">でんたく</a><a class="history-link" href="history.html?grade=${grade}">${textFor('きろくを見る',grade)}</a></div></header>
    <div class="selection-intro"><span>${textFor(levelLabel(subject,grade),grade)}・${textFor(subject,grade)}</span><h1>${textFor(subject==='漢検'?'漢検対策をはじめよう':subject==='理科'?'理科をまなぼう':'何を学ぶ？',grade)}</h1><p>${textFor(subject==='漢検'?`漢検${11-grade}級は${units.find(u=>u.kankenGrade===11-grade)?.targetCharacters||''}字が対象です。分野をえらんで練習しましょう。`:subject==='理科'?'4つの領域から、学びたい単元をえらぼう。':'教科と学年をえらんで、学びたい単元を見つけよう。',grade)}</p></div>
    <div class="unit-browser unit-browser--selection">
      <nav class="grade-sidebar" aria-label="教科と学習レベルをえらぶ">
        <div class="filter-scroll-area">
          <div class="sidebar-group"><p>教科をえらぶ</p><div class="sidebar-options sidebar-subject-options">${subjectLinks}</div></div>
          <div class="sidebar-group"><p>${subject==='漢検'?'級をえらぶ':'学年をえらぶ'}</p><div class="sidebar-options sidebar-grade-options">${gradeLinks}</div></div>
        </div>
        <span class="filter-scroll-hint filter-scroll-hint--back" aria-hidden="true">‹</span>
        <span class="filter-scroll-hint filter-scroll-hint--forward" aria-hidden="true">›</span>
      </nav>
      <section class="unit-browser-content" aria-label="${levelLabel(subject,grade)}の単元">
        <header class="unit-list-heading"><span>${textFor(levelLabel(subject,grade),grade)}・${textFor(subject,grade)}</span><h2>${textFor(subject==='漢検'?'練習する分野をえらぼう':'学びたい単元をえらぼう',grade)}</h2></header>
        ${learningShortcuts(subject,grade)}${courses.length?`<nav class="learning-shortcuts course-shortcuts" aria-label="科目をえらぶ">${courses.map(item=>`<a href="?subject=${encodeURIComponent(subject)}&grade=${grade}&course=${encodeURIComponent(item)}" ${item===course?'aria-current="page"':''}>${escapeHtml(item)}</a>`).join('')}<a href="?subject=${encodeURIComponent(subject)}&grade=${grade}" ${course===''?'aria-current="page"':''}>すべて</a></nav>`:''}${grouped}${subject==='漢検'?'<p class="notice">「漢検」は公益財団法人 日本漢字能力検定協会の登録商標です。本教材は同協会の公式・認定教材ではありません。</p>':''}
      </section>
    </div>
  </main>`
  bindUnitStarts()
  bindFilterScrollHints()
}

function unitsPage(){
  const selected=params().get('area')||recall('selected-area')
  const grade=selectedGrade()
  const name=areaNames[selected]
  if(!name){
    location.replace('./')
    return
  }
  remember('selected-area',selected)
  const cards=unitCards(grade,selected)
  root.innerHTML=`${offline()}<main class="learn-hub">
    <header class="learn-hub-head"><a class="learn-home-link" href="./?grade=${grade}">← 単元をえらぶ</a><a class="history-link" href="history.html">きろくを見る</a></header>
    <div class="learn-heading align-left"><span>${gradeLabel(grade)}・${selected}領域</span><h1>${name}</h1><p>学びたい単元をえらぼう。</p></div>
    <section class="unit-choice-list">${cards}</section>
  </main>`
  bindUnitStarts()
}

const hintFor=unit=>{
  const hints={
    compare:'一つずつ数えて、左と右の数をくらべよう。',
    story:'ふえたのか、へったのかをお話からさがそう。',
    solid:'ころがるところや、たいらなところに注目しよう。',
    shape:'かどの数や、まるいところをよく見よう。',
    composeShape:'二つのさんかくの外がわをよく見よう。',
    quantity:'はじまりの位置はそろっています。上と下の長さをくらべよう。',
    clock:'短いはりがさしている数字を見よう。',
    complement10:'10まであといくつか、ゆびをつかって数えよう。',
    split:'ぜんぶの数から、見えている数をひいてみよう。',
    countTens:'「10のまとまり」と「1のばら」に分けて数えよう。',
    add:'二つの数をいっしょに数えよう。',
    addCarry:'10になる組み合わせを先につくろう。',
    subtract:'大きい数から一つずつもどろう。',
    subtractBorrow:'10からいくつひくかを先に考えよう。',
    pictograph:'それぞれのしるしを一つずつ数えよう。'
  }
  if(unit.id==='picture-data')return 'それぞれのしるしを一つずつ数えよう。'
  if(unit.exercise.type==='number')return '一つずつ、ゆびでさしながら数えよう。'
  return hints[unit.exercise.kind||'']||'問題をもう一度ゆっくり読んでみよう。'
}

async function practice(){
  const search=params()
  const unitId=search.get('unit')||recall('selected-unit')
  const count=Number(search.get('count')||recall('problem-count'))
  const removedGrade=removedJapaneseUnitGrade(unitId)
  if(removedGrade){
    location.replace(new URL(`../../japanese-notice/?grade=${removedGrade}`,import.meta.url))
    return
  }
  let unit=units.find(u=>u.id===unitId)
  if(!unit||!COUNTS.includes(count)){
    const back=unit?`./?subject=${encodeURIComponent(unit.subject)}&grade=${unit.grade}`:'./'
    root.innerHTML=`${offline()}<main class="learn-hub"><section class="friendly-error"><span>？</span><h1>この問題はひらけません</h1><p>もどって、もう一度えらんでね。</p><a class="button primary" href="${back}">問題をえらぶ</a></section></main>`
    return
  }
  try{
    const detailedUnit=await loadUnit(unit.id)
    // Keep the hub index lightweight; detailed exercise items belong only to
    // the active practice session.
    unit={...unit,...detailedUnit}
    if(['story','pictograph'].includes(unit.problemKind))itemCatalog=await loadItemCatalog()
  }catch(error){
    root.innerHTML=`${offline()}<main class="learn-hub"><section class="friendly-error"><h1>教材データを読み込めませんでした</h1><p>通信を確認して、もう一度お試しください。</p><button class="button primary" id="retry-load">もう一度読み込む</button></section></main>`
    root.querySelector('#retry-load').onclick=()=>practice()
    return
  }
  remember('selected-unit',unitId)
  remember('problem-count',count)
  remember('selected-area',areaId(unit.area))
  const sessionSeed=search.get('seed')?.trim()||seed()
  const requestedQuestion=/^\d+$/.test(search.get('q')||'')?Number(search.get('q')):1
  const question=Math.min(Math.max(requestedQuestion,1),count)
  replacePracticeUrl(unitId,count,sessionSeed,question,unit.subject)
  const problems=makeProblems(unit,count,sessionSeed,itemCatalog,{lowGrade:isLowerGrade(unit.grade)})
  let index=question-1,tries=0,answer='',attempts=[],sheet=null,revealed=false,quitConfirm=false

  const closeSheet=()=>{
    sheet=null
    answer=''
    draw()
  }
  const closeQuitConfirm=()=>{
    quitConfirm=false
    draw()
  }
  const quitToHub=()=>{
    location.href=`./?subject=${encodeURIComponent(unit.subject)}&grade=${unit.grade}`
  }
  const advance=()=>{
    if(++index<problems.length){
      tries=0
      answer=''
      sheet=null
      revealed=false
      replacePracticeUrl(unitId,count,sessionSeed,index+1,unit.subject)
      draw()
      return
    }
    const state=saveSolvedProblems(loadState(),unit,problems,attempts)
    saveState(state)
    cacheOfflineReviewShell()
    result(unit,problems,attempts)
  }
  const feedback=problem=>{
    if(!sheet)return''
    const isCorrect=sheet==='correct'
    const title=isCorrect?'せいかい！':'おしい！ もう一度'
    const body=isCorrect?'よく考えられたね。':revealed?`答えは「${escapeHtml(problem.answer)}」です。`:hintFor(unit)
    const actions=isCorrect||revealed
      ?`<button class="sheet-primary" id="advance">${index+1===problems.length?'けっかを見る':'つぎへ'} <span>→</span></button>`
      :`<button class="sheet-secondary" id="retry">もう一度</button><button class="sheet-primary wrong-action" id="reveal">答えを見る</button>`
    return `<div class="sheet-overlay" aria-hidden="true"></div><section class="feedback-sheet ${isCorrect?'is-correct':'is-wrong'}" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <div class="sheet-handle" aria-hidden="true"></div><div class="feedback-icon" aria-hidden="true">${isCorrect?'✓':'!'}</div>
      <div class="feedback-copy"><span>${isCorrect?'GOOD JOB':'もう少し'}</span><h2 id="feedback-title">${title}</h2><p>${body}</p></div>
      <div class="feedback-actions">${actions}</div>
    </section>`
  }
  const quitSheet=()=>{
    if(!quitConfirm)return''
    return `<div class="sheet-overlay"></div><section class="feedback-sheet is-confirm" role="dialog" aria-modal="true" aria-labelledby="quit-title">
      <div class="sheet-handle" aria-hidden="true"></div><div class="feedback-icon" aria-hidden="true">?</div>
      <div class="feedback-copy"><h2 id="quit-title">学習を終了する？</h2><p>いま終わりにすると、だい${index+1}問目までのお答えは保存されません。</p></div>
      <div class="feedback-actions"><button class="sheet-secondary" id="continue-learning" type="button">学習を続ける</button><button class="sheet-primary quit-action" id="quit-confirm" type="button">単元をえらび直す</button></div>
    </section>`
  }
  const draw=()=>{
    const problem=problems[index], isChoice=problem.choices.length>0, isJapaneseText=['国語','漢検'].includes(unit.subject)
    const isMathExpression=['expression','multiple'].includes(problem.answerFormat)
    const isFractionAnswer=!isChoice&&/^\d+\/\d+$/.test(String(problem.answer))
    const [numerator='',denominator='']=isFractionAnswer?String(answer).split('/'):[]
    const answerFormat=isFractionAnswer?'fraction':isMathExpression?problem.answerFormat:'standard'
    const answerWidth=answerInputWidth(problem.answer,answerFormat)
    const answerWidthStyle=`style="--answer-input-width:${answerWidth}px"`
    root.innerHTML=`${offline()}<main class="practice-page-new ${(sheet||quitConfirm)?'has-sheet':''}">
      <header class="practice-header">
        <button class="quit-practice" id="quit-button" type="button" aria-label="学習を終了する">終了</button>
        <div class="practice-context"><span>${unit.kankenGrade?`漢検${unit.kankenGrade}級`:`${escapeHtml(textFor(unit.subject,unit.grade))}・${escapeHtml(levelLabel(unit.subject,unit.grade))}`}</span><strong>${escapeHtml(unitText(unit,'unit',unit.grade))}</strong></div>
        <span class="practice-position"><small>のこり ${problems.length-index-1}問</small><b>${index+1}</b> <i>/ ${problems.length}</i></span>
        <div class="practice-progress" aria-label="${problems.length}問中${index+1}問目"><span style="width:${(index+1)/problems.length*100}%"></span></div>
      </header>
      <section class="practice-work" aria-labelledby="question-prompt">
        <div class="question-heading"><small class="question-number">QUESTION ${String(index+1).padStart(2,'0')}</small><h1 id="question-prompt">${escapeHtml(isLowerGrade(unit.grade)&&unit.kana?.prompt||textFor(unit.exercise.prompt,unit.grade))}</h1></div>
        <form id="answer-form">
          <div class="question-visual-new">${problem.display}</div>
          <section class="answer-panel" aria-label="答えを入力">
            <p class="answer-guide">${isChoice?'答えを1つえらぼう':isJapaneseText?'ひらがなで答えよう':'答えを入力しよう'}</p>
            ${isChoice?`<div class="answer-choices-new">${problem.choices.map(x=>`<button type="button" class="choice-new ${answer===x?'selected':''}" data-answer="${escapeHtml(x)}" aria-pressed="${answer===x}">${escapeHtml(x)}</button>`).join('')}</div>`:isFractionAnswer?`<div class="fraction-answer" ${answerWidthStyle} role="group" aria-label="分数の答え"><input class="fraction-input numerator" aria-label="分子" inputmode="numeric" autocomplete="off" value="${escapeHtml(numerator)}"><span aria-hidden="true"></span><input class="fraction-input denominator" aria-label="分母" inputmode="numeric" autocomplete="off" value="${escapeHtml(denominator)}"></div>`:`<input class="answer-input-new ${isMathExpression?'math-answer-input':''} ${isJapaneseText?'japanese-answer':''}" ${answerWidthStyle} aria-label="${isJapaneseText?'ひらがなで答え':'答え'}" ${isJapaneseText?'lang="ja" autocapitalize="off" spellcheck="false"':'inputmode="text"'} autocomplete="off" value="${escapeHtml(answer)}">${isMathExpression?mathKeypad(unit.exercise.kind,answerWidth):''}`}
          </section>
          <div class="answer-actions"><button class="answer-submit" type="submit" ${answer===''?'disabled':''}>答えを確認する <span>→</span></button></div>
        </form>
      </section>${feedback(problem)}${quitSheet()}
    </main>`
    const form=root.querySelector('#answer-form')
    if(quitConfirm){
      form.querySelectorAll('button,input').forEach(el=>el.disabled=true)
      const continueBtn=root.querySelector('#continue-learning')
      continueBtn?.focus()
      continueBtn?.addEventListener('click',closeQuitConfirm)
      root.querySelector('#quit-confirm')?.addEventListener('click',quitToHub)
      root.querySelector('.quit-practice')?.addEventListener('click',()=>{quitConfirm=true;draw()})
      root.querySelectorAll('.sheet-overlay').forEach(el=>el.addEventListener('click',closeQuitConfirm))
      return
    }
    if(sheet){
      form.querySelectorAll('button,input').forEach(el=>el.disabled=true)
      const firstAction=root.querySelector('.feedback-actions button')
      firstAction?.focus()
      root.querySelector('#retry')?.addEventListener('click',closeSheet)
      root.querySelector('#reveal')?.addEventListener('click',()=>{revealed=true;draw()})
      root.querySelector('#advance')?.addEventListener('click',advance)
      root.querySelector('.sheet-overlay')?.addEventListener('click',()=>{if(sheet==='wrong'&&!revealed)closeSheet()})
      return
    }
    root.querySelector('#quit-button')?.addEventListener('click',()=>{quitConfirm=true;draw()})
    let syncCurrentAnswer=()=>{}
    if(isChoice)root.querySelectorAll('.choice-new').forEach(button=>button.onclick=()=>{
      answer=button.dataset.answer
      root.querySelectorAll('.choice-new').forEach(x=>{const selected=x===button;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected))})
      root.querySelector('.answer-submit').disabled=false
    })
    else if(isFractionAnswer){
      const top=root.querySelector('.numerator'),bottom=root.querySelector('.denominator')
      top.focus()
      syncCurrentAnswer=({normalize=true}={})=>{
        const numerator=top.value.replace(/\D/g,'').slice(0,3)
        const denominator=bottom.value.replace(/\D/g,'').slice(0,3)
        if(normalize){top.value=numerator;bottom.value=denominator}
        answer=numerator&&denominator?`${numerator}/${denominator}`:''
        root.querySelector('.answer-submit').disabled=!answer
      }
      const fractionInputs=[top,bottom]
      fractionInputs.forEach(input=>{
        input.addEventListener('input',event=>syncCurrentAnswer({normalize:!event.isComposing}))
        input.addEventListener('compositionend',syncCurrentAnswer)
        input.addEventListener('change',syncCurrentAnswer)
      })
    }else{
      const input=root.querySelector('.answer-input-new')
      input.focus()
      syncCurrentAnswer=({normalize=true}={})=>{
        answer=isJapaneseText?input.value.trim().slice(0,24):isMathExpression?sanitizeMathAnswer(input.value):input.value.replace(/[^0-9０-９./／:\-−]/g,'').slice(0,12)
        // Rewriting an input while an Android IME is composing can cancel the
        // composition.  Still update the button from the current value, then
        // normalize the visible value once composition has finished.
        if(normalize&&!isJapaneseText)input.value=answer
        root.querySelector('.answer-submit').disabled=!answer
      }
      input.oninput=event=>{
        syncCurrentAnswer({normalize:!event.isComposing})
      }
      input.oncompositionend=()=>syncCurrentAnswer()
      input.onchange=()=>syncCurrentAnswer()
      if(isMathExpression){
        root.querySelectorAll('.math-key').forEach(button=>button.addEventListener('mousedown',event=>event.preventDefault()))
        const replaceSelection=value=>{
          const start=input.selectionStart??input.value.length, end=input.selectionEnd??start
          input.value=`${input.value.slice(0,start)}${value}${input.value.slice(end)}`
          const cursor=start+value.length
          input.setSelectionRange(cursor,cursor)
          syncCurrentAnswer()
          input.focus()
        }
        const deleteBackward=()=>{
          const start=input.selectionStart??input.value.length, end=input.selectionEnd??start
          if(start===end&&start===0)return
          const removeStart=start===end?start-1:start
          input.value=`${input.value.slice(0,removeStart)}${input.value.slice(end)}`
          input.setSelectionRange(removeStart,removeStart)
          syncCurrentAnswer()
          input.focus()
        }
        root.querySelectorAll('[data-math-key]').forEach(button=>{
          button.addEventListener('click',()=>replaceSelection(button.dataset.mathKey))
        })
        root.querySelector('[data-math-action="backspace"]')?.addEventListener('click',deleteBackward)
        root.querySelector('[data-math-action="clear"]')?.addEventListener('click',()=>{
          input.value=''
          input.setSelectionRange(0,0)
          syncCurrentAnswer()
          input.focus()
        })
      }
    }
    form.onsubmit=event=>{
      event.preventDefault()
      syncCurrentAnswer()
      if(answer==='')return
      tries++
      const correct=normalizeAnswer(answer)===normalizeAnswer(problem.answer)
      attempts.push({problemId:problem.id,answer,correct,tryNumber:tries})
      sheet=correct?'correct':'wrong'
      draw()
    }
  }
  addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      if(quitConfirm)closeQuitConfirm()
      else if(sheet==='wrong'&&!revealed)closeSheet()
    }
    if(event.key==='Tab'&&(sheet||quitConfirm)){
      const buttons=[...root.querySelectorAll('.feedback-actions button')]
      if(!buttons.length)return
      const first=buttons[0],last=buttons.at(-1)
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  })
  draw()
}

function result(unit,problems,attempts){
  const count=problems.length
  const retryHref=practiceHref(unit.id,count)
  const details=problems.map((problem,index)=>{
    const answers=attempts.filter(attempt=>attempt.problemId===problem.id)
    const correctAttempt=answers.find(attempt=>attempt.correct)
    const status=correctAttempt
      ?correctAttempt.tryNumber===1
        ?{className:'first',label:'1回でせいかい'}
        :{className:'retry',label:'やり直してせいかい'}
      :{className:'revealed',label:'答えをかくにん'}
    return {problem,index,answers,status}
  })
  const correct=details.filter(item=>item.answers.some(answer=>answer.correct&&answer.tryNumber===1)).length
  const retried=details.filter(item=>item.answers.length>1||item.answers.some(answer=>!answer.correct)).length
  const rate=count?Math.round(correct/count*100):0
  const detailRows=details.map(({problem,index,answers,status})=>`
    <li class="result-detail-item">
      <div class="result-detail-head">
        <span class="result-detail-number">第${index+1}問</span>
        <span class="result-status ${status.className}">${status.label}</span>
      </div>
      <div class="result-problem">${problem.display}</div>
      <dl class="result-answer-data">
        <div><dt>あなたの答え</dt><dd>${answers.length?answers.map((answer,answerIndex)=>`<span class="${answer.correct?'is-correct':'is-wrong'}">${escapeHtml(answer.answer)}${answerIndex<answers.length-1?'<small>→</small>':''}</span>`).join(''):'—'}</dd></div>
        <div><dt>せいかい</dt><dd>${escapeHtml(problem.answer)}</dd></div>${problem.explanation?`<div><dt>解説</dt><dd>${escapeHtml(problem.explanation)}</dd></div>`:''}
        <div><dt>ちょうせん</dt><dd>${answers.length}回</dd></div>
      </dl>
    </li>`).join('')
  root.innerHTML=`${offline()}<main class="result-page-new"><section class="result-card-new">
    <div class="result-celebration"><div class="celebration">★</div><span class="eyebrow">FINISH!</span></div><h1>さいごまでできたね！</h1>
    <p class="result-unit">${unit.kankenGrade?`漢検${unit.kankenGrade}級・`:''}${escapeHtml(unit.unit)}</p><div class="result-score"><strong>${correct}</strong><span>/ ${count}<small>1回でせいかい</small></span></div>
    <section class="result-summary" aria-label="学習結果のまとめ">
      <div><strong>${rate}<small>%</small></strong><span>はじめのせいかいりつ</span></div>
      <div><strong>${correct}<small>問</small></strong><span>1回でせいかい</span></div>
      <div><strong>${retried}<small>問</small></strong><span>やり直した</span></div>
    </section>
    <section class="result-details">
      <button class="result-details-toggle" id="result-details-toggle" type="button" aria-expanded="false" aria-controls="result-details-list">
        <span>問題ごとのけっか</span><b aria-hidden="true">⌄</b>
      </button>
      <ol class="result-details-list" id="result-details-list" hidden>${detailRows}</ol>
    </section>
    <div class="result-actions"><a class="button primary" href="${retryHref}">もう一度ちょうせんする <span>→</span></a><a class="button secondary" href="./?subject=${encodeURIComponent(unit.subject)}&grade=${unit.grade}">ほかの単元をえらぶ</a><a class="result-history" href="history.html">学習のきろくを見る</a></div>
  </section></main>`
  const toggle=root.querySelector('#result-details-toggle')
  const list=root.querySelector('#result-details-list')
  toggle.onclick=()=>{
    const expanded=toggle.getAttribute('aria-expanded')==='true'
    toggle.setAttribute('aria-expanded',String(!expanded))
    list.hidden=expanded
  }
}

function history(){
  const state=loadState(),items=summary(state.solvedProblems,units),reviews=offlineReviews(state)
  root.innerHTML=`${offline()}<main class="page-shell history-page"><a class="learn-home-link" href="./">← りょういきをえらぶ</a>
    <div class="page-title"><span class="eyebrow">ON THIS DEVICE</span><h1>学習のきろく</h1><p>単元ごとのがんばりです。</p></div>
    <section class="offline-review-section" aria-labelledby="offline-review-title"><div class="history-toolbar"><div><span class="eyebrow">OFFLINE REVIEW</span><h2 id="offline-review-title">オフラインで復習できる問題</h2><p>最近解いた3問を、通信がないときももう一度できます。</p></div></div>${reviews.length?`<ol class="offline-review-list">${reviews.map((review,index)=>`<li><div><span>第${index+1}問</span><b>${escapeHtml(review.unitName)}</b><small>${escapeHtml(review.prompt)}</small></div><a class="button secondary" href="review.html?id=${encodeURIComponent(review.id)}">復習する</a></li>`).join('')}</ol>`:'<div class="empty-state compact"><span>◎</span><h2>まだ保存された問題がありません</h2><p>問題を解き終えると、ここから復習できます。</p></div>'}</section>
    <div class="history-toolbar"><p>${state.solvedProblems.length}問の記録</p><button class="text-button danger" id="clear">記録をすべて削除</button></div>
    <ul class="history-list">${items.filter(x=>visibleUnit(x.unit)).map(x=>`<li><div class="history-score"><strong>${x.attempts?Math.round(x.correct/x.attempts*100):'–'}</strong><span>%</span></div><div><b>${x.unit.kankenGrade?`漢検${x.unit.kankenGrade}級・`:''}${escapeHtml(x.unit.unit)}</b><span>${x.rows.length?`${x.rows.length}回 挑戦・${x.correct}/${x.attempts}問 初回正解`:'まだ挑戦していません'}</span></div><time>${x.last?new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium'}).format(new Date(x.last)):'–'}</time></li>`).join('')}</ul>
  </main>`
  root.querySelector('#clear').onclick=()=>{if(confirm('この端末に保存された学習履歴とオフライン復習用の問題をすべて削除します。削除した記録は元に戻せません。続けますか？')){const next=loadState();next.solvedProblems=[];saveState(next);clearOfflineReviewShell();history()}}
}

async function start(){
  registerWorker()
  units=await loadUnitIndex()
  if(page==='areas')areas()
  else if(page==='units')unitsPage()
  else if(page==='practice')practice()
  else if(page==='history')history()
}
start().catch(error=>{
  console.error(error)
  root.innerHTML='<main class="learn-hub"><section class="friendly-error"><h1>教材データを読み込めませんでした</h1><p>通信を確認して、もう一度開いてください。</p></section></main>'
})

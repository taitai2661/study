import {COUNTS,escapeHtml,loadState,saveState,seed,makeProblems,printQuestion,answerRows,qrSvg,problemSetSignature} from '../shared/core.js'
import {offline,header,footer} from '../shared/layout.js'
import {loadUnitIndex,loadUnit,loadItemCatalog} from '../data/data-loader.js'
import {gradeLabel,isLowerGrade,subjectForGrade,textFor,unitText} from '../shared/presentation.js'
import {removedJapaneseUnitGrade} from '../shared/japanese.js'

const root=document.querySelector('#root')
let units=[],itemCatalog=[]
const FIT_CLASSES=['fit-compact','fit-tight']
const WORKSHEET_STYLES=new Set(['school','friendly'])
const BATCH_RETRY_LIMIT=100
let printFitSnapshot=''
let fitFrame=0
const gradeOptions=[1,2,3,4,5,6,7,8,9,10,11,12]
const printableUnit=()=>true
const schoolStages=[
  {id:'elementary',label:'小学校',grades:[1,2,3,4,5,6]},
  {id:'junior',label:'中学校',grades:[7,8,9]},
  {id:'high',label:'高校',grades:[10,11,12]}
]
const stageForGrade=grade=>schoolStages.find(stage=>stage.grades.includes(grade))||schoolStages[0]
const gradesForStage=stageId=>(schoolStages.find(stage=>stage.id===stageId)||schoolStages[0]).grades
const subjectsForGrade=grade=>[...new Set(units.filter(unit=>unit.grade===grade&&printableUnit(unit)).map(unit=>unit.subject))]
const levelLabel=(subject,grade)=>subject==='漢検'?`漢検${11-grade}級`:gradeLabel(grade)
const gradeUnits=(grade,subject,course='')=>units.filter(unit=>unit.grade===grade&&printableUnit(unit)&&(!subject||unit.subject===subject)&&(!course||unit.course===course))
const gradesForSubject=subject=>[...new Set(units.filter(unit=>printableUnit(unit)&&unit.subject===subject).map(unit=>unit.grade))].sort((a,b)=>a-b)
const coursesFor=(grade,subject)=>[...new Set(gradeUnits(grade,subject).map(unit=>unit.course).filter(Boolean))]
const selectOptions=(selected,grade,subject,course='')=>gradeUnits(grade,subject,course).map(u=>`<option value="${escapeHtml(u.id)}" ${u.id===selected?'selected':''}>${escapeHtml(u.area)}｜${escapeHtml(u.unit)}</option>`).join('')
const countsForUnit=()=>COUNTS
const answerField=(problem,unit)=>{const label=`答え${problem.answerHint?` ${escapeHtml(problem.answerHint)}`:''}`;if(['国語','漢検'].includes(unit.subject)&&!problem.choices.length)return `<div class="answer-area kanji-answer-area"><span class="answer-label">${label}</span><span class="kanji-answer-field" aria-label="漢字や読みを書く欄" role="img"></span></div>`;return problem.answerFormat==='fraction'
  ?`<div class="answer-area answer-area-fraction"><span class="answer-label">${label}</span><span class="fraction-answer-field" aria-label="分数の答えを書く欄" role="img"><span></span><b></b><span></span></span></div>`
  :`<div class="answer-area"><span class="answer-label">${label}</span><span class="standard-answer-field" aria-label="答えを書く欄" role="img"></span></div>`}
const checkbox=(id,label,checked,disabled=false)=>`<label class="option-toggle ${disabled?'is-disabled':''}"><input id="${id}" type="checkbox" ${checked?'checked':''} ${disabled?'disabled':''}><span>${label}</span></label>`

const answerList=rows=>`<ol class="answer-list">${rows.map(row=>`<li><span class="answer-number">${row.number}</span><span class="answer-question">${row.question}</span><strong>${escapeHtml(row.answer)}</strong>${row.explanation?`<small class="answer-explanation">${escapeHtml(row.explanation)}</small>`:''}</li>`).join('')}</ol>`

function rectanglesOverlap(a,b,tolerance=1){
  return a.left<b.right-tolerance&&a.right>b.left+tolerance&&a.top<b.bottom-tolerance&&a.bottom>b.top+tolerance
}

function worksheetIssues(sheet){
  const tolerance=2
  const issues=[]
  if(sheet.scrollWidth>sheet.clientWidth+tolerance||sheet.scrollHeight>sheet.clientHeight+tolerance)issues.push('用紙の外にはみ出しています')
  const items=[...sheet.querySelectorAll('.problem-grid li')]
  const sheetRect=sheet.getBoundingClientRect()
  const headerRect=sheet.querySelector('.worksheet-header')?.getBoundingClientRect()
  const instructionRect=sheet.querySelector('.worksheet-instruction')?.getBoundingClientRect()
  const footerRect=sheet.querySelector('.worksheet-footer')?.getBoundingClientRect()
  const qrRect=sheet.querySelector('.worksheet-answer-qr')?.getBoundingClientRect()
  if(headerRect&&instructionRect&&rectanglesOverlap(headerRect,instructionRect))issues.push('上部の説明が重なっています')
  if(footerRect&&qrRect&&rectanglesOverlap(footerRect,qrRect))issues.push('QRコードがフッターと重なっています')
  for(let index=0;index<items.length;index++){
    const current=items[index].getBoundingClientRect()
    if(current.left<sheetRect.left-tolerance||current.right>sheetRect.right+tolerance||current.top<sheetRect.top-tolerance||current.bottom>sheetRect.bottom+tolerance)issues.push('問題が用紙の外にはみ出しています')
    if(footerRect&&rectanglesOverlap(current,footerRect))issues.push('問題がフッターと重なっています')
    if(qrRect&&rectanglesOverlap(current,qrRect))issues.push('問題がQRコードと重なっています')
    if(instructionRect&&rectanglesOverlap(current,instructionRect))issues.push('問題が説明欄と重なっています')
    for(let other=index+1;other<items.length;other++){
      if(rectanglesOverlap(current,items[other].getBoundingClientRect()))issues.push('問題同士が重なっています')
    }
  }
  for(const element of sheet.querySelectorAll('.problem-prompt,.print-choice-list')){
    const style=getComputedStyle(element)
    const fontSize=parseFloat(style.fontSize)
    const lineHeight=style.lineHeight==='normal'?fontSize*1.2:parseFloat(style.lineHeight)
    if(fontSize<15.9||lineHeight/fontSize<1.29)issues.push('文字が読みやすさの基準を満たしていません')
  }
  return [...new Set(issues)]
}

function fitWorksheets(){
  const sheets=[...root.querySelectorAll('.worksheet')]
  const warning=root.querySelector('#print-warning')
  const printButtons=root.querySelectorAll('#print,#mobile-print')
  if(!sheets.length)return false
  const invalidSheets=[]
  for(const sheet of sheets){
    sheet.classList.remove(...FIT_CLASSES)
    for(const className of FIT_CLASSES){
      if(worksheetIssues(sheet).length===0)break
      sheet.classList.add(className)
    }
    if(worksheetIssues(sheet).length)invalidSheets.push(sheet)
  }
  const invalid=invalidSheets.length>0
  if(warning){
    const issues=invalid?worksheetIssues(invalidSheets[0]):[]
    warning.textContent=invalid?`${issues.join('。')}。問題数を減らすか、別の問題セットIDをお試しください。`:''
    warning.classList.toggle('is-visible',invalid)
  }
  printButtons.forEach(button=>{
    button.disabled=invalid
    button.setAttribute('aria-describedby','print-warning')
  })
  return !invalid
}

function updatePreviewScale(){
  const sheet=root.querySelector('.worksheet-stack')
  const frame=root.querySelector('.worksheet-frame')
  if(!sheet||!frame)return
  // The worksheet always keeps its A4 layout.  Only its on-screen rendering is
  // scaled, so the preview has the same proportions and text/layout as the PDF.
  const frameStyle=getComputedStyle(frame)
  const availableWidth=frame.clientWidth-
    parseFloat(frameStyle.paddingLeft)-parseFloat(frameStyle.paddingRight)
  const verticalPadding=parseFloat(frameStyle.paddingTop)+parseFloat(frameStyle.paddingBottom)
  const frameRect=frame.getBoundingClientRect()
  const firstPage=sheet.querySelector('.worksheet')
  const availableHeight=Math.max(420,window.innerHeight-frameRect.top-24-verticalPadding)
  const widthScale=availableWidth/sheet.offsetWidth
  const heightScale=firstPage?availableHeight/firstPage.offsetHeight:1
  const scale=Math.min(1,widthScale,heightScale)
  sheet.style.setProperty('--preview-scale',String(scale))
  frame.style.height=`${Math.ceil(sheet.offsetHeight*scale+verticalPadding)}px`
}

function scheduleFit(){
  if(fitFrame)return
  fitFrame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fitFrame=0
    // Measure the unscaled A4 layout first.  Transform scaling must never make
    // an overflowing worksheet appear valid just because it looks smaller.
    fitWorksheets()
    updatePreviewScale()
  }))
}

async function render(initialUnit){
  const params=new URLSearchParams(location.search)
  const removedGrade=removedJapaneseUnitGrade(params.get('unit'))
  if(removedGrade){
    location.replace(new URL(`../../japanese-notice/?grade=${removedGrade}`,import.meta.url))
    return
  }
  let unit=units.find(u=>u.id===initialUnit)||units[0]
  let grade=unit?.grade||1
  let subject=unit?.subject||'算数'
  let course=unit?.course||''
  const previous=loadState().lastWorksheetConfig
  const paramGrade=Number(params.get('grade'))
  if(gradeOptions.includes(paramGrade))grade=paramGrade
  if(initialUnit){
    const requested=units.find(u=>u.id===initialUnit)
    if(requested){
      grade=requested.grade
      unit=requested
    }
  }
  if(paramGrade&&gradeOptions.includes(paramGrade)){
    grade=paramGrade
    unit=units.find(u=>u.id===params.get('unit')&&u.grade===grade)||gradeUnits(grade,params.get('subject'))[0]||unit
  }
  const paramSubject=params.get('subject')
  let legacyKankenSubject=false
  if(['算数','国語','理科','数学','漢検'].includes(paramSubject)){
    subject=subjectForGrade(paramSubject,grade)
    const requested=units.find(u=>u.id===params.get('unit')&&u.grade===grade)
    if(requested&&paramSubject==='国語'&&requested.subject==='漢検'){
      subject='漢検'
      legacyKankenSubject=true
    }
    unit=requested?.subject===subject?requested:gradeUnits(grade,subject)[0]||unit
  }else subject=unit.subject
  const requestedCourse=params.get('course')
  if(requestedCourse&&coursesFor(grade,subject).includes(requestedCourse)){
    course=requestedCourse
    unit=gradeUnits(grade,subject,course).find(item=>item.id===params.get('unit'))||gradeUnits(grade,subject,course)[0]||unit
  }
  const supportedGrades=gradesForSubject(subject)
  if(supportedGrades.length&&!supportedGrades.includes(grade)){
    grade=supportedGrades[0]
    unit=gradeUnits(grade,subject)[0]||unit
  }
  if(legacyKankenSubject){
    const url=new URL(location.href)
    url.searchParams.set('subject','漢検')
    history.replaceState(null,'',url)
  }
  try{
    // Do not attach a potentially large exercise payload to the shared index.
    unit={...unit,...await loadUnit(unit.id)}
    if(['story','pictograph'].includes(unit.problemKind))itemCatalog=await loadItemCatalog()
  }catch{
    root.innerHTML=`${offline()}<main class="page-shell"><section class="friendly-error"><h1>教材データを読み込めませんでした</h1><p>通信を確認して、もう一度お試しください。</p><button class="button primary" id="retry-load">もう一度読み込む</button></section></main>`
    root.querySelector('#retry-load').onclick=()=>render(initialUnit)
    return
  }
  let count=Number(params.get('count'))||(previous?.curriculumNodeId===unit.id?previous.problemCount||10:10)
  if(!countsForUnit(unit).includes(count))count=10
  let seedValue=params.get('seed')?.trim()||(previous?.curriculumNodeId===unit.id?previous.seed||seed():seed())
  let worksheetStyle=WORKSHEET_STYLES.has(previous?.worksheetStyle)?previous.worksheetStyle:'friendly'
  const hasAnswerPageParam=params.has('answers')
  let showAnswers=false,includeAnswerPage=hasAnswerPageParam,includeAnswerQr=true
  let continuousPages=null,continuousCount=10,continuousStatus='',isGeneratingContinuous=false
  const persistConfig=()=>saveState({...loadState(),lastWorksheetConfig:{curriculumNodeId:unit.id,problemCount:count,seed:seedValue,worksheetStyle,includeAnswerPage,includeAnswerQr}})
  if(previous?.curriculumNodeId===unit.id){
    includeAnswerPage=hasAnswerPageParam?includeAnswerPage:previous.includeAnswerPage??includeAnswerPage
    includeAnswerQr=previous.includeAnswerQr??includeAnswerQr
  }
  const worksheetUrl=()=>{
    const url=new URL(location.href)
    url.searchParams.set('grade',String(grade))
    url.searchParams.set('unit',unit.id)
    url.searchParams.set('count',String(count))
    url.searchParams.set('seed',seedValue)
    url.searchParams.delete('answers')
    return url.href
  }
  const answersUrl=(pageSeed=seedValue)=>{
    const url=new URL('../answer.html',location.href)
    url.searchParams.set('unit',unit.id)
    url.searchParams.set('count',String(count))
    url.searchParams.set('seed',pageSeed)
    url.searchParams.set('grade',String(grade))
    return url.href
  }
  const updateUrl=()=>history.replaceState(null,'',`?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}${course?`&course=${encodeURIComponent(course)}`:''}&unit=${encodeURIComponent(unit.id)}&count=${encodeURIComponent(count)}&seed=${encodeURIComponent(seedValue)}`)
  const clearContinuous=()=>{continuousPages=null;continuousStatus=''}

  const draw=()=>{
    if(!countsForUnit(unit).includes(count))count=10
    const problems=makeProblems(unit,count,seedValue,itemCatalog,{lowGrade:isLowerGrade(grade)})
    const rows=answerRows(problems)
    const worksheetMarkup=({pageProblems,pageSeed,withQr=true})=>{
      const answerCheckUrl=answersUrl(pageSeed)
      const qr=withQr&&includeAnswerQr?qrSvg(answerCheckUrl,'答え合わせページを開くQRコード'):''
      const qrBlock=withQr&&includeAnswerQr?`<div class="worksheet-answer-qr">${qr||'<span class="answer-qr-fallback">URLが長いためQRを作成できませんでした。</span>'}<div><span>答え合わせ</span><strong>${escapeHtml(answerCheckUrl)}</strong></div></div>`:''
      return `<section class="worksheet style-${worksheetStyle}" aria-label="${textFor('問題プリント',grade)}"><div class="worksheet-header"><div class="worksheet-heading"><div class="worksheet-meta"><span>${textFor(levelLabel(unit.subject,unit.grade),grade)}</span><span>${textFor(unit.subject,grade)}</span><span>${escapeHtml(textFor(unit.area,grade))}</span></div><h2>${escapeHtml(unitText(unit,'unit',grade))}</h2></div><div class="name-field"><span class="name-label">なまえ</span><span class="name-rule"></span></div></div><div class="worksheet-body"><div class="worksheet-instruction"><span>もんだい</span><strong>${escapeHtml(isLowerGrade(grade)&&unit.kana?.prompt||textFor(unit.exercise.prompt,grade))}</strong></div><ol class="problem-grid count-${count}">${pageProblems.map(problem=>`<li class="${problem.choices.length?'has-choices':''}"><span class="problem-prompt">${printQuestion(problem)}</span>${answerField(problem,unit)}</li>`).join('')}</ol></div><footer class="worksheet-footer"><span>まなびば</span><span class="worksheet-seed">問題セットID: ${escapeHtml(pageSeed)}</span></footer>${qrBlock}</section>`
    }
    const sheets=continuousPages?continuousPages.map(page=>worksheetMarkup({pageProblems:page.problems,pageSeed:page.seedValue})).join(''):`${worksheetMarkup({pageProblems:problems,pageSeed:seedValue})}${includeAnswerPage?`<section class="worksheet answer-sheet style-${worksheetStyle}" aria-label="${textFor('答えプリント',grade)}"><div class="worksheet-header"><div class="worksheet-heading"><div class="worksheet-meta"><span>${textFor(gradeLabel(unit.grade,false),grade)}</span><span>${textFor('答え',grade)}</span></div><h2>${escapeHtml(unitText(unit,'unit',grade))}</h2></div></div><div class="answer-sheet-body">${answerList(rows)}</div></section>`:''}`
    const currentStage=stageForGrade(grade)
    root.innerHTML=`${offline()}${header('../','print',grade)}<main class="print-builder"><section class="print-intro no-print"><div><span class="eyebrow">WORKSHEET MAKER</span><h1>${textFor('プリントをつくる',grade)}</h1><p>${textFor('教科、学年、単元、問題数を選ぶだけ。すぐにA4プリントを用意できます。',grade)}</p></div><span class="intro-badge">${textFor(levelLabel(unit.subject,grade),grade)}<br><strong>${textFor(unit.subject,grade)}</strong></span></section><div class="print-layout"><aside class="settings-card no-print"><div class="settings-heading"><span>1</span><div><p>${textFor('プリントの設定',grade)}</p><h2>${textFor('学習内容をえらぶ',grade)}</h2></div></div><div class="setting-stage-grid" aria-label="学校区分、学年、教科をえらぶ"><label class="setting-field"><span>学校区分</span><select id="school-stage" ${isGeneratingContinuous?'disabled':''}>${schoolStages.map(stage=>`<option value="${stage.id}" ${stage.id===currentStage.id?'selected':''}>${stage.label}</option>`).join('')}</select></label><label class="setting-field"><span>${textFor(subject==='漢検'?'級':'学年',grade)}</span><select id="grade" ${isGeneratingContinuous?'disabled':''}>${gradesForStage(currentStage.id).map(option=>`<option value="${option}" ${option===grade?'selected':''}>${textFor(levelLabel(subject,option),grade)}</option>`).join('')}</select></label><label class="setting-field"><span>${textFor('教科',grade)}</span><select id="subject" ${isGeneratingContinuous?'disabled':''}>${subjectsForGrade(grade).map(option=>`<option value="${option}" ${option===subject?'selected':''}>${textFor(option,grade)}</option>`).join('')}</select></label></div><label class="setting-field"><span>${textFor('単元',grade)}</span><select id="unit" ${isGeneratingContinuous?'disabled':''}>${selectOptions(unit.id,grade,subject)}</select></label><fieldset class="count-choice"><legend><span>2</span> ${textFor('問題数をえらぶ',grade)}</legend><div>${countsForUnit(unit).map(n=>`<label class="${count===n?'selected':''}"><input type="radio" name="count" value="${n}" ${count===n?'checked':''} ${isGeneratingContinuous?'disabled':''}><strong>${n}</strong><small>${textFor('問',grade)}</small></label>`).join('')}</div></fieldset><label class="setting-field seed-input"><span>問題セットID</span><input id="seed" value="${escapeHtml(seedValue)}" ${isGeneratingContinuous?'disabled':''}></label><fieldset class="answer-options"><legend>${textFor('答えページ',grade)}</legend>${checkbox('include-answer-page',textFor('答えページを追加',grade),includeAnswerPage,isGeneratingContinuous)}${checkbox('include-answer-qr',textFor('QRコードを答え合わせページにリンク',grade),includeAnswerQr,isGeneratingContinuous)}</fieldset><div class="settings-actions"><button class="button secondary" id="shuffle" type="button" ${isGeneratingContinuous?'disabled':''}>↻ ${textFor('別の問題にする',grade)}</button><button class="button primary" id="update" type="button" ${isGeneratingContinuous?'disabled':''}>${textFor('プレビューを更新',grade)}</button><button class="button secondary" id="show-answers" type="button" ${isGeneratingContinuous?'disabled':''}>${textFor('答えを表示',grade)}</button></div><section class="continuous-print" aria-labelledby="continuous-print-title"><h3 id="continuous-print-title">連続印刷</h3><label class="setting-field"><span>印刷する問題ページ数</span><input id="continuous-count" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(continuousCount)}" ${isGeneratingContinuous?'disabled':''}></label><button class="print-button continuous-print-button" id="continuous-print" type="button" ${isGeneratingContinuous?'disabled':''}>${isGeneratingContinuous?'問題を生成中…':'連続印刷を開始'}</button><p id="continuous-status" class="continuous-status" role="status" aria-live="polite">${escapeHtml(continuousStatus)}</p></section><button class="print-button" id="print" type="button" ${isGeneratingContinuous?'disabled':''}><span>▣</span> ${textFor('印刷・PDF保存',grade)}</button><p class="print-overflow-warning" id="print-warning" role="status" aria-live="polite"></p>${showAnswers?`<section class="answer-preview" aria-live="polite"><h3>${textFor('答え',grade)}</h3>${answerList(rows)}</section>`:''}</aside><section class="preview-area"><div class="worksheet-frame"><div class="worksheet-stack">${sheets}</div></div></section></div></main>${footer('../')}`
    const settingsCard=root.querySelector('.settings-card')
    const seedField=root.querySelector('#seed')?.closest('.setting-field')
    const answerOptions=root.querySelector('.answer-options')
    const actions=root.querySelector('.settings-actions')
    const continuousPrint=root.querySelector('.continuous-print')
    const addSectionHeading=(element,title,description)=>{
      if(!element)return
      element.insertAdjacentHTML('beforebegin',`<div class="print-section-heading"><h3>${title}</h3><p>${description}</p></div>`)
    }
    addSectionHeading(seedField,'仕上げを選ぶ','問題セットIDや答えの付け方を決めます。')
    seedField?.insertAdjacentHTML('beforeend','<small>同じ問題をもう一度開くときだけ使います。</small>')
    addSectionHeading(actions,'プレビューを調整','問題を入れ替えたり、答えを確認したりできます。')
    continuousPrint?.querySelector('h3')?.insertAdjacentHTML('afterend','<p class="continuous-print-help">異なる問題をまとめて作るときに使います。</p>')
    const preview=root.querySelector('.preview-area')
    const summary=`${textFor(levelLabel(unit.subject,grade),grade)}・${textFor(unit.subject,grade)} / ${textFor(unitText(unit,'unit',grade),grade)} / ${count}${textFor('問',grade)}`
    preview?.insertAdjacentHTML('afterbegin',`<div class="preview-heading no-print"><div><span>2 プレビューを確認</span><h2>A4プリントの仕上がり</h2><p>内容を確認してから、下のボタンで印刷またはPDF保存できます。</p></div><p class="preview-summary">${escapeHtml(summary)}</p></div>`)
    root.querySelector('.print-builder')?.insertAdjacentHTML('beforeend',`<div class="mobile-print-bar no-print"><p><span>印刷するプリント</span><strong>${escapeHtml(summary)}</strong></p><button class="print-button" id="mobile-print" type="button" ${isGeneratingContinuous?'disabled':''}><span>▣</span> ${textFor('印刷・PDF保存',grade)}</button></div>`)
    if(coursesFor(grade,subject).length){
      const field=document.createElement('label')
      field.className='setting-field'
      field.innerHTML=`<span>科目</span><select id="course" ${isGeneratingContinuous?'disabled':''}>${coursesFor(grade,subject).map(option=>`<option value="${escapeHtml(option)}" ${option===course?'selected':''}>${escapeHtml(option)}</option>`).join('')}</select>`
      root.querySelector('#unit').closest('label').before(field)
    }
    if(unit.kankenGrade){
      const notice='「漢検」は公益財団法人 日本漢字能力検定協会の登録商標です。本教材は同協会の公式・認定教材ではありません。'
      root.querySelectorAll('.worksheet-footer,.answer-sheet').forEach(container=>{
        const note=document.createElement('small')
        note.className='kanken-trademark-note'
        note.textContent=notice
        container.append(note)
      })
    }
    root.querySelector('#course')?.addEventListener('change',event=>{
      course=event.target.value
      unit=gradeUnits(grade,subject,course)[0]||unit
      updateUrl();persistConfig();render(unit.id)
    })
    root.querySelector('#school-stage').onchange=event=>{
      clearContinuous()
      const stageGrades=gradesForStage(event.target.value)
      grade=stageGrades.includes(grade)?grade:stageGrades[0]
      subject=subjectsForGrade(grade)[0]||subjectForGrade(subject,grade)
      course=coursesFor(grade,subject)[0]||''
      unit=gradeUnits(grade,subject,course)[0]||unit
      if(!countsForUnit(unit).includes(count))count=10
      updateUrl();persistConfig();render(unit.id)
    }
    root.querySelector('#grade').onchange=event=>{
      clearContinuous()
      grade=Number(event.target.value)
      subject=subjectForGrade(subject,grade)
      const availableSubjects=subjectsForGrade(grade)
      if(!availableSubjects.includes(subject))subject=availableSubjects[0]||subject
      course=coursesFor(grade,subject)[0]||''
      unit=gradeUnits(grade,subject,course).find(item=>item.id===unit.id)||gradeUnits(grade,subject,course)[0]||unit
      if(!countsForUnit(unit).includes(count))count=10
      updateUrl();persistConfig();render(unit.id)
    }
    root.querySelector('#subject').onchange=event=>{
      clearContinuous()
      subject=event.target.value
      course=coursesFor(grade,subject)[0]||''
      unit=gradeUnits(grade,subject,course)[0]||unit
      updateUrl();persistConfig();render(unit.id)
    }
    root.querySelector('#unit').onchange=event=>{
      clearContinuous()
      unit=units.find(item=>item.id===event.target.value)
      grade=unit.grade
      subject=unit.subject
      course=unit.course||''
      if(!countsForUnit(unit).includes(count))count=10
      updateUrl();persistConfig();render(unit.id)
    }
    root.querySelectorAll('[name=count]').forEach(input=>input.onchange=()=>{clearContinuous();count=Number(input.value);updateUrl();persistConfig();draw()})
    root.querySelectorAll('[name=worksheet-style]').forEach(input=>input.onchange=()=>{clearContinuous();worksheetStyle=input.value;persistConfig();draw()})
    root.querySelector('#shuffle').onclick=()=>{clearContinuous();seedValue=seed();updateUrl();persistConfig();draw()}
    root.querySelector('#update').onclick=()=>{clearContinuous();seedValue=root.querySelector('#seed')?.value.trim()||seed();updateUrl();persistConfig();draw()}
    root.querySelector('#show-answers').onclick=()=>{clearContinuous();seedValue=root.querySelector('#seed')?.value.trim()||seed();showAnswers=true;updateUrl();persistConfig();draw()}
    root.querySelector('#include-answer-page')?.addEventListener('change',event=>{clearContinuous();includeAnswerPage=event.target.checked;persistConfig();draw()})
    root.querySelector('#include-answer-qr')?.addEventListener('change',event=>{clearContinuous();includeAnswerQr=event.target.checked;persistConfig();draw()})
    root.querySelector('#continuous-print').onclick=async()=>{
      const requested=Number(root.querySelector('#continuous-count')?.value)
      continuousCount=root.querySelector('#continuous-count')?.value||continuousCount
      if(!Number.isInteger(requested)||requested<1){
        continuousStatus='連続印刷するページ数は、1以上の整数で入力してください。'
        draw()
        return
      }
      isGeneratingContinuous=true
      continuousStatus=`0 / ${requested} ページを生成中…`
      draw()
      const pages=[],usedSeeds=new Set(),usedSignatures=new Set()
      let exhausted=false
      for(let pageIndex=0;pageIndex<requested&&!exhausted;pageIndex++){
        let accepted=null
        for(let attempt=0;attempt<BATCH_RETRY_LIMIT;attempt++){
          const pageSeed=seed()
          if(usedSeeds.has(pageSeed))continue
          const pageProblems=makeProblems(unit,count,pageSeed,itemCatalog,{lowGrade:isLowerGrade(grade)})
          const signature=problemSetSignature(pageProblems)
          if(usedSignatures.has(signature))continue
          accepted={seedValue:pageSeed,problems:pageProblems,signature}
          break
        }
        if(!accepted){exhausted=true;break}
        pages.push(accepted)
        usedSeeds.add(accepted.seedValue)
        usedSignatures.add(accepted.signature)
        if(pageIndex%5===4){
          continuousStatus=`${pages.length} / ${requested} ページを生成中…`
          await new Promise(resolve=>requestAnimationFrame(resolve))
        }
      }
      continuousPages=pages
      isGeneratingContinuous=false
      continuousStatus=exhausted
        ?`重複しない問題ページを${pages.length}枚生成しました。これ以上は同じ内容になるため、ここで停止しました。`
        :`${pages.length}枚の異なる問題ページを生成しました。印刷画面を開きます。`
      draw()
      requestAnimationFrame(()=>requestAnimationFrame(()=>{if(fitWorksheets()&&pages.length)window.print()}))
    }
    root.querySelectorAll('#print,#mobile-print').forEach(button=>{
      button.onclick=()=>{if(fitWorksheets())window.print()}
    })
    scheduleFit()
  }
  draw()
}

async function start(){
  if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../../sw.js',import.meta.url)).catch(()=>{})
  units=await loadUnitIndex()
  render(new URLSearchParams(location.search).get('unit'))
}

start().catch(()=>root.textContent='教材データを読み込めませんでした。')

window.addEventListener('resize',scheduleFit)
window.addEventListener('beforeprint',()=>{
  const sheet=root.querySelector('.worksheet')
  printFitSnapshot=sheet?FIT_CLASSES.filter(className=>sheet.classList.contains(className)).join(' '):''
})
window.addEventListener('afterprint',()=>{
  const sheet=root.querySelector('.worksheet')
  if(sheet){
    sheet.classList.remove(...FIT_CLASSES)
    if(printFitSnapshot)sheet.classList.add(...printFitSnapshot.split(' '))
  }
  scheduleFit()
})

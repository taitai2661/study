import {escapeHtml,loadState,normalizeAnswer,offlineReviews} from '../shared/core.js'
import {textFor} from '../shared/presentation.js'
const root=document.querySelector('#root'),id=new URLSearchParams(location.search).get('id'),problem=offlineReviews(loadState()).find(item=>item.id===id)
if(!problem)root.innerHTML='<main class="learn-hub"><section class="friendly-error"><span>？</span><h1>この復習問題はありません</h1><p>保存できるのは最近解いた3問までです。</p><a class="button primary" href="history.html">きろくを見る</a></section></main>'
else{
  let answer='',checked=false,quitConfirm=false
  const closeQuitConfirm=()=>{quitConfirm=false;draw()}
  const quitToHistory=()=>{location.href='history.html'}
  const draw=()=>{
    const choices=problem.choices||[]
    const usesJapaneseAnswer=/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(problem.answer)
    const quitSheet=quitConfirm?`<div class="sheet-overlay"></div><section class="feedback-sheet is-confirm" role="dialog" aria-modal="true" aria-labelledby="quit-title"><div class="sheet-handle" aria-hidden="true"></div><div class="feedback-icon" aria-hidden="true">?</div><div class="feedback-copy"><h2 id="quit-title">復習をやめる？</h2><p>いま終わりにすると、${checked?'この問題のこたえは':'これからのおこたえは'}のこりません。</p></div><div class="feedback-actions"><button class="sheet-secondary" id="continue-learning" type="button">復習を続ける</button><button class="sheet-primary quit-action" id="quit-confirm" type="button">きろくにもどる</button></div></section>`:''
    root.innerHTML=`<main class="practice-page-new ${quitConfirm?'has-sheet':''}"><header class="practice-header"><button class="quit-practice" id="quit-button" type="button" aria-label="${textFor('復習を終了する',problem.grade)}">×</button><span class="practice-position">ふくしゅう</span><div></div></header><section class="practice-work" aria-labelledby="question-prompt"><small class="question-number">${escapeHtml(problem.unitName)}</small><h1 id="question-prompt">${escapeHtml(textFor(problem.prompt,problem.grade))}</h1><form id="answer-form"><div class="question-visual-new">${problem.display}</div>${choices.length?`<div class="answer-choices-new">${choices.map(choice=>`<button type="button" class="choice-new ${answer===choice?'selected':''}" data-answer="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join('')}</div>`:`<input class="answer-input-new" aria-label="${textFor('答え',problem.grade)}" inputmode="${usesJapaneseAnswer?'text':'numeric'}" autocomplete="off" value="${escapeHtml(answer)}">`}<button class="answer-submit" type="submit" ${answer===''?'disabled':''}>${textFor('答える',problem.grade)}</button></form>${checked?`<section class="review-feedback ${normalizeAnswer(answer)===normalizeAnswer(problem.answer)?'is-correct':'is-wrong'}"><h2>${normalizeAnswer(answer)===normalizeAnswer(problem.answer)?'せいかい！':textFor('答えを確認しよう',problem.grade)}</h2><p>${textFor('正解は',problem.grade)}「${escapeHtml(problem.answer)}」です。</p><a class="button primary" href="history.html?grade=${problem.grade}">${textFor('きろくに戻る',problem.grade)}</a></section>`:''}</section>${quitSheet}</main>`
    const form=root.querySelector('#answer-form')
    if(quitConfirm){
      form.querySelectorAll('button,input').forEach(el=>el.disabled=true)
      const continueBtn=root.querySelector('#continue-learning')
      continueBtn?.focus()
      continueBtn?.addEventListener('click',closeQuitConfirm)
      root.querySelector('#quit-confirm')?.addEventListener('click',quitToHistory)
      root.querySelectorAll('.sheet-overlay').forEach(el=>el.addEventListener('click',closeQuitConfirm))
      return
    }
    if(checked)return
    root.querySelector('#quit-button')?.addEventListener('click',()=>{quitConfirm=true;draw()})
    if(choices.length)root.querySelectorAll('.choice-new').forEach(button=>button.onclick=()=>{
      answer=button.dataset.answer
      root.querySelectorAll('.choice-new').forEach(choice=>choice.classList.toggle('selected',choice===button))
      root.querySelector('.answer-submit').disabled=false
    })
    else{
      const input=root.querySelector('.answer-input-new')
      input.focus()
      input.oninput=()=>{answer=(usesJapaneseAnswer?input.value:input.value.replace(/[^0-9０-９a-zA-Zａ-ｚＡ-Ｚ√＋+\-−×*^²().,，、=＝\/／:]/g,'')).slice(0,40);input.value=answer;root.querySelector('.answer-submit').disabled=!answer}
    }
    form.onsubmit=event=>{event.preventDefault();if(answer){checked=true;draw()}}
  }
  addEventListener('keydown',event=>{
    if(event.key==='Escape'&&quitConfirm)closeQuitConfirm()
  })
  draw()
}

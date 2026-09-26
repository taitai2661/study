import {calculate,formatNumber,lastNumberRange,normalizeExpression} from '../shared/calculator.js'
import {offline,footer,header} from '../shared/layout.js'

const root=document.querySelector('#root')
const HISTORY_KEY='purinto:calculator-history'
const MAX_HISTORY=30
let expression='',display='0',message='',justCalculated=false

const readHistory=()=>{try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(value)?value.filter(row=>typeof row?.expression==='string'&&typeof row?.result==='string').slice(0,MAX_HISTORY):[]}catch{return []}}
const writeHistory=rows=>{try{localStorage.setItem(HISTORY_KEY,JSON.stringify(rows.slice(0,MAX_HISTORY)))}catch{}}
let history=readHistory()

const operator=value=>['+','-','×','÷'].includes(value)
const canStartNumber=()=>!expression||operator(expression.at(-1))||expression.at(-1)==='('
const setMessage=value=>{message=value;setTimeout(()=>{if(message===value){message='';draw()}},2600)}
const updateDisplay=()=>{display=expression||'0'}

function append(value){
  message=''
  if(justCalculated&&(/[0-9.]/.test(value)||value==='(')){expression='';justCalculated=false}
  if(value==='('){
    if(expression&&(/[0-9)]/.test(expression.at(-1))))expression+='×'
    expression+='('
  }else if(value===')'){
    const opens=(expression.match(/\(/g)||[]).length,closes=(expression.match(/\)/g)||[]).length
    if(opens>closes&&expression&&!operator(expression.at(-1))&&expression.at(-1)!=='(')expression+=')'
  }else if(operator(value)){
    if(!expression&&value!=='-'){setMessage('はじめに数を入れてね');draw();return}
    if(operator(expression.at(-1)))expression=expression.slice(0,-1)+value
    else if(expression.at(-1)!=='(')expression+=value
    justCalculated=false
  }else if(value==='.'){
    const current=expression.match(/(?:\d+(?:\.\d*)?|\.\d*)$/)?.[0]||''
    if(!current.includes('.'))expression+=current?' .'.trim():canStartNumber()?'0.':''
  }else expression+=value
  updateDisplay();draw()
}

function evaluate(){
  try{
    const cleaned=normalizeExpression(expression)
    const result=formatNumber(calculate(cleaned))
    history=[{expression:cleaned,result},...history.filter(row=>!(row.expression===cleaned&&row.result===result))].slice(0,MAX_HISTORY)
    writeHistory(history)
    expression=result;display=result;message='';justCalculated=true
  }catch(error){message=error.message==='divide-by-zero'?'0では割れないよ':'式をたしかめてね';justCalculated=false}
  draw()
}

function action(value){
  if(value==='=')evaluate()
  else if(value==='clear'){expression='';display='0';message='';justCalculated=false;draw()}
  else if(value==='backspace'){expression=expression.slice(0,-1);updateDisplay();message='';justCalculated=false;draw()}
  else if(value==='sign'){
    const range=lastNumberRange(expression)
    if(range)expression=`${expression.slice(0,range.start)}${range.value.startsWith('-')?range.value.slice(1):`-${range.value}`}${expression.slice(range.end)}`
    else if(!expression||operator(expression.at(-1))||expression.at(-1)==='(')expression+='-'
    updateDisplay();message='';draw()
  }else append(value)
}

function draw(){
  root.innerHTML=`${offline()}${header('../','calculator')}<main class="calculator-page">
    <section class="calculator-panel" aria-labelledby="calculator-title">
      <div class="calculator-heading"><span>STUDY TOOL</span><h1 id="calculator-title">でんたく</h1><p>式を入れて、答えをたしかめよう。</p></div>
      <div class="calculator-display-wrap"><output class="calculator-display" aria-live="polite">${display}</output>${message?`<p class="calculator-message" role="status">${message}</p>`:''}</div>
      <div class="calculator-keys" aria-label="電卓のキー">
        ${[['clear','C'],['backspace','⌫'],['(', '('],[')', ')'],['7','7'],['8','8'],['9','9'],['÷','÷'],['4','4'],['5','5'],['6','6'],['×','×'],['1','1'],['2','2'],['3','3'],['-','−'],['sign','±'],['0','0'],['.','.'],['+','＋'],['=','=']].map(([value,label])=>`<button type="button" data-key="${value}" class="calculator-key ${operator(value)?'is-operator':''} ${value==='='?'is-equals':''} ${['clear','backspace'].includes(value)?'is-utility':''}" aria-label="${value==='backspace'?'1文字消す':value==='clear'?'すべて消す':label}">${label}</button>`).join('')}
      </div>
    </section>
    <section class="calculator-history" aria-labelledby="history-title"><div class="calculator-history-head"><div><span>ON THIS DEVICE</span><h2 id="history-title">けいさんのきろく</h2></div>${history.length?'<button type="button" class="clear-calculator-history" id="clear-history">すべて消す</button>':''}</div>
      ${history.length?`<ol>${history.map(row=>`<li><span>${row.expression}</span><b>= ${row.result}</b></li>`).join('')}</ol>`:'<p class="calculator-history-empty">まだ計算のきろくはありません。</p>'}
    </section>
  </main>${footer('../')}`
  root.querySelectorAll('[data-key]').forEach(button=>button.addEventListener('click',()=>action(button.dataset.key)))
  root.querySelector('#clear-history')?.addEventListener('click',()=>{history=[];writeHistory(history);draw()})
}

window.addEventListener('keydown',event=>{
  if(event.metaKey||event.ctrlKey||event.altKey)return
  const key=event.key
  const map={Enter:'=', '=':'=',Escape:'clear',Backspace:'backspace','*':'×','/':'÷'}
  const value=map[key]||key
  if(/[0-9.+\-()]/.test(value)||['=','clear','backspace','×','÷'].includes(value)){event.preventDefault();action(value)}
})

if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../../sw.js',import.meta.url)).catch(()=>{})
draw()

import {CONVERSION_CATEGORIES,convert,formatConversion,getCategory,getComparison} from '../shared/converter.js'
import {offline,footer,header} from '../shared/layout.js'

const root=document.querySelector('#root')
let categoryId='length',fromId='m',toId='cm',input='1',status=''
let statusTimer
const category=()=>getCategory(categoryId)
const selected=(value,current)=>value===current?' selected':''
const unitOptions=current=>category().units.map(item=>`<option value="${item.id}"${selected(item.id,current)}>${item.label}${item.detail?` — ${item.detail}`:''}</option>`).join('')
const escapeAttribute=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')
const parsedValue=()=>{
  const normalized=input.trim().replace(/,/g,'')
  if(!normalized)return null
  if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized))throw new Error('invalid-value')
  const value=Number(normalized)
  if(!Number.isFinite(value))throw new Error('invalid-value')
  return value
}
const result=()=>{
  try{
    const value=parsedValue()
    return value===null?{text:'',error:''}:{text:formatConversion(convert(value,categoryId,fromId,toId)),error:''}
  }catch{return{text:'',error:'数値をたしかめてください。'}}
}
const comparisonResult=()=>{
  try{
    const value=parsedValue()
    if(value===null||value<0)return null
    const from=category().units.find(item=>item.id===fromId)
    return getComparison(categoryId,from.toBase(value))
  }catch{return null}
}
const setStatus=message=>{
  status=message
  clearTimeout(statusTimer)
  statusTimer=setTimeout(()=>{status='';draw()},2400)
  draw()
}
const copyResult=async text=>{
  if(!text)return
  try{await navigator.clipboard.writeText(text);setStatus('結果をコピーしました。')}
  catch{
    const area=document.createElement('textarea')
    area.value=text;document.body.append(area);area.select()
    const copied=document.execCommand('copy');area.remove()
    setStatus(copied?'結果をコピーしました。':'コピーできませんでした。')
  }
}

function draw({focus=false}={}){
  const conversion=result()
  const comparison=comparisonResult()
  const from=category().units.find(item=>item.id===fromId)
  const to=category().units.find(item=>item.id===toId)
  root.innerHTML=`${offline()}${header('../','converter')}<main class="converter-page">
    <section class="converter-intro"><span>STUDY TOOL</span><h1>単位変換</h1><p>変えたい数と単位をえらぶと、すぐに答えがわかります。</p></section>
    <nav class="converter-categories" aria-label="変換するもの">${CONVERSION_CATEGORIES.map(item=>`<button type="button" data-category="${item.id}" aria-pressed="${item.id===categoryId}">${item.label}</button>`).join('')}</nav>
    <section class="converter-panel" aria-labelledby="converter-title">
      <h2 id="converter-title">${category().label}を変換</h2>
      <div class="converter-work">
        <label class="converter-field"><span>変換する数</span><input id="converter-input" type="text" inputmode="decimal" autocomplete="off" value="${escapeAttribute(input)}" aria-describedby="converter-error"></label>
        <label class="converter-field"><span>変換元の単位</span><select id="from-unit">${unitOptions(fromId)}</select></label>
        <button class="converter-swap" id="swap-units" type="button" aria-label="変換元と変換先の単位を入れ替える"><span aria-hidden="true">⇅</span> 入れ替える</button>
        <label class="converter-field"><span>変換先の単位</span><select id="to-unit">${unitOptions(toId)}</select></label>
      </div>
      <div class="converter-result ${conversion.error?'has-error':''}">
        <span>変換結果</span>
        <output id="conversion-output" aria-live="polite">${conversion.text||'—'}</output>
        <small>${conversion.text?`${from.label} → ${to.label}`:'数値を入力してください'}</small>
        <p id="converter-error" role="alert">${conversion.error}</p>
        <button id="copy-result" type="button" ${conversion.text?'':'disabled'}>結果をコピー</button>
      </div>
      ${comparison?`<section class="converter-comparison" aria-live="polite" aria-label="どれくらいかの目安"><div class="comparison-heading"><span aria-hidden="true">◎</span><strong>どれくらい？</strong></div><p>${comparison.description}</p><div class="comparison-scale" role="img" aria-label="${comparison.referenceLabel}に対して、およそ${Math.round(comparison.percent)}パーセントの大きさ"><span style="width:${comparison.percent}%"></span></div><small>${comparison.referenceLabel}</small></section>`:''}
      <p class="converter-status" role="status" aria-live="polite">${status}</p>
    </section>
    <aside class="converter-note"><strong>単位のメモ</strong><p>データ容量の KB・MB は1000倍、KiB・MiB は1024倍です。体積の海外単位は米国式（US）で計算します。</p></aside>
  </main>${footer('../','入力した数値は保存・送信されません。')}`
  root.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>{
    categoryId=button.dataset.category
    const units=category().units
    fromId=units[0].id;toId=units[1]?.id||units[0].id
    draw({focus:true})
  })
  const inputElement=root.querySelector('#converter-input')
  inputElement.oninput=event=>{input=event.target.value;draw({focus:true})}
  root.querySelector('#from-unit').onchange=event=>{fromId=event.target.value;draw()}
  root.querySelector('#to-unit').onchange=event=>{toId=event.target.value;draw()}
  root.querySelector('#swap-units').onclick=()=>{[fromId,toId]=[toId,fromId];if(conversion.text)input=conversion.text;draw({focus:true})}
  root.querySelector('#copy-result').onclick=()=>copyResult(conversion.text)
  if(focus){inputElement.focus();inputElement.setSelectionRange(input.length,input.length)}
}

if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../../sw.js',import.meta.url)).catch(()=>{})
draw()

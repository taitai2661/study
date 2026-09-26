export const COUNTS=[5,10,20], STORAGE_KEY='purinto:state',MAX_SAVED_PER_UNIT=20,MAX_OFFLINE_REVIEWS=3
export const escapeHtml=v=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
export function loadState(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY))||{};return {version:3,lastWorksheetConfig:s.lastWorksheetConfig||null,solvedProblems:Array.isArray(s.solvedProblems)?s.solvedProblems:[]}}catch{return {version:3,lastWorksheetConfig:null,solvedProblems:[]}}}
export const saveState=s=>localStorage.setItem(STORAGE_KEY,JSON.stringify(s))
export function saveSolvedProblems(state,unit,problems,attempts){
  const solvedAt=new Date().toISOString()
  const additions=problems.map((problem,index)=>{
    const answers=attempts.filter(attempt=>attempt.problemId===problem.id)
    const correctAttempt=answers.find(attempt=>attempt.correct)
    return answers.length?{id:`${problem.id}:${Date.now()}:${index}`,unitId:unit.id,grade:unit.grade,unitName:unit.kankenGrade?`漢検${unit.kankenGrade}級・${unit.unit}`:unit.unit,prompt:unit.exercise.prompt,display:problem.display,choices:problem.choices,answer:String(problem.answer),answerFormat:problem.answerFormat||'standard',answers,firstTryCorrect:correctAttempt?.tryNumber===1,solvedAt:new Date(Date.parse(solvedAt)+index).toISOString(),category:unit.category||null,kankenGrade:unit.kankenGrade||null}:null
  }).filter(Boolean)
  const combined=[...additions,...state.solvedProblems]
  const counts=new Map()
  state.solvedProblems=combined.filter(problem=>{
    const count=counts.get(problem.unitId)||0
    counts.set(problem.unitId,count+1)
    return count<MAX_SAVED_PER_UNIT
  })
  return state
}
export const offlineReviews=state=>[...state.solvedProblems].sort((a,b)=>Date.parse(b.solvedAt)-Date.parse(a.solvedAt)).slice(0,MAX_OFFLINE_REVIEWS)
export function answerInputWidth(answer,format='standard'){
  const value=String(answer??'').normalize('NFC')
  const parts=format==='fraction'?value.split(/[／/]/):[value]
  const characters=Math.max(1,...parts.map(part=>[...part].length))
  const [minimum,perCharacter,maximum]=format==='fraction'?[126,34,240]:['expression','multiple'].includes(format)?[300,24,480]:[145,30,360]
  return Math.min(maximum,Math.max(minimum,minimum+(characters-1)*perCharacter))
}
export function seed(){const v=new Uint32Array(2);crypto.getRandomValues(v);return `${v[0].toString(36)}-${v[1].toString(36)}`}
function rng(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return()=>{h|=0;h=h+0x6d2b79f5|0;let r=Math.imul(h^h>>>15,1|h);r=r+Math.imul(r^r>>>7,61|r)^r;return((r^r>>>14)>>>0)/4294967296}}
const pick=(r,a)=>a[Math.floor(r()*a.length)], between=(r,a,b)=>a+Math.floor(r()*(b-a+1))
const shuffled=(r,items)=>{const pool=[...items];for(let index=pool.length-1;index>0;index--){const other=Math.floor(r()*(index+1));[pool[index],pool[other]]=[pool[other],pool[index]]}return pool}
function itemsFor(catalog,kind){const items=catalog.filter(item=>item&&item.name&&item.counter&&item.increase&&item.decrease&&Array.isArray(item.kinds)&&item.kinds.includes(kind));if(items.length<(kind==='pictograph'?3:2))throw new Error(`問題用アイテムが足りません: ${kind}`);return items}
const itemKey=item=>item.id||item.name||item.word||item.question||item.prompt||`${item.character||''}:${item.reading||''}:${item.example||''}`
function pickDifferent(r,items,previous){const candidates=items.filter(item=>itemKey(item)!==previous);return pick(r,candidates.length?candidates:items)}
function pickDistinct(r,items,count,previous){const pool=[...items],chosen=[];while(chosen.length<count){const candidates=chosen.length===0&&previous?pool.filter(item=>item.name!==previous):pool;const item=pick(r,candidates.length?candidates:pool);chosen.push(item);pool.splice(pool.indexOf(item),1)}return chosen}
function visual(n){return `<span class="count-visual" aria-label="${n}こ">${'<span class="count-dot" aria-hidden="true"></span>'.repeat(n)}</span>`}
const answerBox=()=>'<span class="answer-box" aria-label="答えを書く欄" role="img"></span>'
const answerFormatFor=kind=>{
  if(['fractionAdd','fractionAddUnlike','fractionMultiply','fractionDivide','probabilityBasic','relativeFrequency'].includes(kind))return'fraction'
  if(kind.startsWith('hs'))return'expression'
  if(['linearExpression','linearEquation','simultaneousEquations','expressionCalculation','linearFunction','squareRoot','expandFactor','quadraticEquation','quadraticFunction','hsLinear','hsQuadratic','hsExpand','hsComplex','hsCoordinate','hsLog','hsDifferentiation','hsIntegration'].includes(kind))return kind==='quadraticEquation'||kind==='simultaneousEquations'?'multiple':'expression'
  return'standard'
}
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a)
const fraction=(n,d)=>{const g=gcd(n,d),numerator=n/g,denominator=d/g;return denominator===1?String(numerator):`${numerator}/${denominator}`}
const squareRoot=(value)=>{for(let factor=Math.floor(Math.sqrt(value));factor>1;factor--)if(value%(factor*factor)===0){const remainder=value/(factor*factor);return remainder===1?String(factor):`${factor}√${remainder}`}return `√${value}`}
const formatComplex=(real,imaginary)=>{
  if(imaginary===0)return String(real)
  if(real===0)return imaginary===1?'i':imaginary===-1?'−i':`${imaginary}i`
  const imaginaryPart=Math.abs(imaginary)===1?'i':`${Math.abs(imaginary)}i`
  return `${real}${imaginary<0?'−':'＋'}${imaginaryPart}`
}
const normalizeFractionCoefficients=answer=>answer
  .replace(/(^|[+-])(\d+)\/(\d+)x([²³])/g,(_,sign,n,d,power)=>`${sign}${fraction(Number(n),Number(d))}x${power}`)
  .replace(/(^|[+-])(\d+)x([²³])\/(\d+)/g,(_,sign,n,power,d)=>`${sign}${fraction(Number(n),Number(d))}x${power}`)
export function normalizeAnswer(value){
  let answer=String(value).trim().replace(/²/g,'^2').replace(/³/g,'^3').normalize('NFKC')
    .replace(/[／]/g,'/').replace(/[×＊·・]/g,'*').replace(/[−－–—]/g,'-')
    .replace(/√\s*\(?(\d+)\)?/g,'√$1').replace(/\bsqrt\(?(\d+)\)?/gi,'√$1')
    .replace(/\s+/g,'').replace(/[，、;]/g,',').replace(/\^2/g,'²').replace(/\^3/g,'³')
    .replace(/^0+(?=\d)/,'')
  answer=normalizeFractionCoefficients(answer)
  if(answer.includes(',')){
    const parts=answer.split(',').filter(Boolean).map(part=>part.replace(/^[xy]=/i,''))
    if(parts.length>1)return parts.sort((a,b)=>Number(a)-Number(b)||a.localeCompare(b,'ja')).join(',')
  }
  return answer.replace(/^x=/i,'')
}
export function qrSvg(text,label='QRコード'){
  const bytes=[...new TextEncoder().encode(text)]
  const size=37,dataCodewords=108,eccCodewords=26
  if(bytes.length>dataCodewords-2)return ''
  const bits=[]
  const append=(value,length)=>{for(let i=length-1;i>=0;i--)bits.push(value>>>i&1)}
  append(4,4);append(bytes.length,8);bytes.forEach(byte=>append(byte,8));append(0,Math.min(4,dataCodewords*8-bits.length))
  while(bits.length%8)bits.push(0)
  const data=[]
  for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((sum,bit)=>(sum<<1)|bit,0))
  for(let pad=0;data.length<dataCodewords;pad^=1)data.push(pad?0x11:0xec)
  const gfExp=Array(512),gfLog=Array(256);let x=1
  for(let i=0;i<255;i++){gfExp[i]=x;gfLog[x]=i;x<<=1;if(x&0x100)x^=0x11d}
  for(let i=255;i<512;i++)gfExp[i]=gfExp[i-255]
  const mul=(a,b)=>a&&b?gfExp[gfLog[a]+gfLog[b]]:0
  let gen=[1]
  for(let i=0;i<eccCodewords;i++){
    const next=Array(gen.length+1).fill(0)
    gen.forEach((coef,index)=>{next[index]^=mul(coef,gfExp[i]);next[index+1]^=coef})
    gen=next
  }
  const ecc=Array(eccCodewords).fill(0)
  for(const byte of data){
    const factor=byte^ecc.shift()
    ecc.push(0)
    gen.slice(1).forEach((coef,index)=>{ecc[index]^=mul(coef,factor)})
  }
  const codewords=[...data,...ecc]
  const modules=Array.from({length:size},()=>Array(size).fill(null))
  const reserved=Array.from({length:size},()=>Array(size).fill(false))
  const set=(row,col,dark,reserve=true)=>{if(row>=0&&row<size&&col>=0&&col<size){modules[row][col]=dark;if(reserve)reserved[row][col]=true}}
  const finder=(row,col)=>{
    for(let y=-1;y<=7;y++)for(let z=-1;z<=7;z++){
      const dark=y>=0&&y<=6&&z>=0&&z<=6&&(y===0||y===6||z===0||z===6||(y>=2&&y<=4&&z>=2&&z<=4))
      set(row+y,col+z,dark)
    }
  }
  finder(0,0);finder(0,size-7);finder(size-7,0)
  for(let i=8;i<size-8;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  for(const row of [6,30])for(const col of [6,30]){
    if(reserved[row][col])continue
    for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++)set(row+y,col+z,Math.max(Math.abs(y),Math.abs(z))!==1)
  }
  set(size-8,8,true)
  for(let i=0;i<9;i++){reserved[8][i]=true;reserved[i][8]=true;reserved[8][size-1-i]=true;reserved[size-1-i][8]=true}
  const dataBits=codewords.flatMap(byte=>Array.from({length:8},(_,i)=>byte>>>(7-i)&1))
  let bitIndex=0,up=true
  for(let col=size-1;col>0;col-=2){
    if(col===6)col--
    for(let step=0;step<size;step++){
      const row=up?size-1-step:step
      for(let offset=0;offset<2;offset++){
        const c=col-offset
        if(reserved[row][c])continue
        const bit=bitIndex<dataBits.length?dataBits[bitIndex++]:0
        modules[row][c]=Boolean(bit^((row+c)%2===0))
      }
    }
    up=!up
  }
  const format=0b111011111000100
  const coordsA=[[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]]
  const coordsB=[[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],[8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]]
  // QR format information is written most-significant bit first.  Writing it
  // backwards makes the finder patterns look valid while leaving scanners
  // unable to determine the data mask used for the rest of the symbol.
  coordsA.forEach(([row,col],index)=>set(row,col,Boolean(format>>>(14-index)&1)))
  coordsB.forEach(([row,col],index)=>set(row,col,Boolean(format>>>(14-index)&1)))
  const rects=[]
  modules.forEach((row,y)=>row.forEach((dark,col)=>{if(dark)rects.push(`<rect x="${col+4}" y="${y+4}" width="1" height="1"/>`)}))
  return `<svg class="answer-qr-code" viewBox="0 0 ${size+8} ${size+8}" role="img" aria-label="${escapeHtml(label)}"><path fill="#fff" d="M0 0h${size+8}v${size+8}H0z"/><g fill="#111">${rects.join('')}</g></svg>`
}
export function makeProblems(unit,count,seedValue,itemCatalog=[],presentation={}){const r=rng(`${unit.id}:${seedValue}`), ex=unit.exercise, out=[];let previousItem='';const lowGrade=Boolean(presentation.lowGrade);const itemKinds=['kanjiReading','kanjiWriting','vocabMeaning','vocabUsage','wordRelation','homophone','kankenChoice','knowledgeChoice'];const itemPool=itemKinds.includes(ex.kind||'')?shuffled(r,Array.isArray(ex.items)?ex.items:[]):null;for(let i=0;i<count;i++){let a,b,answer,display,choices=[];const k=ex.kind||''
  if(['kanjiReading','kanjiWriting','vocabMeaning','vocabUsage','wordRelation','homophone','kankenChoice','knowledgeChoice'].includes(k)){
    const entries=itemPool||[]
    if(!entries.length)throw new Error(`国語問題用データがありません: ${unit.id}`)
    const item=entries[i%entries.length];previousItem=itemKey(item)
    if(k==='knowledgeChoice'){
      answer=item.answer;display=escapeHtml(item.question);choices=[item.answer,...(item.distractors||[])].slice(0,3)
    }else if(k==='kanjiReading'){
      if(item.character&&item.example){
        const example=escapeHtml(item.example).replaceAll(escapeHtml(item.character),`<mark class="kokugo-target">${escapeHtml(item.character)}</mark>`)
        answer=item.reading;display=`<span class="kokugo-word">${example}</span> の「${escapeHtml(item.character)}」の読みを書きましょう。`
      }else{answer=item.reading;display=`<span class="kokugo-word">${escapeHtml(item.word)}</span> の読みを書きましょう。`}
    }else if(k==='kanjiWriting'){
      if(item.character&&item.example){
        answer=item.character;display=`「${escapeHtml(item.example).replaceAll(escapeHtml(item.character),'□')}」の「${escapeHtml(item.prompt||item.reading)}」を漢字で書きましょう。`
      }else{answer=item.word;display=`${escapeHtml(item.prompt||item.reading)} を漢字で書きましょう。`}
    }else if(k==='vocabMeaning'){
      answer=item.meaning;display=`<span class="kokugo-word">${escapeHtml(item.word)}</span> の意味として、もっとも近いものをえらびましょう。`;choices=[item.meaning,...(item.distractors||[])].slice(0,3)
    }else if(k==='vocabUsage'){
      answer=item.example;display=`<span class="kokugo-word">${escapeHtml(item.word)}</span> を正しく使っている文をえらびましょう。`;choices=[item.example,...(item.distractors||[])].slice(0,3)
    }else if(k==='wordRelation'){
      answer=item.answer;display=`<span class="kokugo-word">${escapeHtml(item.word)}</span> の${escapeHtml(item.label||'反対の意味の言葉')}をえらびましょう。`;choices=[item.answer,...(item.distractors||[])].slice(0,3)
    }else if(k==='kankenChoice'){
      answer=item.answer;display=escapeHtml(item.prompt);choices=[item.answer,...(item.distractors||[])].slice(0,3)
    }else{
      answer=item.answer;display=`「${escapeHtml(item.prompt)}」に合う漢字をえらびましょう。`;choices=[item.answer,...(item.distractors||[])].slice(0,3)
    }
  }
  else if(k==='add'||k==='addCarry'){do{a=between(r,k==='addCarry'?2:1,9);b=between(r,k==='addCarry'?2:1,9)}while(k==='add'?a+b>10:a+b<=10);answer=a+b;display=`${a} ＋ ${b} ＝ ${answerBox()}`}
  else if(k==='add2'||k==='add3'){const max=k==='add2'?89:899;a=between(r,k==='add2'?11:101,max);b=between(r,11,max-a);answer=a+b;display=`${a} ＋ ${b} ＝ ${answerBox()}`}
  else if(k==='subtract'||k==='subtractBorrow'){do{a=between(r,k==='subtractBorrow'?11:2,ex.max||10);b=between(r,1,9)}while(b>=a||(k==='subtractBorrow'&&a-b>9));answer=a-b;display=`${a} − ${b} ＝ ${answerBox()}`}
  else if(k==='subtract2'){a=between(r,30,99);b=between(r,11,a-1);answer=a-b;display=`${a} − ${b} ＝ ${answerBox()}`}
  else if(k==='multiply'){a=between(r,1,9);b=between(r,1,9);answer=a*b;display=`${a} × ${b} ＝ ${answerBox()}`}
  else if(k==='multiply2'){a=between(r,11,49);b=between(r,2,9);answer=a*b;display=`${a} × ${b} ＝ ${answerBox()}`}
  else if(k==='divide'){b=between(r,2,9);answer=between(r,2,9);a=b*answer;display=`${a} ÷ ${b} ＝ ${answerBox()}`}
  else if(k==='complement10'){a=between(r,1,9);answer=10-a;display=`${a}と${answerBox()}で10`}
  else if(k==='split'){a=between(r,2,10);b=between(r,1,a-1);answer=a-b;display=`${a}は、${b}と${answerBox()}`}
  else if(k==='countTens'){answer=between(r,11,100);const tens=Math.floor(answer/10),ones=answer%10;display=`10が${tens}こ、1が${ones}こで${answerBox()}`}
  else if(k==='placeValue'){answer=between(r,ex.min,ex.max);const digits=String(answer).split('');const position=pick(r,digits.map((_,j)=>j));const label=['千','百','十','一'][4-digits.length+position];display=`${answer}の${label}の位は${answerBox()}`;answer=Number(digits[position])}
  else if(k==='lengthConvert'){const cm=between(r,2,9);answer=cm*10;display=`${cm} cm ＝ ${answerBox()} mm`}
  else if(k==='lengthConvert3'){const km=between(r,2,9);answer=km*1000;display=`${km} km ＝ ${answerBox()} m`}
  else if(k==='weightConvert'){const kg=between(r,2,9);answer=kg*1000;display=`${kg} kg ＝ ${answerBox()} g`}
  else if(k==='capacityConvert'){const l=between(r,2,9);answer=l*10;display=`${l} L ＝ ${answerBox()} dL`}
  else if(k==='timeElapsed'){a=between(r,1,8);b=pick(r,[10,20,30]);answer=`${a}時${b+20}分`;display=`${a}時${b}分の20分後は ${answerBox()}`}
  else if(k==='money'){const coins=pick(r,[[100,10,10],[100,50,10],[500,100,10]]);answer=coins.reduce((x,y)=>x+y,0);display=`${coins.join('円 ＋ ')}円 ＝ ${answerBox()}円`}
  else if(k==='largeNumber'){answer=between(r,10,99)*1000000+between(r,0,999999);const digits=String(answer);const pos=pick(r,['万','千','百','十']);const divisor={万:10000,千:1000,百:100,十:10}[pos];answer=Math.floor(answer/divisor)%10;display=`${digits} の ${pos} の位の数字は ${answerBox()}`}
  else if(k==='rounding'){a=between(r,1234,9876);answer=Math.round(a/100)*100;display=`${a} を百の位までの概数にすると ${answerBox()}`}
  else if(k==='wholeDivide'){b=between(r,3,9);answer=between(r,12,99);a=b*answer;display=`${a} ÷ ${b} ＝ ${answerBox()}`}
  else if(k==='decimalCalc'){a=between(r,12,99)/10;b=between(r,1,9)/10;answer=Number((a+b).toFixed(1));display=`${a} ＋ ${b} ＝ ${answerBox()}`}
  else if(k==='decimalMultiply'){a=between(r,12,99)/10;b=between(r,2,9);answer=Number((a*b).toFixed(1));display=`${a} × ${b} ＝ ${answerBox()}`}
  else if(k==='decimalDivide'){b=between(r,2,9);answer=between(r,12,49)/10;a=Number((b*answer).toFixed(1));display=`${a} ÷ ${b} ＝ ${answerBox()}`}
  else if(k==='fractionAdd'){const d=pick(r,[4,5,6,8,10]);a=between(r,1,d-2);b=between(r,1,d-a-1);answer=fraction(a+b,d);display=`${a}/${d} ＋ ${b}/${d} ＝ ${answerBox()}`}
  else if(k==='fractionAddUnlike'){const d1=pick(r,[2,3,4,5]),d2=pick(r,[2,3,4,5].filter(x=>x!==d1));a=between(r,1,d1-1);b=between(r,1,d2-1);answer=fraction(a*d2+b*d1,d1*d2);display=`${a}/${d1} ＋ ${b}/${d2} ＝ ${answerBox()}`}
  else if(k==='fractionMultiply'){const d1=pick(r,[2,3,4,5]),d2=pick(r,[2,3,4,5]);a=between(r,1,d1-1);b=between(r,1,d2-1);answer=fraction(a*b,d1*d2);display=`${a}/${d1} × ${b}/${d2} ＝ ${answerBox()}`}
  else if(k==='fractionDivide'){const d1=pick(r,[2,3,4,5]),d2=pick(r,[2,3,4,5]);a=between(r,1,d1-1);b=between(r,1,d2-1);answer=fraction(a*d2,d1*b);display=`${a}/${d1} ÷ ${b}/${d2} ＝ ${answerBox()}`}
  else if(k==='angle'){a=pick(r,[45,60,90,120,135,150]);answer=a;display=`直角は 90° です。${a}° の角の大きさは ${answerBox()}°`}
  else if(k==='areaRectangle'){a=between(r,3,18);b=between(r,2,12);answer=a*b;display=`たて ${a} cm、横 ${b} cm の長方形の面積は ${answerBox()} cm²`}
  else if(k==='areaTriangle'){a=between(r,4,18);b=between(r,2,12);answer=a*b/2;display=`底辺 ${a} cm、高さ ${b} cm の三角形の面積は ${answerBox()} cm²`}
  else if(k==='volumeBox'){a=between(r,2,9);b=between(r,2,9);const c=between(r,2,9);answer=a*b*c;display=`たて ${a} cm、横 ${b} cm、高さ ${c} cm の直方体の体積は ${answerBox()} cm³`}
  else if(k==='circleArea'){a=between(r,2,9);answer=a*a*3.14;display=`半径 ${a} cm の円の面積（円周率は 3.14）は ${answerBox()} cm²`}
  else if(k==='prismVolume'){a=between(r,3,12);b=between(r,2,8);answer=a*b;display=`底面積 ${a} cm²、高さ ${b} cm の角柱の体積は ${answerBox()} cm³`}
  else if(k==='unitConvert'){a=between(r,2,9);answer=a*100;display=`${a} m ＝ ${answerBox()} cm`}
  else if(k==='ratio'){a=between(r,2,9);b=between(r,2,9);answer=`${a}:${b}`;display=`赤 ${a} こ、青 ${b} この比は ${answerBox()}（赤:青）`}
  else if(k==='rate'){a=between(r,2,9);b=between(r,2,9);answer=a*b;display=`1こ ${a} 円の品物を ${b} こ買うと ${answerBox()} 円`}
  else if(k==='speed'){a=between(r,3,12);b=between(r,2,8);answer=a*b;display=`分速 ${a} m で ${b} 分歩くと ${answerBox()} m`}
  else if(k==='average'){const values=[between(r,4,12),between(r,4,12),between(r,4,12)];answer=Math.round(values.reduce((x,y)=>x+y,0)/3);const total=answer*3;values[2]=total-values[0]-values[1];if(values[2]<1){values[0]=answer;values[1]=answer;values[2]=answer}display=`${values.join('、')} の平均は ${answerBox()}`}
  else if(k==='proportion'){a=between(r,2,9);b=between(r,2,9);const multiplier=between(r,2,9);answer=b*multiplier;display=`${a} こで ${b} g の品物です。${a*multiplier} こでは ${answerBox()} g`}
  else if(k==='inverseProportion'){a=between(r,2,9);b=between(r,2,9);const onePersonTime=a*b;answer=b;display=`1人で ${onePersonTime} 分かかる仕事を ${a} 人ですると ${answerBox()} 分`}
  else if(k==='formula'){a=between(r,2,12);b=between(r,2,12);answer=a*b;display=`長方形の面積を a×b とします。a=${a}、b=${b} のとき面積は ${answerBox()}`}
  else if(k==='combinations'){a=between(r,2,4);b=between(r,2,4);answer=a*b;display=`${a} 種類のシャツと ${b} 種類のぼうしがあります。組み合わせは ${answerBox()} 通り`}
  else if(k==='dataRead'){const values=[between(r,4,12),between(r,4,12),between(r,4,12)];answer=Math.max(...values);display=`記録（cm）：${values.join('、')}。いちばん大きい数は ${answerBox()}`}
  else if(k==='shapeChoice'){answer=pick(r,['平行四辺形','ひし形','正方形']);const facts={平行四辺形:'向かい合う2組の辺が平行な四角形',ひし形:'4つの辺の長さが等しい四角形',正方形:'4つの辺が等しく、4つの角が直角の四角形'};display=facts[answer];choices=['平行四辺形','ひし形','正方形']}
  else if(k==='symmetry'){answer=pick(r,['線対称','点対称']);display=answer==='線対称'?'1本の線を折り目にして重なる形です。':'ある点を中心に180°回すと重なる形です。';choices=['線対称','点対称']}
  else if(k==='graphChoice'){const labels=['月','火','水'];const values=[between(r,2,9),between(r,2,9),between(r,2,9)];answer=labels[values.indexOf(Math.max(...values))];display=`<span class="simple-chart">${labels.map((x,j)=>`<span>${x}<i style="width:${values[j]*16}px"></i>${values[j]}</span>`).join('')}</span>`;choices=labels}
  else if(k==='signedNumbers'){a=between(r,-12,12);b=between(r,-12,12);const add=r()>.45;answer=add?a+b:a-b;display=`${a<0?`（${a}）`:a} ${add?'＋':'−'} ${b<0?`（${b}）`:b} ＝ ${answerBox()}`}
  else if(k==='linearExpression'){const coefficient=between(r,2,8),constant=between(r,-9,9),x=between(r,-5,5);answer=coefficient*x+constant;display=`${coefficient}x ${constant<0?'−':'＋'} ${Math.abs(constant)} に x＝${x} を代入すると ${answerBox()}`}
  else if(k==='linearEquation'){const solution=between(r,-9,9),coefficient=between(r,2,8),constant=between(r,-9,9),right=coefficient*solution+constant;answer=solution;display=`${coefficient}x ${constant<0?'−':'＋'} ${Math.abs(constant)} ＝ ${right} の解は x＝${answerBox()}`}
  else if(k==='juniorProportion'){const coefficient=between(r,2,8)*(r()>.35?1:-1),x=between(r,-5,5)||2;answer=coefficient*x;display=`y は x に比例し、比例定数は ${coefficient} です。x＝${x} のとき y＝${answerBox()}`}
  else if(k==='planeGeometry'){a=pick(r,[35,40,45,50,55,60,65,70]);answer=180-a;display=`<svg class="math-diagram" viewBox="0 0 240 120" role="img" aria-label="一直線上の隣り合う角"><path d="M20 95H220M120 95L185 25" fill="none" stroke="currentColor" stroke-width="3"/><text x="145" y="82">${a}°</text><text x="70" y="82">x°</text></svg>一直線上の角 x は ${answerBox()}°`}
  else if(k==='solidGeometry'){a=between(r,2,8);b=between(r,2,8);const c=between(r,2,8);answer=a*b*c;display=`<span class="solid-measure">縦 ${a} cm、横 ${b} cm、高さ ${c} cm の直方体</span><br>体積は ${answerBox()} cm³`}
  else if(k==='dataDistribution'){const values=Array.from({length:5},()=>between(r,2,18)).sort((x,y)=>x-y);answer=values[2];display=`データ ${values.join('、')} の中央値は ${answerBox()}`}
  else if(k==='relativeFrequency'){const total=pick(r,[10,20]),target=pick(r,[2,4,5,8]);answer=fraction(target,total);display=`${total} 回のうち ${target} 回起こりました。相対度数は ${answerBox()}`}
  else if(k==='expressionCalculation'){const p=between(r,2,7),q=between(r,-6,6),s=between(r,2,7),t=between(r,-6,6);answer=`${p+s}x${q+t===0?'':q+t>0?`+${q+t}`:q+t}`;display=`（${p}x ${q<0?'−':'＋'} ${Math.abs(q)}）＋（${s}x ${t<0?'−':'＋'} ${Math.abs(t)}）を簡単にすると ${answerBox()}`}
  else if(k==='simultaneousEquations'){const x=between(r,-5,5),y=between(r,-5,5),sum=x+y,diff=x-y;answer=`${x},${y}`;display=`連立方程式 x＋y＝${sum}、x−y＝${diff} の解を x, y の順に書くと ${answerBox()}`}
  else if(k==='linearFunction'){const slope=between(r,-5,5)||2,intercept=between(r,-6,6),x=between(r,-4,4);answer=slope*x+intercept;display=`y＝${slope}x ${intercept<0?'−':'＋'} ${Math.abs(intercept)} で、x＝${x} のとき y＝${answerBox()}`}
  else if(k==='congruence'){answer=pick(r,['3組の辺','2組の辺とその間の角','1組の辺とその両端の角']);display='三角形の合同条件として正しいものを選びなさい。';choices=[answer,...shuffled(r,['2組の辺とその間でない角','1組の辺と1つの角','3つの角']).slice(0,2)]}
  else if(k==='triangleProperties'){a=pick(r,[30,35,40,45,50,55,60,65,70]);answer=(180-a)/2;display=`二等辺三角形の頂角が ${a}° のとき、底角の大きさは ${answerBox()}°`}
  else if(k==='probabilityBasic'){const red=between(r,1,5),blue=between(r,1,5);answer=fraction(red,red+blue);display=`赤玉 ${red} 個、青玉 ${blue} 個から1個取り出すとき、赤玉の確率は ${answerBox()}`}
  else if(k==='quartileBoxplot'){const values=Array.from({length:8},()=>between(r,1,20)).sort((x,y)=>x-y);const targets=[['中央値',(values[3]+values[4])/2],['第1四分位数',(values[1]+values[2])/2],['第3四分位数',(values[5]+values[6])/2]];const [label,result]=targets[i%targets.length];answer=result;display=`データ ${values.join('、')} の${label}は ${answerBox()}`}
  else if(k==='squareRoot'){a=pick(r,[2,3,5,6,7,10,11,13]);const multiplier=between(r,2,6);answer=`${multiplier}√${a}`;display=`√${multiplier*multiplier*a} を簡単にすると ${answerBox()}`}
  else if(k==='expandFactor'){const m=between(r,1,7),n=between(r,1,7);if(r()>.5){answer=`x²+${m+n}x+${m*n}`;display=`(x＋${m})(x＋${n}) を展開すると ${answerBox()}`}else{answer=`(x+${m})(x+${n})`;display=`x²＋${m+n}x＋${m*n} を因数分解すると ${answerBox()}`}}
  else if(k==='quadraticEquation'){const root1=between(r,-6,1),root2=between(r,2,7),sum=root1+root2,product=root1*root2;answer=`${root1},${root2}`;display=`x² ${-sum<0?'−':'＋'} ${Math.abs(sum)}x ${product<0?'−':'＋'} ${Math.abs(product)}＝0 の解を小さい順に書くと ${answerBox()}`}
  else if(k==='quadraticFunction'){const coefficient=between(r,1,5),x=between(r,-5,5);answer=coefficient*x*x;display=`y＝${coefficient}x² で、x＝${x} のとき y＝${answerBox()}`}
  else if(k==='similarity'){const scale=between(r,2,5),side=between(r,2,8);answer=scale*side;display=`相似比が 1：${scale} の相似な図形で、小さい図形の辺が ${side} cm のとき対応する辺は ${answerBox()} cm`}
  else if(k==='circleTheorem'){a=pick(r,[20,25,30,35,40,45,50,55,60]);answer=a*2;display=`円周角が ${a}° のとき、同じ弧に対する中心角は ${answerBox()}°`}
  else if(k==='pythagorean'){const triple=pick(r,[[3,4,5],[5,12,13],[6,8,10],[8,15,17]]);answer=triple[2];display=`直角をはさむ2辺が ${triple[0]} cm、${triple[1]} cm の直角三角形の斜辺は ${answerBox()} cm`}
  else if(k==='sampling'){const sample=pick(r,[50,100,200]),marked=between(r,Math.max(2,sample/10),Math.floor(sample/2)),population=pick(r,[500,1000]);answer=Math.round(population*marked/sample);display=`${population} 個から無作為に ${sample} 個を調べ、${marked} 個が条件に当てはまりました。全体では約 ${answerBox()} 個と推定できます。`}
  else if(k==='hsRealNumbers'){const mode=i%3;if(mode===0){a=pick(r,[2,3,5,6,7]);b=between(r,2,5);answer=`${b}√${a}`;display=`√${b*b*a} を簡単にすると ${answerBox()}`}else if(mode===1){a=between(r,2,6);b=between(r,-8,8);const x=between(r,-4,6),constant=b===0?'':b<0?` − ${Math.abs(b)}`:` ＋ ${b}`;answer=x;display=`${a}x${constant} ＞ ${a*x+b} を解くと x ＞ ${answerBox()}`}else{a=between(r,2,9);b=between(r,2,9);answer=fraction(a,b);display=`${a} ÷ ${b} を分数で表すと ${answerBox()}`}}
  else if(k==='hsSetProposition'){const mode=i%3;if(mode===0){const universal=between(r,10,18),a=between(r,3,universal-3),b=between(r,3,universal-3),common=between(r,Math.max(0,a+b-universal),Math.min(a,b));answer=a+b-common;display=`全体集合 U の要素数は ${universal}、A は ${a}、B は ${b}、A∩B は ${common}。A∪B の要素数は ${answerBox()}`}else if(mode===1){const universal=between(r,10,20),a=between(r,2,universal-2);answer=universal-a;display=`全体集合 U の要素数が ${universal}、A の要素数が ${a} のとき、補集合 Aᶜ の要素数は ${answerBox()}`}else{answer='必要条件';display='「x が4の倍数である」ことは「x が2の倍数である」ことの何条件ですか。';choices=['必要条件','十分条件','必要十分条件']}}
  else if(k==='hsQuadraticFunction'){const mode=i%3,p=between(r,-5,5),q=between(r,-8,8),a=between(r,1,4),inside=p===0?'':p<0?`＋ ${Math.abs(p)}`:`− ${p}`,constant=q===0?'':q<0?`− ${Math.abs(q)}`:`＋ ${q}`;if(mode===0){answer=q;display=`y＝${a}(x${inside})²${constant} の最小値は ${answerBox()}`}else if(mode===1){answer=-p;display=`y＝${a}(x${inside})²${constant} の軸は x＝${answerBox()}`}else{const x=between(r,-4,4);answer=a*(x+p)**2+q;display=`y＝${a}(x${inside})²${constant} で、x＝${x} のとき y＝${answerBox()}`}}
  else if(k==='hsTrigonometry'){const mode=i%3,angle=pick(r,[30,45,60]);if(mode===0){answer=angle===30?'1/2':angle===45?'√2/2':'√3/2';display=`sin ${angle}° ＝ ${answerBox()}`}else if(mode===1){const hyp=pick(r,[10,14,20]);answer=angle===30?hyp/2:angle===45?`${hyp/2}√2`:`${hyp/2}√3`;display=`斜辺が ${hyp} の直角三角形で、1つの鋭角が ${angle}°です。その角の向かいの辺は ${answerBox()}`}else{const side=pick(r,[4,5,6]),other=pick(r,[7,8,9]);answer=squareRoot(side**2+other**2);display=`直角をはさむ2辺が ${side}、${other} の直角三角形の斜辺は ${answerBox()}`}}
  else if(k==='hsDataAnalysis'){const mode=i%3,values=[2,4,6,8,10];if(mode===0){answer=6;display=`データ ${values.join('、')} の平均値は ${answerBox()}`}else if(mode===1){answer=8;display=`データ ${values.join('、')} の分散は ${answerBox()}`}else{answer='正の相関';display='気温が高いほどアイスの売上が増える傾向は、何の相関ですか。';choices=['正の相関','負の相関','相関がない']}}
  else if(k==='hsCounting'){const mode=i%3,n=pick(r,[4,5,6]),m=pick(r,[2,3]);const fact=x=>Array.from({length:x},(_,j)=>j+1).reduce((p,x)=>p*x,1);if(mode===0){answer=fact(n)/fact(n-m);display=`${n} 人から ${m} 人を順に選ぶ方法は ${answerBox()} 通り`}else if(mode===1){answer=fact(n)/(fact(m)*fact(n-m));display=`${n} 人から ${m} 人を選ぶ組合せは ${answerBox()} 通り`}else{a=between(r,2,5);b=between(r,2,5);answer=a*b;display=`${a} 種類の上着と ${b} 種類の帽子の組合せは ${answerBox()} 通り`}}
  else if(k==='hsProbability'){const mode=i%3;if(mode===0){a=between(r,1,5);b=between(r,1,6);answer=fraction(a,a+b);display=`赤玉 ${a} 個、青玉 ${b} 個から1個取るとき、赤玉の確率は ${answerBox()}`}else if(mode===1){a=between(r,1,5);b=between(r,1,5);answer=fraction(a*b,36);display=`2個の6面サイコロを振るとき、1個目が ${a} 以下、2個目が ${b} 以下となる確率は ${answerBox()}`}else{a=between(r,2,5);b=between(r,1,a-1);answer=fraction(b,a);display=`箱にある ${a} 枚のカードのうち ${b} 枚が当たりです。1枚引いて当たる確率は ${answerBox()}`}}
  else if(k==='hsGeometry'){const mode=i%3;if(mode===0){a=pick(r,[20,25,30,35,40]);answer=180-a*2;display=`三角形の2つの内角が ${a}° と ${a}° のとき、残りの内角は ${answerBox()}°`}else if(mode===1){a=pick(r,[20,30,40,50]);answer=a*2;display=`円周角が ${a}° のとき、同じ弧に対する中心角は ${answerBox()}°`}else{a=pick(r,[3,5,6]);b=pick(r,[4,8,8]);answer=squareRoot(a*a+b*b);display=`2辺が ${a}、${b} で、その間の角が90°の三角形の残りの辺は ${answerBox()}`}}
  else if(k==='hsIntegerProperties'){const mode=i%3,a=between(r,12,30),b=between(r,6,18);if(mode===0){answer=gcd(a,b);display=`${a} と ${b} の最大公約数は ${answerBox()}`}else if(mode===1){answer=Math.abs(a*b)/gcd(a,b);display=`${a} と ${b} の最小公倍数は ${answerBox()}`}else{const divisor=pick(r,[3,4,5,6]),remainder=between(r,0,divisor-1),quotient=between(r,3,9);answer=quotient*divisor+remainder;display=`${answer} を ${divisor} で割った余りは ${answerBox()}`}}
  else if(k==='hsExpressionProof'){const mode=i%3,a=between(r,2,7),b=between(r,2,7);if(mode===0){answer=`x²+${a+b}x+${a*b}`;display=`(x＋${a})(x＋${b}) を展開すると ${answerBox()}`}else if(mode===1){answer=`(x+${a})(x+${b})`;display=`x²＋${a+b}x＋${a*b} を因数分解すると ${answerBox()}`}else{const n=pick(r,[4,5,6]);answer=n*(n-1)/2;display=`(a＋b)^${n} の展開で a^${n-2}b² の係数は ${answerBox()}`}}
  else if(k==='hsComplexQuadratic'){const mode=i%3,a=between(r,-4,4),b=between(r,-4,4),c=between(r,-4,4),d=between(r,-4,4);if(mode===0){answer=formatComplex(a+c,b+d);display=`(${formatComplex(a,b)})＋(${formatComplex(c,d)}) ＝ ${answerBox()}`}else if(mode===1){answer=formatComplex(a*c-b*d,a*d+b*c);display=`(${formatComplex(a,b)})(${formatComplex(c,d)}) ＝ ${answerBox()}`}else{const root=pick(r,[2,3,4]);answer=`${root}i,−${root}i`;display=`x²＋${root*root}＝0 の解を x の順に書くと ${answerBox()}`}}
  else if(k==='hsCoordinateCircle'){const mode=i%3,slope=between(r,-5,5)||2,intercept=between(r,-6,6);const constant=intercept===0?'':intercept<0?`−${Math.abs(intercept)}`:`+${intercept}`;if(mode===0){const x=between(r,-4,4);answer=slope*x+intercept;display=`直線 y＝${slope}x${constant} 上で、x＝${x} のとき y＝${answerBox()}`}else if(mode===1){answer=slope;display=`点 (0, ${intercept}) と (1, ${slope+intercept}) を通る直線の傾きは ${answerBox()}`}else{const radius=between(r,2,8);answer=radius;display=`円 x²＋y²＝${radius*radius} の半径は ${answerBox()}`}}
  else if(k==='hsExponentialLogarithm'){const mode=i%3,base=pick(r,[2,3,5]),power=between(r,2,5);if(mode===0){answer=power;display=`log${base} ${base**power} ＝ ${answerBox()}`}else if(mode===1){answer=power;display=`${base}^x＝${base**power} を満たす x は ${answerBox()}`}else{answer=power+1;display=`log${base} ${base**power}＋log${base} ${base} ＝ ${answerBox()}`}}
  else if(k==='hsTrigonometricFunctions'){const mode=i%3;if(mode===0){answer='1';display=`sin(30°＋60°) ＝ ${answerBox()}`}else if(mode===1){answer='0';display=`cos 90° ＝ ${answerBox()}`}else{answer='−1';display=`sin 270° ＝ ${answerBox()}`}}
  else if(k==='hsCalculusIntro'){const mode=i%3,a=between(r,2,7),b=between(r,1,6);if(mode===0){answer=`${2*a}x+${b}`;display=`f(x)＝${a}x²＋${b}x の導関数 f'(x) は ${answerBox()}`}else if(mode===1){const x=between(r,-3,3);answer=2*a*x+b;display=`f(x)＝${a}x²＋${b}x の x＝${x} における接線の傾きは ${answerBox()}`}else{answer=`${a}x²`;display=`∫${2*a}x dx ＝ ${answerBox()}＋C`}}
  else if(k==='hsSequences'){const mode=i%3,first=between(r,1,8),difference=between(r,2,6),n=between(r,4,8);if(mode===0){answer=first+(n-1)*difference;display=`初項 ${first}、公差 ${difference} の等差数列の第 ${n} 項は ${answerBox()}`}else if(mode===1){const ratio=pick(r,[2,3]);answer=first*ratio**(n-1);display=`初項 ${first}、公比 ${ratio} の等比数列の第 ${n} 項は ${answerBox()}`}else{answer=n*(2*first+(n-1)*difference)/2;display=`初項 ${first}、公差 ${difference} の等差数列の初めの ${n} 項の和は ${answerBox()}`}}
  else if(k==='hsStatisticalInference'){const mode=i%3;if(mode===0){const population=pick(r,[500,1000]),sample=pick(r,[50,100]),hit=between(r,10,Math.floor(sample/2));answer=population*hit/sample;display=`${population} 個から無作為に ${sample} 個を調べ、${hit} 個が条件に当てはまりました。全体の推定個数は ${answerBox()}`}else if(mode===1){const hit=between(r,20,80);answer=hit/100;display=`無作為標本100人のうち ${hit} 人が賛成でした。母比率の点推定値は ${answerBox()}`}else{answer='無作為抽出';display='母集団を推定するために、偏りを減らす抽出方法はどれですか。';choices=['無作為抽出','都合のよい人だけを選ぶ','回答しやすい人だけを選ぶ']}}
  else if(k==='hsVectors'){const mode=i%3,x1=between(r,-4,4),y1=between(r,-4,4),x2=between(r,-4,4),y2=between(r,-4,4);if(mode===0){answer=x1*x2+y1*y2;display=`a＝(${x1}, ${y1})、b＝(${x2}, ${y2}) のとき、a・b＝${answerBox()}`}else if(mode===1){answer=`${x1+x2},${y1+y2}`;display=`a＝(${x1}, ${y1})、b＝(${x2}, ${y2}) のとき、a＋b＝(${answerBox()})`}else{const p=pick(r,[[3,4],[5,12],[6,8]]);answer=p[1];display=`ベクトル a＝(${p[0]}, ${p[1]}) の y 成分は ${answerBox()}`}}
  else if(k==='hsCurves'){const mode=i%3;if(mode===0){const x=between(r,-4,4);answer=x*x;display=`放物線 y＝x² 上で、x＝${x} のとき y＝${answerBox()}`}else if(mode===1){answer='(3, 0)';display='楕円 x²/9＋y²/4＝1 上にある点はどれですか。';choices=['(3, 0)','(3, 2)','(0, 3)']}else{const x=pick(r,[2,3,4]);answer=1/x;display=`双曲線 y＝1/x 上で、x＝${x} のとき y＝${answerBox()}`}}
  else if(k==='hsComplexPlane'){const mode=i%3,a=between(r,-4,4),b=between(r,-4,4);if(mode===0){answer=a*a+b*b;display=`複素数 z＝${formatComplex(a,b)} の絶対値の2乗 |z|² は ${answerBox()}`}else if(mode===1){answer=`${-b},${a}`;display=`複素数 z＝${formatComplex(a,b)} に i を掛けた iz の座標は (${answerBox()})`}else{answer='虚軸';display='複素数平面で、純虚数が並ぶ軸はどれですか。';choices=['虚軸','実軸','原点']}}
  else if(k==='hsLimits'){const mode=i%3,n=between(r,2,9);if(mode===0){answer=2*n;display=`lim x→${n} (x²−${n*n})/(x−${n}) ＝ ${answerBox()}`}else if(mode===1){answer=1;display=`lim x→∞ (3x²＋1)/(3x²−2x) ＝ ${answerBox()}`}else{answer=n*n+1;display=`f(x)＝x²＋1 のとき lim x→${n} f(x)＝${answerBox()}`}}
  else if(k==='hsDifferentiation'){const mode=i%3,a=between(r,2,7),b=between(r,1,6);if(mode===0){answer=`${2*a}x+${b}`;display=`f(x)＝${a}x²＋${b}x の導関数 f'(x) は ${answerBox()}`}else if(mode===1){answer=0;display=`f(x)＝${a}x² の極値をとる x は ${answerBox()}`}else{const x=between(r,-3,3);answer=2*a*x+b;display=`f(x)＝${a}x²＋${b}x の x＝${x} における微分係数は ${answerBox()}`}}
  else if(k==='hsIntegration'){const mode=i%3,a=between(r,2,8),b=between(r,1,7);if(mode===0){answer=`${fraction(a,3)}x³+${fraction(b,2)}x²+C`;display=`∫(${a}x²＋${b}x)dx ＝ ${answerBox()}`}else if(mode===1){answer=fraction(a,2);display=`∫0から1まで ${a}x dx ＝ ${answerBox()}`}else{answer=4;display=`y＝x と x軸、x＝0、x＝2 で囲まれた面積は ${answerBox()}`}}
  else if(ex.type==='number'){answer=between(r,ex.min||1,ex.max||10);display=`${visual(answer)}<br><span class="count-answer">${answerBox()}<span class="count-unit">こ</span></span>`}
  else if(k==='compare'){a=between(r,1,10);b=between(r,1,10);if(a===b)b=b===10?9:b+1;answer=a>b?'左':'右';display=`<span class="compare-item"><small>左</small>${visual(a)}</span><span class="compare-item"><small>右</small>${visual(b)}</span>`;choices=['左','右']}
  else if(k==='story'){const item=pickDifferent(r,itemsFor(itemCatalog,k),previousItem);previousItem=item.name;a=between(r,2,9);b=between(r,1,9);const add=r()>.5;answer=add?`${a}＋${b}`:`${a+b}−${b}`;display=add?`${item.name}が${a}${item.counter}あります。<br>${b}${item.counter}${item.increase}。`:`${item.name}が${a+b}${item.counter}あります。<br>${b}${item.counter}${item.decrease}。`;choices=[`${a}＋${b}`,`${a+b}−${b}`,`${a}−${b}`]}
  else if(k==='solid'){answer=pick(r,['はこ','つつ','たま']);display=answer==='はこ'?'サイコロと同じ形':answer==='つつ'?'空きかんと同じ形':'ボールと同じ形';choices=['はこ','つつ','たま']}
  else if(k==='shape'){answer=pick(r,['さんかく','しかく','まる']);display=`<span class="shape ${answer}"></span>`;choices=['さんかく','しかく','まる']}
  else if(k==='composeShape'){answer=pick(r,['大きいさんかく','しかく','長しかく']);const className=answer==='大きいさんかく'?'triangle':answer==='しかく'?'square':'rectangle';display=`<span class="compose-caption">さんかくを2まい合わせました。</span><span class="composition ${className}" aria-label="${answer}を二つの三角形に分けた図"><i></i><i></i></span>`;choices=['大きいさんかく','しかく','長しかく']}
  else if(k==='quantity'){a=between(r,2,9);b=between(r,2,9);if(a===b)b=b===9?8:b+1;answer=a>b?'上':'下';display=`<span class="bar-compare"><span><small>上</small><i style="width:${a*18}px"></i></span><span><small>下</small><i class="second" style="width:${b*18}px"></i></span></span>`;choices=['上','下']}
  else if(k==='clock'){a=between(r,1,12);answer=`${a}時`;display=`<span class="clock" aria-label="${a}時"><i class="hour-hand" style="transform:rotate(${a*30}deg)"></i><b class="minute-hand"></b></span>`;choices=[`${a}時`,`${a===12?1:a+1}時`,`${a===1?12:a-1}時`]}
  else if(k==='fraction'){const denominator=pick(r,[2,3,4]);const numerator=between(r,1,denominator-1);answer=`${numerator}/${denominator}`;display=`1つの形を${denominator}つに同じように分け、そのうち${numerator}つに色をぬりました。`;choices=[answer,...['1/2','1/3','2/3','1/4','3/4'].filter(x=>x!==answer).slice(0,2)]}
  else if(k==='decimal'){answer='0.1';display='1を10こに同じように分けたうちの1こです。';choices=['0.1','1','10']}
  else if(k==='polygon'){answer='三角形';display='辺が3本、頂点が3この形です。';choices=['三角形','四角形','円']}
  else if(k==='circle'){answer='中心を通る線';display='円のまん中を通って、円周の両端を結ぶ線です。';choices=['中心を通る線','半径','円周']}
  else if(k==='triangleType'){answer='3つの辺が同じ長さ';display='3つの辺が同じ長さの三角形です。';choices=['3つの辺が同じ長さ','2つの辺が同じ長さ','辺が4本']}
  else {const items=pickDistinct(r,itemsFor(itemCatalog,'pictograph'),3,previousItem),labels=items.map(item=>item.name);previousItem=labels[0];let vals,m;do{vals=[between(r,2,6),between(r,2,6),between(r,2,6)];m=Math.max(...vals)}while(vals.filter(v=>v===m).length!==1);answer=labels[vals.indexOf(m)];display=labels.map((x,j)=>`${x}　${visual(vals[j])}`).join('<br>');choices=labels}
  // Low-grade wording is authored by the generator where it is pedagogically
  // meaningful.  Do not alter answers: they can be a kanji learning target.
  if(lowGrade&&k==='placeValue')display=display.replace('の位は','の くらいは')
  if(lowGrade&&k==='timeElapsed')display=display.replace('分後は','ふんごは')
  const [printDisplay,answerHint='']=display.split(answerBox())
  const explanation=unit.solution||`答え：${answer}。問題文の条件に対応する公式・計算規則を使います。`
  out.push({id:`${unit.id}:${seedValue}:${i}`,answer,display,printDisplay:printDisplay.trim(),answerHint:answerHint.trim(),answerFormat:answerFormatFor(k),choices:[...new Set(choices)].sort(()=>r()-.5),explanation})}return out}
export function printQuestion(p){const display=p.printDisplay??p.display;return p.choices.length?`${display}<span class="print-choice-list">${p.choices.map((choice,index)=>`<span class="print-choice">${index===0?'（':''}${escapeHtml(choice)}${index===p.choices.length-1?'）':'　・　'}</span>`).join('')}</span>`:display}
export function problemSetSignature(problems){return problems.map(problem=>`${problem.printDisplay||problem.display}|${problem.choices.join('|')}`).join('\n').replace(/<[^>]*>/g,' ').replace(/&[a-z]+;/gi,' ').normalize('NFKC').replace(/\s+/g,' ').trim()}
export function generateUniqueProblemSets({unit,count,itemCatalog=[],presentation={},requested,createSeed=seed,maxAttempts=100}){
  const pages=[],usedSeeds=new Set(),usedSignatures=new Set()
  for(let pageIndex=0;pageIndex<requested;pageIndex++){
    let accepted=null
    for(let attempt=0;attempt<maxAttempts;attempt++){
      const seedValue=createSeed()
      if(usedSeeds.has(seedValue))continue
      const problems=makeProblems(unit,count,seedValue,itemCatalog,presentation)
      const signature=problemSetSignature(problems)
      if(usedSignatures.has(signature))continue
      accepted={seedValue,problems}
      break
    }
    if(!accepted)return {pages,exhausted:true}
    pages.push(accepted)
    usedSeeds.add(accepted.seedValue)
    usedSignatures.add(problemSetSignature(accepted.problems))
  }
  return {pages,exhausted:false}
}
export function answerRows(problems){return problems.map((problem,index)=>{const row={number:index+1,question:printQuestion(problem),answer:String(problem.answer)};if(problem.id.startsWith('hs'))row.explanation=problem.explanation||'';return row})}
export function summary(solvedProblems,units){return units.map(unit=>{const rows=solvedProblems.filter(problem=>problem.unitId===unit.id),attempts=rows.length,correct=rows.filter(problem=>problem.firstTryCorrect).length;return {unit,rows,attempts,correct,last:rows[0]?.solvedAt}})}
/* Unreachable draft branches retained temporarily while the corresponding
   generators are moved into the main problem chain.
  else if(k==='hsGeometry'){const mode=i%3;if(mode===0){a=pick(r,[20,25,30,35,40]);answer=180-a*2;display=`三角形の2つの内角が ${a}° と ${a}° のとき、残りの内角は ${answerBox()}°`}else if(mode===1){a=pick(r,[20,30,40,50]);answer=a*2;display=`円周角が ${a}° のとき、同じ弧に対する中心角は ${answerBox()}°`}else{a=pick(r,[3,5,6]);b=pick(r,[4,8,8]);answer=Math.sqrt(a*a+b*b);display=`2辺が ${a}、${b} で、その間の角が90°の三角形の残りの辺は ${answerBox()}`}}
  else if(k==='hsIntegerProperties'){const mode=i%3,a=between(r,12,30),b=between(r,6,18);if(mode===0){answer=gcd(a,b);display=`${a} と ${b} の最大公約数は ${answerBox()}`}else if(mode===1){answer=Math.abs(a*b)/gcd(a,b);display=`${a} と ${b} の最小公倍数は ${answerBox()}`}else{const divisor=pick(r,[3,4,5,6]),remainder=between(r,0,divisor-1),quotient=between(r,3,9);answer=quotient*divisor+remainder;display=`${answer} を ${divisor} で割った余りは ${answerBox()}`}}
  else if(k==='hsExpressionProof'){const mode=i%3,a=between(r,2,7),b=between(r,2,7);if(mode===0){answer=`x²+${a+b}x+${a*b}`;display=`(x＋${a})(x＋${b}) を展開すると ${answerBox()}`}else if(mode===1){answer=`(x+${a})(x+${b})`;display=`x²＋${a+b}x＋${a*b} を因数分解すると ${answerBox()}`}else{const n=pick(r,[4,5,6]);answer=n*(n-1)/2;display=`(a＋b)${n===2?'²':`^${n}`} の展開で a${n-2===0?'²':`^${n-2}`}b² の係数は ${answerBox()}`}}
  else if(k==='hsComplexQuadratic'){const mode=i%3,a=between(r,-4,4),b=between(r,-4,4),c=between(r,-4,4),d=between(r,-4,4);if(mode===0){answer=formatComplex(a+c,b+d);display=`(${formatComplex(a,b)})＋(${formatComplex(c,d)}) ＝ ${answerBox()}`}else if(mode===1){answer=formatComplex(a*c-b*d,a*d+b*c);display=`(${formatComplex(a,b)})(${formatComplex(c,d)}) ＝ ${answerBox()}`}else{const root=pick(r,[2,3,4]);answer=`${root}i,−${root}i`;display=`x²＋${root*root}＝0 の解を x の順に書くと ${answerBox()}`}}
  else if(k==='hsCoordinateCircle'){const mode=i%3,slope=between(r,-5,5)||2,intercept=between(r,-6,6);const constant=intercept===0?'':intercept<0?`−${Math.abs(intercept)}`:`+${intercept}`;if(mode===0){const x=between(r,-4,4);answer=slope*x+intercept;display=`直線 y＝${slope}x${constant} 上で、x＝${x} のとき y＝${answerBox()}`}else if(mode===1){answer=slope;display=`点 (0, ${intercept}) と (1, ${slope+intercept}) を通る直線の傾きは ${answerBox()}`}else{const radius=between(r,2,8);answer=radius;display=`円 x²＋y²＝${radius*radius} の半径は ${answerBox()}`}}
  else if(k==='hsExponentialLogarithm'){const mode=i%3,base=pick(r,[2,3,5]),power=between(r,2,5);if(mode===0){answer=power;display=`log${base} ${base**power} ＝ ${answerBox()}`}else if(mode===1){answer=power;display=`${base}^x＝${base**power} を満たす x は ${answerBox()}`}else{answer=power+1;display=`log${base} ${base**power}＋log${base} ${base} ＝ ${answerBox()}`}}
  else if(k==='hsTrigonometricFunctions'){const mode=i%3;if(mode===0){answer='1';display=`sin(30°＋60°) ＝ ${answerBox()}`}else if(mode===1){answer='0';display=`cos 90° ＝ ${answerBox()}`}else{answer='−1';display=`sin 270° ＝ ${answerBox()}`}}
  else if(k==='hsCalculusIntro'){const mode=i%3,a=between(r,2,7),b=between(r,1,6);if(mode===0){answer=`${2*a}x+${b}`;display=`f(x)＝${a}x²＋${b}x の導関数 f'(x) は ${answerBox()}`}else if(mode===1){const x=between(r,-3,3);answer=2*a*x+b;display=`f(x)＝${a}x²＋${b}x の x＝${x} における接線の傾きは ${answerBox()}`}else{answer=`${a}x²`;display=`∫${2*a}x dx ＝ ${answerBox()}＋C`}}
  else if(k==='hsSequences'){const mode=i%3,first=between(r,1,8),difference=between(r,2,6),n=between(r,4,8);if(mode===0){answer=first+(n-1)*difference;display=`初項 ${first}、公差 ${difference} の等差数列の第 ${n} 項は ${answerBox()}`}else if(mode===1){const ratio=pick(r,[2,3]);answer=first*ratio**(n-1);display=`初項 ${first}、公比 ${ratio} の等比数列の第 ${n} 項は ${answerBox()}`}else{answer=n*(2*first+(n-1)*difference)/2;display=`初項 ${first}、公差 ${difference} の等差数列の初めの ${n} 項の和は ${answerBox()}`}}
  else if(k==='hsStatisticalInference'){const mode=i%3;if(mode===0){const population=pick(r,[500,1000]),sample=pick(r,[50,100]),hit=between(r,10,Math.floor(sample/2));answer=population*hit/sample;display=`${population} 個から無作為に ${sample} 個を調べ、${hit} 個が条件に当てはまりました。全体の推定個数は ${answerBox()}`}else if(mode===1){const hit=between(r,20,80);answer=hit/100;display=`無作為標本100人のうち ${hit} 人が賛成でした。母比率の点推定値は ${answerBox()}`}else{answer='無作為抽出';display='母集団を推定するために、偏りを減らす抽出方法はどれですか。';choices=['無作為抽出','都合のよい人だけを選ぶ','回答しやすい人だけを選ぶ']}}
  else if(k==='hsVectors'){const mode=i%3,x1=between(r,-4,4),y1=between(r,-4,4),x2=between(r,-4,4),y2=between(r,-4,4);if(mode===0){answer=x1*x2+y1*y2;display=`a＝(${x1}, ${y1})、b＝(${x2}, ${y2}) のとき、a・b＝${answerBox()}`}else if(mode===1){answer=`${x1+x2},${y1+y2}`;display=`a＝(${x1}, ${y1})、b＝(${x2}, ${y2}) のとき、a＋b＝(${answerBox()})`}else{const p=pick(r,[[3,4],[5,12],[6,8]]);answer=p[1];display=`ベクトル a＝(${p[0]}, ${p[1]}) の y 成分は ${answerBox()}`}}
  else if(k==='hsCurves'){const mode=i%3;if(mode===0){const x=between(r,-4,4);answer=x*x;display=`放物線 y＝x² 上で、x＝${x} のとき y＝${answerBox()}`}else if(mode===1){answer='(3, 0)';display='楕円 x²/9＋y²/4＝1 上にある点はどれですか。';choices=['(3, 0)','(3, 2)','(0, 3)']}else{const x=pick(r,[2,3,4]);answer=1/x;display=`双曲線 y＝1/x 上で、x＝${x} のとき y＝${answerBox()}`}}
  else if(k==='hsComplexPlane'){const mode=i%3,a=between(r,-4,4),b=between(r,-4,4);if(mode===0){answer=a*a+b*b;display=`複素数 z＝${formatComplex(a,b)} の絶対値の2乗 |z|² は ${answerBox()}`}else if(mode===1){answer=`${-b},${a}`;display=`複素数 z＝${formatComplex(a,b)} に i を掛けた iz の座標は (${answerBox()})`}else{answer='虚軸';display='複素数平面で、純虚数が並ぶ軸はどれですか。';choices=['虚軸','実軸','原点']}}
  else if(k==='hsLimits'){const mode=i%3,n=between(r,2,9);if(mode===0){answer=2*n;display=`lim x→${n} (x²−${n*n})/(x−${n}) ＝ ${answerBox()}`}else if(mode===1){answer=1;display=`lim x→∞ (3x²＋1)/(3x²−2x) ＝ ${answerBox()}`}else{answer=n*n+1;display=`f(x)＝x²＋1 のとき lim x→${n} f(x)＝${answerBox()}`}}
  else if(k==='hsDifferentiation'){const mode=i%3,a=between(r,2,7),b=between(r,1,6);if(mode===0){answer=`${2*a}x+${b}`;display=`f(x)＝${a}x²＋${b}x の導関数 f'(x) は ${answerBox()}`}else if(mode===1){answer=0;display=`f(x)＝${a}x² の極値をとる x は ${answerBox()}`}else{const x=between(r,-3,3);answer=2*a*x+b;display=`f(x)＝${a}x²＋${b}x の x＝${x} における微分係数は ${answerBox()}`}}
  else if(k==='hsIntegration'){const mode=i%3,a=between(r,2,8),b=between(r,1,7);if(mode===0){answer=`${fraction(a,3)}x³+${fraction(b,2)}x²+C`;display=`∫(${a}x²＋${b}x)dx ＝ ${answerBox()}`}else if(mode===1){answer=a;display=`∫0から1まで ${a}x dx ＝ ${answerBox()}`}else{answer=4;display=`y＝x と x軸、x＝0、x＝2 で囲まれた面積は ${answerBox()}`}}
*/

import assert from 'node:assert/strict'
import {access,readFile} from 'node:fs/promises'
import test from 'node:test'

const index=JSON.parse(await readFile(new URL('../data/units-index.json',import.meta.url),'utf8'))
const curriculumIndex=index.filter(unit=>unit.subject==='算数')
const juniorMathIndex=index.filter(unit=>unit.subject==='数学'&&unit.grade<=9)
const highSchoolMathIndex=index.filter(unit=>unit.subject==='数学'&&unit.grade>=10)
const scienceIndex=index.filter(unit=>unit.subject==='理科')
const kokugoIndex=index.filter(unit=>unit.subject==='国語')
const kankenIndex=index.filter(unit=>unit.subject==='漢検')
const kanjiFacts=JSON.parse(await readFile(new URL('../data/kanji-facts.json',import.meta.url),'utf8'))
const loadUnit=async unit=>{
  if(unit.id.startsWith('hs')){
    const units=JSON.parse(await readFile(new URL('../data/highschool-math.json',import.meta.url),'utf8'))
    return units.find(item=>item.id===unit.id)
  }
  if(!unit.kankenGrade)return readFile(new URL(`../data/units/${encodeURIComponent(unit.id)}.json`,import.meta.url),'utf8').then(JSON.parse)
  const category=unit.category
  let items
  if(category==='reading'||category==='writing'){
    const kind=category
    const source=await Promise.all(Array.from({length:unit.schoolGrade},(_,index)=>index+1).map(grade=>
      readFile(new URL(`../data/units/jp${grade}-kanji-${kind}.json`,import.meta.url),'utf8').then(JSON.parse)
    ))
    items=source.flatMap(item=>item.exercise.items)
  }else throw new Error(`対応していない漢検分野です: ${category}`)
  return {...unit,exercise:{...unit.exercise,items}}
}
const curriculum=await Promise.all(curriculumIndex.map(unit=>readFile(new URL(`../data/units/${encodeURIComponent(unit.id)}.json`,import.meta.url),'utf8').then(JSON.parse)))
const juniorMath=await Promise.all(juniorMathIndex.map(loadUnit))
const highSchoolMath=await Promise.all(highSchoolMathIndex.map(loadUnit))
const science=await Promise.all(scienceIndex.map(unit=>readFile(new URL(`../data/units/${encodeURIComponent(unit.id)}.json`,import.meta.url),'utf8').then(JSON.parse)))
const kokugo=await Promise.all(kokugoIndex.filter(unit=>!unit.kankenGrade).map(loadUnit))
const kanken=await Promise.all(kankenIndex.map(loadUnit))
const itemCatalog=JSON.parse(await readFile(new URL('../data/problem-items.json',import.meta.url),'utf8'))
const source=await readFile(new URL('../assets/shared/core.js',import.meta.url),'utf8')
const {makeProblems,normalizeAnswer,printQuestion,answerRows,answerInputWidth,problemSetSignature,generateUniqueProblemSets,qrSvg}=await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`)

test('公開ページとオフライン復習用アセットの参照先が存在する',async()=>{
  const files=[
    '../assets/pages/app.js','../assets/pages/about.js','../assets/pages/print.js','../assets/pages/answers.js','../assets/pages/web.js','../assets/pages/review.js','../assets/pages/japanese-notice.js',
    '../assets/shared/core.js','../assets/shared/japanese.js','../assets/shared/layout.js','../assets/data/data-loader.js','../japanese-notice/index.html',
    '../assets/styles/base.css','../assets/styles/units.css','../assets/styles/print.css','../assets/styles/print-fixes.css','../assets/styles/web-learn.css'
  ]
  await Promise.all(files.map(file=>access(new URL(file,import.meta.url))))
  const serviceWorker=await readFile(new URL('../sw.js',import.meta.url),'utf8')
  for(const path of ['./web/review.html','./assets/pages/review.js','./assets/shared/core.js','./assets/styles/base.css','./assets/styles/web-learn.css']){
    assert.ok(serviceWorker.includes(path),path)
  }
})

test('答え合わせ用QRコードはマスク情報を正しいビット順で持つ',()=>{
  const svg=qrSvg('https://example.test/answer.html?unit=numbers-1-10&count=10&seed=abc-123')
  const format=0b111011111000100
  const coordinates=[[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]]
  for(const [[row,col],index] of coordinates.map((coordinate,index)=>[coordinate,index])){
    const rect=`<rect x="${col+4}" y="${row+4}" width="1" height="1"/>`
    assert.equal(svg.includes(rect),Boolean(format>>>(14-index)&1),`format bit ${index}`)
  }
})

test('利用しやすさの導線と選択肢のアクセシビリティを提供する',async()=>{
  const [home,printPage,webPage]=await Promise.all([
    readFile(new URL('../assets/pages/app.js',import.meta.url),'utf8'),
    readFile(new URL('../assets/pages/print.js',import.meta.url),'utf8'),
    readFile(new URL('../assets/pages/web.js',import.meta.url),'utf8')
  ])
  assert.match(home,/算数（中学では数学）・国語の漢字・理科・漢検/)
  assert.match(home,/教育目的・個人利用では自由に利用できます。/)
  assert.match(printPage,/id="subject"/)
  assert.match(printPage,/id="school-stage"/)
  assert.match(printPage,/\{id:'elementary',label:'小学校',grades:\[1,2,3,4,5,6\]\}/)
  assert.match(printPage,/\{id:'junior',label:'中学校',grades:\[7,8,9\]\}/)
  assert.match(printPage,/\{id:'high',label:'高校',grades:\[10,11,12\]\}/)
  assert.match(printPage,/coursesFor\(grade,subject\)/)
  assert.match(printPage,/印刷・PDF保存/)
  assert.match(webPage,/learningShortcuts/)
  assert.match(webPage,/aria-pressed/)
  assert.match(webPage,/元に戻せません/)
  assert.match(webPage,/subjectGroup/)
  assert.match(webPage,/subjectForGrade/)
  assert.match(webPage,/isKankenUnitId/)
})

test('全単元は20問を決定的に問題を生成できる',()=>{
  const units=curriculum
  assert.ok(units.length>=50)
  for(const unit of units){
    const first=makeProblems(unit,20,'curriculum-test',itemCatalog)
    const second=makeProblems(unit,20,'curriculum-test',itemCatalog)
    assert.deepEqual(first,second,unit.id)
    assert.equal(first.length,20,unit.id)
    for(const problem of first){
      assert.ok(problem.display,unit.id)
      assert.notEqual(normalizeAnswer(problem.answer),'',unit.id)
    }
  }
})

test('連続印刷用の問題セットはIDと印刷内容の重複を除外する',()=>{
  const unit=curriculum.find(unit=>unit.id==='addition-to-10')
  let number=0
  const result=generateUniqueProblemSets({unit,count:5,requested:10,createSeed:()=>`batch-${number++}`})
  assert.equal(result.exhausted,false)
  assert.equal(result.pages.length,10)
  assert.equal(new Set(result.pages.map(page=>page.seedValue)).size,10)
  assert.equal(new Set(result.pages.map(page=>problemSetSignature(page.problems))).size,10)
})

test('連続印刷用の問題セットは重複しか生成できないとき停止する',()=>{
  const unit=curriculum.find(unit=>unit.id==='addition-to-10')
  const result=generateUniqueProblemSets({unit,count:5,requested:2,createSeed:()=> 'same-id',maxAttempts:3})
  assert.equal(result.exhausted,true)
  assert.equal(result.pages.length,1)
})

test('中学数学は3学年・4領域の主要23単元を決定的に生成できる',()=>{
  assert.equal(juniorMath.length,23)
  assert.deepEqual([...new Set(juniorMath.map(unit=>unit.grade))],[7,8,9])
  for(const grade of [7,8,9]){
    const units=juniorMath.filter(unit=>unit.grade===grade)
    assert.ok(units.length>=5,`中学${grade-6}年`)
    for(const area of ['A 数と式','B 図形','C 関数','D データの活用'])assert.ok(units.some(unit=>unit.area===area),`中学${grade-6}年 ${area}`)
  }
  for(const unit of juniorMath){
    const first=makeProblems(unit,20,'junior-math-test')
    assert.deepEqual(first,makeProblems(unit,20,'junior-math-test'),unit.id)
    assert.equal(first.length,20,unit.id)
    first.forEach(problem=>{
      assert.ok(problem.display,unit.id)
      assert.notEqual(normalizeAnswer(problem.answer),'',unit.id)
      assert.equal(new Set(problem.choices).size,problem.choices.length,unit.id)
    })
  }
})

test('高校数学は数学I・A・II・B・C・IIIの全科目をランダム生成できる',()=>{
  assert.deepEqual([...new Set(highSchoolMath.map(unit=>unit.course))],['数学I','数学A','数学II','数学B','数学C','数学III'])
  assert.deepEqual([...new Set(highSchoolMath.map(unit=>unit.grade))],[10,11,12])
  for(const unit of highSchoolMath){
    const first=makeProblems(unit,20,'high-school-test')
    assert.deepEqual(first,makeProblems(unit,20,'high-school-test'),unit.id)
    first.forEach(problem=>{
      assert.ok(problem.display,unit.id)
      assert.ok(problem.explanation,unit.id)
      assert.notEqual(normalizeAnswer(problem.answer),'',unit.id)
    })
  }
})

test('中学数学の数式・平方根・複数解の表記ゆれを正規化する',()=>{
  assert.equal(normalizeAnswer(' x = −３ '),'-3')
  assert.equal(normalizeAnswer('sqrt(12)'),'√12')
  assert.equal(normalizeAnswer('x^2+5x+6'),normalizeAnswer('ｘ²＋５ｘ＋６'))
  assert.equal(normalizeAnswer('x=3, x=-2'),normalizeAnswer('-2、3'))
  assert.equal(normalizeAnswer('y=4, x=1'),normalizeAnswer('1,4'))
})

test('一次・連立・二次方程式の生成結果は方程式を満たす',()=>{
  const linear=juniorMath.find(unit=>unit.id==='jh1-linear-equation')
  for(const problem of makeProblems(linear,20,'linear-valid')){
    const text=problem.display.replace(/<[^>]+>/g,'')
    const [,a,sign,b,right]=text.match(/(\d+)x ([−＋]) (\d+) ＝ (-?\d+)/)
    const x=Number(problem.answer)
    assert.equal(Number(a)*x+(sign==='−'?-Number(b):Number(b)),Number(right))
  }
  const simultaneous=juniorMath.find(unit=>unit.id==='jh2-simultaneous-equations')
  for(const problem of makeProblems(simultaneous,20,'simultaneous-valid')){
    const text=problem.display.replace(/<[^>]+>/g,'')
    const [,sum,diff]=text.match(/x＋y＝(-?\d+)、x−y＝(-?\d+)/)
    const [x,y]=String(problem.answer).split(',').map(Number)
    assert.equal(x+y,Number(sum))
    assert.equal(x-y,Number(diff))
  }
  const quadratic=juniorMath.find(unit=>unit.id==='jh3-quadratic-equation')
  for(const problem of makeProblems(quadratic,20,'quadratic-valid')){
    const text=problem.display.replace(/<[^>]+>/g,'')
    const [,signB,b,signC,c]=text.match(/x² ([−＋]) (\d+)x ([−＋]) (\d+)＝0/)
    const coefficientB=(signB==='−'?-1:1)*Number(b)
    const coefficientC=(signC==='−'?-1:1)*Number(c)
    String(problem.answer).split(',').map(Number).forEach(x=>assert.equal(x*x+coefficientB*x+coefficientC,0))
  }
})

test('理科は3〜6年の4領域・16単元で3択問題を生成できる',()=>{
  assert.equal(science.length,16)
  assert.deepEqual([...new Set(science.map(unit=>unit.grade))],[3,4,5,6])
  for(const unit of science){
    assert.equal(unit.exercise.kind,'knowledgeChoice',unit.id)
    const first=makeProblems(unit,20,'science-test')
    assert.deepEqual(first,makeProblems(unit,20,'science-test'),unit.id)
    first.forEach(problem=>{
      assert.equal(problem.choices.length,3,unit.id)
      assert.equal(new Set(problem.choices).size,3,unit.id)
      assert.ok(problem.choices.includes(problem.answer),unit.id)
    })
  }
})

test('理科の植物と地層の問題は、学習内容に沿った用語と正答を使う',()=>{
  const plants=science.find(unit=>unit.id==='science3-plants-insects')
  const cotyledon=plants.exercise.items.find(item=>item.id==='1')
  assert.deepEqual(cotyledon,{
    id:'1',
    question:'種から芽が出たとき、はじめに開く葉を何といいますか。',
    answer:'子葉',
    distractors:['本葉','根']
  })
  const land=science.find(unit=>unit.id==='science6-land-moon')
  const strata=land.exercise.items.find(item=>item.id==='1')
  assert.equal(strata.answer,'土や砂、泥などの層')
  assert.match(strata.question,/主に何が重なって/)
})

test('理科の3〜4年の用語は学習指導要領の表記と未習漢字に沿う',()=>{
  const light=science.find(unit=>unit.id==='science3-light-sound')
  const lightSpot=light.exercise.items.find(item=>item.id==='3')
  assert.equal(lightSpot.answer,'光の点')
  assert.deepEqual(lightSpot.distractors,['音の点','影の点'])
  const shadow=science.find(unit=>unit.id==='science3-sun-shadow')
  const blocker=shadow.exercise.items.find(item=>item.id==='19')
  assert.equal(blocker.answer,'さえぎるもの')
  assert.ok(!blocker.answer.includes('遮'))
  const airWater=science.find(unit=>unit.id==='science4-air-water')
  const bulb=airWater.exercise.items.find(item=>item.id==='9')
  assert.match(bulb.question,/水の温度を測るとき/)
  assert.equal(bulb.answer,'水の中')
})

test('国語は全学年で漢字と同音異義語を決定的に生成できる',()=>{
  const removed=['jp1-vocabulary','jp1-usage','jp2-words','jp3-words','jp5-words','jp6-words']
  assert.equal(kokugo.length,15)
  assert.ok(kokugo.every(unit=>!unit.kankenGrade))
  assert.deepEqual([...new Set(kokugo.map(unit=>unit.grade))],[1,2,3,4,5,6])
  removed.forEach(id=>assert.ok(!kokugo.some(unit=>unit.id===id),id))
  for(const unit of kokugo){
    const first=makeProblems(unit,20,'kokugo-test')
    assert.deepEqual(first,makeProblems(unit,20,'kokugo-test'),unit.id)
    assert.equal(first.length,20,unit.id)
    first.forEach(problem=>{
      assert.ok(problem.display,unit.id)
      assert.notEqual(normalizeAnswer(problem.answer),'',unit.id)
    })
  }
})

test('削除済み国語単元の教材ファイルは公開しない',async()=>{
  for(const id of ['jp1-vocabulary','jp1-usage','jp2-words','jp3-words','jp5-words','jp6-words']){
    await assert.rejects(access(new URL(`../data/units/${id}.json`,import.meta.url)))
  }
})

test('削除済み国語単元は案内ページへ誘導する',async()=>{
  const [web,print,answers,notice]=await Promise.all([
    readFile(new URL('../assets/pages/web.js',import.meta.url),'utf8'),
    readFile(new URL('../assets/pages/print.js',import.meta.url),'utf8'),
    readFile(new URL('../assets/pages/answers.js',import.meta.url),'utf8'),
    readFile(new URL('../assets/pages/japanese-notice.js',import.meta.url),'utf8')
  ])
  for(const page of [web,print,answers])assert.match(page,/removedJapaneseUnitGrade/)
  assert.match(notice,/Webで国語をまなぶ/)
  assert.match(notice,/国語のプリントをつくる/)
  assert.match(notice,/subject=.*国語/)
})

test('小4〜小6の同音異義語は87題の3択で、20問まで重複なく生成できる',()=>{
  const expected={
    'jp4-homophone':33,
    'jp5-homophone':27,
    'jp6-homophone':27
  }
  const units=kokugo.filter(unit=>Object.hasOwn(expected,unit.id))
  assert.equal(units.length,3)
  assert.equal(units.reduce((total,unit)=>total+unit.exercise.items.length,0),87)
  for(const unit of units){
    assert.equal(unit.exercise.items.length,expected[unit.id],unit.id)
    for(const item of unit.exercise.items){
      const choices=[item.answer,...item.distractors]
      assert.equal(choices.length,3,unit.id)
      assert.equal(new Set(choices).size,3,unit.id)
    }
    for(const count of [5,10,20]){
      const problems=makeProblems(unit,count,'homophone-test')
      assert.equal(new Set(problems.map(problem=>problem.answer)).size,count,`${unit.id}: ${count}問`)
    }
  }
})

test('漢検10〜5級は累積対象字数と級別分野を持つ',()=>{
  assert.ok(kanken.length>0)
  assert.ok(kanken.every(unit=>unit.subject==='漢検'))
  const expected={10:80,9:240,8:440,7:642,6:835,5:1026}
  for(const [grade,count] of Object.entries(expected)){
    const units=kanken.filter(unit=>unit.kankenGrade===Number(grade))
    assert.equal(units.length,2,`${grade}級の分野`)
    assert.ok(units.every(unit=>unit.targetCharacters===count),`${grade}級の対象字数`)
    for(const category of ['reading','writing']){
      assert.ok(units.some(unit=>unit.category===category),`${grade}級 ${category}`)
    }
    const reading=units.find(unit=>unit.category==='reading')
    const writing=units.find(unit=>unit.category==='writing')
    const readingCharacters=new Set(reading.exercise.items.filter(item=>item.character).map(item=>item.character))
    const writingCharacters=new Set(writing.exercise.items.filter(item=>item.character).map(item=>item.character))
    assert.equal(readingCharacters.size,count,`${grade}級の累積読み対象`)
    assert.deepEqual(readingCharacters,writingCharacters,`${grade}級の累積読み書き対象`)
  }
})

test('漢検の全分野は20問を決定的に生成できる',()=>{
  for(const unit of kanken){
    assert.ok(unit.category)
    assert.ok(unit.exercise.items.length>=3,unit.id)
    const first=makeProblems(unit,20,'kanken-test')
    assert.deepEqual(first,makeProblems(unit,20,'kanken-test'),unit.id)
    assert.equal(first.length,20,unit.id)
    first.forEach(problem=>{
      assert.ok(problem.display,unit.id)
      assert.notEqual(normalizeAnswer(problem.answer),'',unit.id)
      if(unit.exercise.kind==='kankenChoice'){
        assert.equal(problem.choices.length,3,unit.id)
        assert.equal(new Set(problem.choices).size,3,unit.id)
      }
    })
  }
})

test('漢検は読みと書き取りだけを公開する',()=>{
  assert.deepEqual(new Set(kanken.map(unit=>unit.category)),new Set(['reading','writing']))
})

test('国語の漢字教材は学年別漢字配当表の1,026字を読み書きで網羅する',()=>{
  const expected={1:80,2:160,3:200,4:202,5:193,6:191}
  const allCharacters=new Set()
  for(const [grade,count] of Object.entries(expected)){
    const itemsByKind=Object.fromEntries(['kanjiReading','kanjiWriting'].map(kind=>{
      const unit=kokugo.find(item=>item.grade===Number(grade)&&item.exercise.kind===kind)
      const items=unit.exercise.items.filter(item=>item.character)
      const characters=new Set(items.map(item=>item.character))
      assert.equal(characters.size,count,`小学${grade}年 ${kind}`)
      items.forEach(item=>{
        assert.ok(item.reading,`${item.character} の読み`)
        assert.ok(item.prompt,`${item.character} の書き取り用の読み`)
        assert.ok(item.example,`${item.character} の例語`)
        assert.ok(item.exampleReading,`${item.character} の例語の読み`)
      })
      return [kind,{unit,items,characters}]
    }))
    assert.deepEqual(itemsByKind.kanjiReading.characters,itemsByKind.kanjiWriting.characters,`小学${grade}年の読み書き対象`)
    itemsByKind.kanjiReading.characters.forEach(character=>allCharacters.add(character))
  }
  assert.equal(allCharacters.size,1026)
})

test('漢字属性マスタは教育漢字1,026字の学年・画数・部首番号を持つ',()=>{
  assert.equal(kanjiFacts.facts.length,1026)
  assert.equal(new Set(kanjiFacts.facts.map(item=>item.character)).size,1026)
  kanjiFacts.facts.forEach(item=>{
    assert.ok(item.schoolGrade>=1&&item.schoolGrade<=6)
    assert.ok(Number.isInteger(item.strokeCount)&&item.strokeCount>0)
    assert.ok(Number.isInteger(item.radical)&&item.radical>=1&&item.radical<=214)
  })
})

test('漢字の読み書きは20問セット内で同じ出題項目を繰り返さない',()=>{
  for(const unit of kokugo.filter(unit=>['kanjiReading','kanjiWriting'].includes(unit.exercise.kind))){
    const problems=makeProblems(unit,20,'kanji-unique-test')
    const displays=problems.map(problem=>problem.display)
    assert.equal(new Set(displays).size,20,unit.id)
  }
})

test('例語付き一字漢字問題は読みを明示し、書き取りでは対象字を隠す',()=>{
  const unit={id:'kanji-context-test',exercise:{kind:'kanjiReading',items:[{character:'生',reading:'せい',prompt:'せい',example:'先生',exampleReading:'せんせい'}]}}
  const reading=makeProblems(unit,1,'context-test')[0]
  assert.equal(reading.answer,'せい')
  assert.match(reading.display,/先<mark[^>]*>生<\/mark>/)
  assert.match(reading.display,/kokugo-target/)
  const writing=makeProblems({...unit,exercise:{...unit.exercise,kind:'kanjiWriting'}},1,'context-test')[0]
  assert.equal(writing.answer,'生')
  assert.match(writing.display,/先□/)
  assert.ok(!writing.display.includes('先生'))
})

test('送り仮名付きの読みは対象漢字の部分だけを正答にする',()=>{
  const unit={id:'okurigana-test',exercise:{kind:'kanjiReading',items:[
    {character:'広',reading:'ひろ',prompt:'ひろ',example:'広げる',exampleReading:'ひろげる'},
    {character:'下',reading:'さ',prompt:'さ',example:'下げる',exampleReading:'さげる'},
    {character:'売',reading:'う',prompt:'う',example:'売る',exampleReading:'うる'},
    {character:'広',reading:'こう',prompt:'こう',example:'広大',exampleReading:'こうだい'}
  ]}}
  const problems=makeProblems(unit,20,'okurigana-test')
  assert.ok(problems.some(problem=>problem.answer==='ひろ'))
  assert.ok(problems.some(problem=>problem.answer==='さ'))
  assert.ok(problems.some(problem=>problem.answer==='う'))
  assert.ok(problems.some(problem=>problem.answer==='こう'))
  assert.ok(!problems.some(problem=>problem.answer==='ひろげる'||problem.answer==='さげる'||problem.answer==='うる'))
  const generated=kokugo.find(unit=>unit.id==='jp2-kanji-reading').exercise.items.find(item=>item.character==='広'&&item.example==='広げる')
  assert.equal(generated.reading,'ひろ')
  assert.equal(generated.prompt,'ひろ')
})

test('分数・比の入力は表記ゆれを正規化する',()=>{
  assert.equal(normalizeAnswer(' ３／４ '),'3/4')
  assert.equal(normalizeAnswer('2／3'),'2/3')
})

test('比例・反比例と時刻の問題は、問題文と正答が対応する',()=>{
  const units=[
    curriculum.find(unit=>unit.id==='change-4'),
    curriculum.find(unit=>unit.id==='proportion-6'),
    curriculum.find(unit=>unit.id==='inverse-proportion-6'),
    curriculum.find(unit=>unit.id==='time')
  ]
  for(const unit of units){
    for(const problem of makeProblems(unit,20,'relationship-answer-test',itemCatalog)){
      const text=problem.display.replace(/<[^>]+>/g,'')
      if(unit.exercise.kind==='proportion'){
        const [,baseCount,baseWeight,targetCount]=text.match(/(\d+) こで (\d+) g の品物です。(\d+) こ/)
        assert.equal(Number(problem.answer),Number(baseWeight)*Number(targetCount)/Number(baseCount))
      }else if(unit.exercise.kind==='inverseProportion'){
        const [,onePersonTime,people]=text.match(/1人で (\d+) 分かかる仕事を (\d+) 人/)
        assert.equal(Number(problem.answer),Number(onePersonTime)/Number(people))
      }else{
        const [,hour,minute]=text.match(/(\d+)時(\d+)分の20分後/)
        assert.equal(problem.answer,`${hour}時${Number(minute)+20}分`)
      }
    }
  }
})

test('印刷用の問題は横長の解答欄を含まず、分数計算には専用形式を付ける',()=>{
  const fractionUnit=curriculum.find(unit=>unit.id==='fraction-multiply-6')
  const numberUnit=curriculum.find(unit=>unit.id==='multiplication-intro')
  const fractionProblem=makeProblems(fractionUnit,1,'print-answer-test',itemCatalog)[0]
  const numberProblem=makeProblems(numberUnit,1,'print-answer-test',itemCatalog)[0]
  assert.equal(fractionProblem.answerFormat,'fraction')
  assert.equal(numberProblem.answerFormat,'standard')
  assert.ok(fractionProblem.display.includes('answer-box'))
  assert.ok(!fractionProblem.printDisplay.includes('answer-box'))
  assert.ok(!numberProblem.printDisplay.includes('answer-box'))
  assert.equal(fractionProblem.answerHint,'')
  assert.ok(!printQuestion(fractionProblem).includes('answer-box'))
  assert.ok(!printQuestion(numberProblem).includes('answer-box'))
})

test('Web学習の入力欄は正答の長さと形式に応じて広がる',()=>{
  assert.equal(answerInputWidth('7'),145)
  assert.equal(answerInputWidth('1234'),235)
  assert.equal(answerInputWidth('せいじつ'),235)
  assert.equal(answerInputWidth('2√13','expression'),372)
  assert.equal(answerInputWidth('123/4','fraction'),194)
  assert.equal(answerInputWidth('123456789','expression'),480)
})

test('印刷用の解答欄に単位などの補足を渡せる',()=>{
  const unit=curriculum.find(item=>item.id==='length')
  const problem=makeProblems(unit,1,'print-answer-hint',itemCatalog)[0]
  assert.equal(problem.printDisplay.endsWith('＝'),true)
  assert.equal(problem.answerHint,'mm')
})

test('同じ問題セットIDから同じ答え一覧を生成できる',()=>{
  const unit=curriculum.find(item=>item.id==='addition-to-10')
  const first=answerRows(makeProblems(unit,10,'answer-sheet-test',itemCatalog))
  const second=answerRows(makeProblems(unit,10,'answer-sheet-test',itemCatalog))
  assert.deepEqual(first,second)
  assert.equal(first.length,10)
  assert.deepEqual(Object.keys(first[0]),['number','question','answer'])
})

test('修正済みの8単元は公開インデックスに含まれる',async()=>{
  const builtIndex=JSON.parse(await readFile(new URL('../data/units-index.json',import.meta.url),'utf8'))
  const base=JSON.parse(await readFile(new URL('../data/units-index.base.json',import.meta.url),'utf8'))
  const highschool=JSON.parse(await readFile(new URL('../data/highschool-math.json',import.meta.url),'utf8'))
  const restored=['jh2-congruence','jh2-boxplot','hs1-set-proposition','hs1-statistics','hs2-complex','hsb-inference','hsc-complex-plane','hs3-integration']
  for(const id of restored){
    assert.ok(builtIndex.some(unit=>unit.id===id),`${id} は公開インデックスに含まれる`)
  }
  for(const id of ['jh2-congruence','jh2-boxplot']){
    const unit=base.find(item=>item.id===id)
    assert.notEqual(unit?.enabled,false,`${id} は base で有効`)
  }
  for(const id of ['hs1-set-proposition','hs1-statistics','hs2-complex','hsb-inference','hsc-complex-plane','hs3-integration']){
    const unit=highschool.find(item=>item.id===id)
    assert.notEqual(unit?.enabled,false,`${id} は highschool-math で有効`)
  }
})

test('再公開した数学単元は教材として成立する問題を生成する',()=>{
  const hs=id=>highSchoolMath.find(unit=>unit.id===id)
  const set=hs('hs1-set-proposition')
  const statistics=hs('hs1-statistics')
  const complex=[hs('hs2-complex'),hs('hsc-complex-plane')]
  const integration=hs('hs3-integration')
  for(let seedIndex=0;seedIndex<10;seedIndex++){
    for(const problem of makeProblems(set,20,`set-valid-${seedIndex}`).filter(problem=>problem.display.includes('A∩B'))){
      const text=problem.display.replace(/<[^>]+>/g,'')
      const [,universal,a,b,common]=text.match(/全体集合 U の要素数は (\d+)、A は (\d+)、B は (\d+)、A∩B は (\d+)/).map(Number)
      assert.ok(a+b-common<=universal)
      assert.equal(Number(problem.answer),a+b-common)
    }
    for(const problem of makeProblems(statistics,20,`statistics-valid-${seedIndex}`).filter(problem=>problem.display.includes('平均値'))){
      const values=problem.display.replace(/<[^>]+>/g,'').match(/データ ([\d、]+) の平均値/)[1].split('、').map(Number)
      assert.equal(values.reduce((sum,value)=>sum+value,0)%values.length,0)
      assert.equal(Number(problem.answer),values.reduce((sum,value)=>sum+value,0)/values.length)
    }
    for(const unit of complex)for(const problem of makeProblems(unit,20,`complex-valid-${seedIndex}`)){
      assert.doesNotMatch(String(problem.answer),/^0[＋−].*i|[＋−]0i/)
      assert.doesNotMatch(problem.display,/[＋−]0i|\(0[＋−]\d+i\)/)
    }
    for(const problem of makeProblems(integration,20,`integration-valid-${seedIndex}`))assert.doesNotMatch(String(problem.answer),/\d+\.\d/)
  }
  assert.equal(normalizeAnswer('2/3x³+3/2x²+C'),normalizeAnswer(' ２x³／３ ＋ ３x²／２ + C '))
  const congruence=juniorMath.find(unit=>unit.id==='jh2-congruence')
  const validConditions=new Set(['3組の辺','2組の辺とその間の角','1組の辺とその両端の角'])
  for(const problem of makeProblems(congruence,60,'congruence-valid')){
    assert.equal(problem.choices.filter(choice=>validConditions.has(choice)).length,1)
    assert.ok(problem.choices.includes(problem.answer))
  }
  const boxplot=juniorMath.find(unit=>unit.id==='jh2-boxplot')
  const problems=makeProblems(boxplot,20,'boxplot-valid')
  for(const label of ['中央値','第1四分位数','第3四分位数'])assert.ok(problems.some(problem=>problem.display.includes(label)),label)
})

test('hs1-quadratic の表示式は符号と定数項0が正しい',async()=>{
  const highschool=JSON.parse(await readFile(new URL('../data/highschool-math.json',import.meta.url),'utf8'))
  const unit=highschool.find(item=>item.id==='hs1-quadratic')
  const problems=makeProblems(unit,200,'quadratic-display')
  for(const problem of problems.filter(problem=>problem.display.includes('最小値は'))){
    const text=problem.display.replace(/<[^>]+>/g,'')
    const match=text.match(/y＝\d*\(x(.*?)\)²(.*?)の最小値は/)
    assert.ok(match,`y＝a(x ...)² ... の最小値は 形式: ${text}`)
    const linear=match[1].trim()
    const constant=match[2].trim()
    if(linear.length===0){
      // p=0, 何もつかない
    }else{
      assert.match(linear,/^(＋ \d+|− \d+)$/,`括弧内: ${linear}`)
    }
    if(constant.length===0){
      // q=0, 何もつかない
    }else{
      assert.match(constant,/^(＋ \d+|− \d+)$/,`定数項: ${constant}`)
    }
  }
})

test('hsLinear/hsCoordinate は定数項0で +0/-0 を表示しない',async()=>{
  const highschool=JSON.parse(await readFile(new URL('../data/highschool-math.json',import.meta.url),'utf8'))
  for(const id of ['hs1-real-numbers','hs2-coordinate']){
    const unit=highschool.find(item=>item.id===id)
    const kind=unit.exercise.kind
    const problems=makeProblems({...unit,exercise:{...unit.exercise,kind}},200,`${kind}-zero`)
    for(const problem of problems){
      const text=problem.display.replace(/<[^>]+>/g,'')
      assert.ok(!text.includes('＋ 0 '),`${id} ${kind}: ${text}`)
      assert.ok(!text.includes('− 0 '),`${id} ${kind}: ${text}`)
    }
  }
})

test('高校数学の不等式・確率・根号・定積分は出題文と正答が対応する',()=>{
  const hs=id=>highSchoolMath.find(unit=>unit.id===id)
  for(const problem of makeProblems(hs('hs1-real-numbers'),60,'hs-real-valid').filter(problem=>problem.display.includes('を解くと'))){
    const text=problem.display.replace(/<[^>]+>/g,'')
    const [,coefficient,sign,constant,right]=text.match(/(\d+)x(?: (−|＋) (\d+))? ＞ (-?\d+) を解くと x ＞/)
    const intercept=constant?(sign==='−'?-Number(constant):Number(constant)):0
    assert.equal(Number(right),Number(coefficient)*Number(problem.answer)+intercept)
  }
  for(const problem of makeProblems(hs('hsa-probability'),60,'hs-probability-valid').filter(problem=>problem.display.includes('6面サイコロ'))){
    const text=problem.display.replace(/<[^>]+>/g,'')
    const [,first,second]=text.match(/1個目が (\d+) 以下、2個目が (\d+) 以下/)
    const [numerator,denominator]=String(problem.answer).split('/').map(Number)
    assert.equal(numerator*36,denominator*Number(first)*Number(second))
  }
  for(const id of ['hs1-trigonometry','hsa-geometry'])for(const problem of makeProblems(hs(id),60,`${id}-root-valid`).filter(problem=>problem.display.includes('2辺が'))){
    const text=problem.display.replace(/<[^>]+>/g,'')
    const [,first,second]=text.match(/2辺が (\d+)、(\d+)/)
    const answer=String(problem.answer),root=answer.match(/^(\d*)√(\d+)$/)
    assert.doesNotMatch(String(problem.answer),/\d+\.\d+/)
    assert.equal(root?((Number(root[1]||1)**2)*Number(root[2])):Number(answer)**2,Number(first)**2+Number(second)**2)
  }
  for(const problem of makeProblems(hs('hs3-integration'),60,'hs-integration-valid').filter(problem=>problem.display.includes('∫0から1まで'))){
    const coefficient=Number(problem.display.replace(/<[^>]+>/g,'').match(/まで (\d+)x dx/)[1])
    assert.equal(String(problem.answer),coefficient%2?`${coefficient}/2`:String(coefficient/2))
  }
})

test('同音異義語は未出題だった漢字も正答として含まれる',()=>{
  const expected={
    'jp4-homophone':{words:['取る','掛ける','架ける','懸ける'],count:33},
    'jp5-homophone':{words:['抗体','健闘'],count:27},
    'jp6-homophone':{words:['快感','感傷'],count:27}
  }
  for(const [id,{words,count}] of Object.entries(expected)){
    const unit=kokugo.find(item=>item.id===id)
    assert.equal(unit.exercise.items.length,count,`${id} 問題数`)
    const answers=new Set(unit.exercise.items.map(item=>item.answer))
    for(const word of words){
      assert.ok(answers.has(word),`${id} の正答に ${word} が含まれる`)
    }
  }
})

test('3年理科の回答語に6年配当漢字が含まれない',()=>{
  const banned=['暖']
  for(const unit of science.filter(item=>item.grade===3)){
    for(const item of unit.exercise.items){
      for(const kanji of banned){
        assert.ok(!item.answer.includes(kanji),`${unit.id} Q${item.id}: ${item.answer} に ${kanji}(6年配当) が含まれる`)
        for(const distractor of item.distractors||[]){
          assert.ok(!distractor.includes(kanji),`${unit.id} Q${item.id} 誤答: ${distractor} に ${kanji}(6年配当) が含まれる`)
        }
      }
    }
  }
})

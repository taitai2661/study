import {readFile,writeFile} from 'node:fs/promises'

const root=new URL('../',import.meta.url)
const index=JSON.parse(await readFile(new URL('data/units-index.base.json',root),'utf8'))
const highschool=JSON.parse(await readFile(new URL('data/highschool-math.json',root),'utf8'))
const grades=[
  {schoolGrade:1,kankenGrade:10,targetCharacters:80,categories:[['reading','漢字の読み','kanjiReading'],['writing','漢字の書き取り','kanjiWriting']]},
  {schoolGrade:2,kankenGrade:9,targetCharacters:240,categories:[['reading','漢字の読み','kanjiReading'],['writing','漢字の書き取り','kanjiWriting']]},
  {schoolGrade:3,kankenGrade:8,targetCharacters:440,categories:[['reading','漢字の読み','kanjiReading'],['writing','漢字の書き取り','kanjiWriting']]},
  {schoolGrade:4,kankenGrade:7,targetCharacters:642,categories:[['reading','漢字の読み','kanjiReading'],['writing','漢字の書き取り','kanjiWriting']]},
  {schoolGrade:5,kankenGrade:6,targetCharacters:835,categories:[['reading','漢字の読み','kanjiReading'],['writing','漢字の書き取り','kanjiWriting']]},
  {schoolGrade:6,kankenGrade:5,targetCharacters:1026,categories:[['reading','漢字の読み','kanjiReading'],['writing','漢字の書き取り','kanjiWriting']]}
]
const kept=[...index.filter(unit=>unit.enabled!==false),...highschool.filter(unit=>unit.enabled!==false).map(({exercise,...unit})=>({...unit,problemKind:exercise.kind}))]
for(const grade of grades){
  for(const [category,unit,kind] of grade.categories){
    kept.push({
      id:`kanken-${grade.kankenGrade}-${category}`,
      grade:grade.schoolGrade,
      schoolGrade:grade.schoolGrade,
      kankenGrade:grade.kankenGrade,
      targetCharacters:grade.targetCharacters,
      category,
      subject:'漢検',
      area:'漢検対策',
      unit,
      summary:`漢検${grade.kankenGrade}級（小学${grade.schoolGrade}年修了程度）の${unit}を練習します。`,
      objectives:[`${unit}の力を身につける`],
      exercise:{type:kind==='kankenChoice'?'choice':'text',kind,prompt:`${unit}の問題に答えましょう。`}
    })
  }
}
await writeFile(new URL('data/units-index.json',root),`${JSON.stringify(kept,null,2)}\n`)

import {readFile,writeFile} from 'node:fs/promises'

const root=new URL('../',import.meta.url)
const source=process.argv[2]
if(!source)throw new Error('KANJIDIC2 XMLのパスを指定してください。')
const units=await Promise.all(Array.from({length:6},(_,index)=>readFile(new URL(`data/units/jp${index+1}-kanji-reading.json`,root),'utf8').then(JSON.parse)))
const grades=new Map()
units.forEach((unit,index)=>unit.exercise.items.forEach(item=>{if(item.character&&!grades.has(item.character))grades.set(item.character,index+1)}))
const xml=await readFile(source,'utf8')
const facts=[]
for(const match of xml.matchAll(/<character>([\s\S]*?)<\/character>/g)){
  const entry=match[1]
  const literal=entry.match(/<literal>(.)<\/literal>/)?.[1]
  if(!literal||!grades.has(literal))continue
  const strokeCount=Number(entry.match(/<stroke_count>(\d+)<\/stroke_count>/)?.[1])
  const radical=entry.match(/<rad_value rad_type="classical">(\d+)<\/rad_value>/)?.[1]
  if(!Number.isInteger(strokeCount)||!radical)throw new Error(`属性が不足しています: ${literal}`)
  facts.push({character:literal,schoolGrade:grades.get(literal),strokeCount,radical:Number(radical)})
}
if(facts.length!==1026)throw new Error(`教育漢字が不足しています: ${facts.length}/1026`)
facts.sort((a,b)=>a.schoolGrade-b.schoolGrade||a.character.localeCompare(b.character,'ja'))
await writeFile(new URL('data/kanji-facts.json',root),`${JSON.stringify({source:'KANJIDIC2',facts},null,2)}\n`)

const baseUrl=new URL('../../data/',import.meta.url)
const json=path=>fetch(new URL(path,baseUrl)).then(response=>{
  if(!response.ok)throw new Error(`教材データの取得に失敗しました: ${response.status}`)
  return response.json()
})

let indexPromise
const pendingDetails=new Map()

export const loadUnitIndex=()=>indexPromise||(indexPromise=json('units-index.json'))
export const loadUnit=unitId=>{
  if(!pendingDetails.has(unitId)){
    let promise
    const match=/^kanken-(10|9|8|7|6|5)-(.+)$/.exec(unitId)
    if(match){
      const kankenGrade=Number(match[1]),category=match[2],schoolGrade=11-kankenGrade
      const kinds=category==='writing'?['writing']:['reading']
      promise=Promise.all([
        loadUnitIndex(),
        ...Array.from({length:schoolGrade},(_,index)=>index+1).flatMap(grade=>kinds.map(kind=>json(`units/jp${grade}-kanji-${kind}.json`)))
      ]).then(([index,...kanjiUnits])=>{
        if(category==='reading'||category==='writing'){
        }
        const meta=index.find(unit=>unit.id===unitId)
        if(!meta)throw new Error(`漢検単元がありません: ${unitId}`)
        let exerciseItems
        if(category==='reading'||category==='writing'){
          exerciseItems=kanjiUnits.flatMap(unit=>unit.exercise.items)
        }else throw new Error(`対応していない漢検分野です: ${category}`)
        return {...meta,exercise:{...meta.exercise,items:exerciseItems}}
      })
    }else if(unitId.startsWith('hs'))promise=json('highschool-math.json').then(units=>{
      const unit=units.find(item=>item.id===unitId)
      if(!unit)throw new Error(`高校数学単元がありません: ${unitId}`)
      return unit
    })
    else promise=json(`units/${encodeURIComponent(unitId)}.json`)
    pendingDetails.set(unitId,promise)
    promise.finally(()=>pendingDetails.delete(unitId)).catch(()=>{})
  }
  return pendingDetails.get(unitId)
}
export const loadItemCatalog=()=>json('problem-items.json')

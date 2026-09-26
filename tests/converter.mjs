import assert from 'node:assert/strict'
import test from 'node:test'
import {CONVERSION_CATEGORIES,convert,formatConversion,getComparison} from '../assets/shared/converter.js'

const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} ≠ ${expected}`)

test('10カテゴリと必要な単位を収録している',()=>{
  assert.equal(CONVERSION_CATEGORIES.length,10)
  assert.deepEqual(CONVERSION_CATEGORIES.map(category=>category.id),['length','area','volume','mass','temperature','time','speed','data','pressure','energy'])
})

test('各カテゴリの代表値と逆変換を計算できる',()=>{
  const cases=[
    ['length',1,'mile','km',1.609344],['area',1,'acre','m2',4046.8564224],['volume',1,'usgallon','l',3.785411784],
    ['mass',1,'lb','kg',.45359237],['time',1,'week','hour',168],['speed',100,'kmh','mps',100/3.6],
    ['data',1,'gib','b',1073741824],['pressure',1,'atm','pa',101325],['energy',1,'kwh','j',3600000]
  ]
  for(const [category,value,from,to,expected] of cases){
    const converted=convert(value,category,from,to)
    close(converted,expected)
    close(convert(converted,category,to,from),value)
  }
})

test('温度はオフセットを含めて換算する',()=>{
  close(convert(0,'temperature','c','f'),32)
  close(convert(0,'temperature','c','k'),273.15)
  close(convert(32,'temperature','f','c'),0)
})

test('SIとIEC、面積と体積の倍率を区別する',()=>{
  assert.equal(convert(1,'data','kb','b'),1000)
  assert.equal(convert(1,'data','kib','b'),1024)
  assert.equal(convert(1,'area','m2','cm2'),10000)
  assert.equal(convert(1,'volume','m3','cm3'),1000000)
})

test('ゼロ、負数、同一単位、極端な数値を扱う',()=>{
  assert.equal(convert(0,'length','m','km'),0)
  assert.equal(convert(-40,'temperature','c','f'),-40)
  assert.equal(convert(12.5,'mass','kg','kg'),12.5)
  assert.equal(formatConversion(1e20),'100000000000000000000')
  assert.equal(formatConversion(1e-12),'0.000000000001')
  assert.equal(formatConversion(convert(1,'data','bit','tib')),'0.000000000000113686837722')
})

test('不正値と不明な単位を拒否する',()=>{
  assert.throws(()=>convert(Number.NaN,'length','m','km'),/invalid-value/)
  assert.throws(()=>convert(1,'length','unknown','km'),/invalid-unit/)
  assert.throws(()=>convert(1,'unknown','m','km'),/invalid-unit/)
})

test('全カテゴリで量感を示す比較を返す',()=>{
  const values={length:1,area:1,volume:1,mass:1,temperature:293.15,time:60,speed:10,data:1e6,pressure:101325,energy:4184}
  for(const [category,value] of Object.entries(values)){
    const result=getComparison(category,value)
    assert.ok(result,category)
    assert.match(result.description,/です。$/)
    assert.ok(result.percent>=4&&result.percent<=100)
  }
})

test('比較はゼロ、負数、不正値では表示しない',()=>{
  assert.equal(getComparison('length',0),null)
  assert.equal(getComparison('length',-1),null)
  assert.equal(getComparison('length',Number.NaN),null)
})

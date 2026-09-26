import assert from 'node:assert/strict'
import test from 'node:test'
import {calculateScientific} from '../assets/shared/scientific-calculator.js'

test('高校数学用関数電卓は基本関数と角度単位を計算できる',()=>{
  assert.equal(calculateScientific('√(81)+2^3'),17)
  assert.equal(calculateScientific('sin(30)'),.5)
  assert.equal(calculateScientific('log(1000)'),3)
  assert.equal(calculateScientific('sin(3.141592653589793/2)',{radians:true}),1)
})

test('関数電卓は不正な式を拒否する',()=>{
  assert.throws(()=>calculateScientific('Math.constructor(1)'))
  assert.throws(()=>calculateScientific('unknown(1)'))
})

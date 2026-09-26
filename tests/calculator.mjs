import assert from 'node:assert/strict'
import test from 'node:test'
import {calculate,formatNumber,normalizeExpression} from '../assets/shared/calculator.js'

test('四則演算、小数、かっこを計算できる',()=>{
  assert.equal(calculate('2+3×4'),14)
  assert.equal(calculate('(2.5+1.5)÷2'),2)
  assert.equal(calculate('10-3×2'),4)
})
test('入力記号を正規化し、不正な計算を拒否する',()=>{
  assert.equal(normalizeExpression('3*4/2'),'3×4÷2')
  assert.throws(()=>calculate('1÷0'),/divide-by-zero/)
  assert.throws(()=>calculate('2+'),/invalid/)
  assert.equal(formatNumber(0.1+0.2),'0.3')
})

const removedJapaneseUnitGrades={
  'jp1-vocabulary':1,
  'jp1-usage':1,
  'jp2-words':2,
  'jp3-words':3,
  'jp5-words':5,
  'jp6-words':6
}

export const removedJapaneseUnitGrade=unitId=>removedJapaneseUnitGrades[unitId]||null
export const isRemovedJapaneseUnit=unitId=>Boolean(removedJapaneseUnitGrade(unitId))

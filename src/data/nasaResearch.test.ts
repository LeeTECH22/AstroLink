import { describe, it, expect } from 'vitest'
import {
  RESEARCH_CATEGORIES,
  RESEARCH_QUESTIONS,
  TOTAL_EXPECTED_QUESTIONS,
  filterQuestions,
  getCategory,
  getQuestion,
  questionsForCategory,
  searchQuestions,
  validateQuestionBank,
} from './nasaResearch'
import type { ResearchQuestion } from './nasaResearch'

// Small, clearly-labelled fixtures used only to exercise the pure search/filter
// logic. They are never exported or rendered by the application.
const FIXTURES: ResearchQuestion[] = [
  { number: 1, category: 1, text: 'How was NASA founded?' },
  { number: 16, category: 2, text: 'What were the main objectives of the Apollo 11 mission?' },
  { number: 42, category: 3, text: 'Were the Apollo Moon landings staged?' },
  { number: 200, category: 13, text: 'How is the International Space Station supplied?' },
]

describe('NASA research library — category structure', () => {
  it('defines exactly 21 categories numbered 1..21', () => {
    expect(RESEARCH_CATEGORIES).toHaveLength(21)
    expect(RESEARCH_CATEGORIES.map((c) => c.number)).toEqual(
      Array.from({ length: 21 }, (_, i) => i + 1)
    )
  })

  it('uses contiguous, non-overlapping question ranges totalling 340', () => {
    let expectedStart = 1
    for (const c of RESEARCH_CATEGORIES) {
      expect(c.startQuestion).toBe(expectedStart)
      expect(c.count).toBe(c.endQuestion - c.startQuestion + 1)
      expect(c.endQuestion).toBeGreaterThanOrEqual(c.startQuestion)
      expectedStart = c.endQuestion + 1
    }
    const total = RESEARCH_CATEGORIES.reduce((sum, c) => sum + c.count, 0)
    expect(total).toBe(TOTAL_EXPECTED_QUESTIONS)
    expect(TOTAL_EXPECTED_QUESTIONS).toBe(340)
    expect(RESEARCH_CATEGORIES[RESEARCH_CATEGORIES.length - 1].endQuestion).toBe(340)
  })

  it('resolves a category by number', () => {
    expect(getCategory(1)?.title).toMatch(/Origins/i)
    expect(getCategory(21)?.endQuestion).toBe(340)
    expect(getCategory(999)).toBeUndefined()
  })
})

describe('NASA research library — question bank integrity', () => {
  it('reports no structural problems (duplicates, bad category, out-of-range text)', () => {
    const structural = validateQuestionBank().filter(
      (p) => !p.startsWith('expected 340 question records')
    )
    expect(structural).toEqual([])
  })

  it('flags a count mismatch only while the bank is not fully loaded', () => {
    const problems = validateQuestionBank()
    const hasCountProblem = problems.some((p) => p.startsWith('expected 340 question records'))
    if (RESEARCH_QUESTIONS.length === TOTAL_EXPECTED_QUESTIONS) {
      expect(problems).toEqual([])
    } else {
      expect(hasCountProblem).toBe(true)
    }
  })

  it('every question, when present, is unique and inside its category range', () => {
    const seen = new Set<number>()
    for (const q of RESEARCH_QUESTIONS) {
      expect(seen.has(q.number)).toBe(false)
      seen.add(q.number)
      const category = getCategory(q.category)
      expect(category).toBeTruthy()
      expect(q.number).toBeGreaterThanOrEqual(category!.startQuestion)
      expect(q.number).toBeLessThanOrEqual(category!.endQuestion)
    }
    if (RESEARCH_QUESTIONS.length > 0) {
      expect(getQuestion(RESEARCH_QUESTIONS[0].number)?.text).toBe(RESEARCH_QUESTIONS[0].text)
    }
  })

  it('filters questions by category in ascending order', () => {
    const forCategory = questionsForCategory(2)
    for (const q of forCategory) expect(q.category).toBe(2)
    const numbers = forCategory.map((q) => q.number)
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers)
  })
})

describe('NASA research library — search and filtering', () => {
  it('returns nothing for an empty query', () => {
    expect(filterQuestions(FIXTURES, '')).toEqual([])
    expect(filterQuestions(FIXTURES, '   ')).toEqual([])
    expect(searchQuestions('')).toEqual([])
  })

  it('matches question text case-insensitively', () => {
    const results = filterQuestions(FIXTURES, 'apollo')
    expect(results.map((q) => q.number)).toEqual([16, 42])
    expect(filterQuestions(FIXTURES, 'INTERNATIONAL')[0].number).toBe(200)
  })

  it('matches an exact question number', () => {
    expect(filterQuestions(FIXTURES, '16').map((q) => q.number)).toEqual([16])
    expect(filterQuestions(FIXTURES, '999')).toEqual([])
  })

  it('returns matches sorted by question number', () => {
    const results = filterQuestions(FIXTURES, 'the')
    const numbers = results.map((q) => q.number)
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers)
  })

  it('returns nothing when no question matches', () => {
    expect(filterQuestions(FIXTURES, 'quantum teleportation of cats')).toEqual([])
  })
})

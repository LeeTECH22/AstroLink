// NASA AI Research — research library data.
//
// The 21 categories and their question-number ranges are authoritative and
// mirror the server-side scope definition (server/lib/research.js). Question
// wording and numbering are preserved verbatim from the supplied project brief;
// nothing is renamed, merged or reordered.

export interface ResearchCategory {
  number: number
  title: string
  description: string
  startQuestion: number
  endQuestion: number
  count: number
}

export interface ResearchQuestion {
  number: number
  category: number
  text: string
}

const def = (
  number: number,
  title: string,
  description: string,
  startQuestion: number,
  endQuestion: number
): ResearchCategory => ({
  number,
  title,
  description,
  startQuestion,
  endQuestion,
  count: endQuestion - startQuestion + 1,
})

export const RESEARCH_CATEGORIES: ResearchCategory[] = [
  def(1, "NASA's Origins and Hidden History", 'How NASA was founded, its earliest programmes and the lesser-documented chapters of its formation.', 1, 15),
  def(2, 'Apollo Missions and the Moon Landing', 'The Apollo programme, its missions, crews and the engineering that reached the lunar surface.', 16, 40),
  def(3, 'Moon Landing Controversies and Conspiracy Theories', 'Claims, scepticism and the evidence surrounding the Apollo Moon landings.', 41, 53),
  def(4, 'NASA Astronauts: Human Stories', 'The people who flew, their lives, selection and experiences in space.', 54, 70),
  def(5, 'NASA Disasters, Accidents and Failures', 'Accidents, losses and the investigations that followed, including lessons learned.', 71, 86),
  def(6, 'UFOs, UAPs and Extraterrestrial Life', 'Unidentified phenomena, the search for life and how NASA addresses UAP reports.', 87, 106),
  def(7, "NASA's Mysterious Space Discoveries", 'Unexpected and puzzling findings from NASA missions and observatories.', 107, 125),
  def(8, "NASA's Famous Space Telescopes", 'Hubble, Webb, Chandra, Spitzer and the observatories that reshaped astronomy.', 126, 140),
  def(9, "NASA's Mars Exploration Stories", 'Rovers, landers, orbiters and the ongoing exploration of Mars.', 141, 157),
  def(10, "NASA's Voyager Missions and Interstellar Space", 'The Voyager probes, the heliosphere and the journey into interstellar space.', 158, 170),
  def(11, "NASA's Secret, Classified and Military-Related History", 'Declassified programmes, military links and the civilian/military boundary.', 171, 182),
  def(12, 'International Space Competition', 'The space race, international rivals and modern competition in space.', 183, 198),
  def(13, 'International Space Station', 'The assembly, operations, science and international partnership of the ISS.', 199, 211),
  def(14, "NASA's Forgotten, Cancelled and Abandoned Projects", 'Programmes that were cancelled, defunded or quietly shelved.', 212, 225),
  def(15, "NASA's Rocket and Aircraft Engineering", 'Launch vehicles, propulsion, experimental aircraft and aerospace engineering.', 226, 242),
  def(16, 'NASA and Earth: Discoveries About Our Own Planet', 'Earth science, climate observation and what NASA has learned about our planet.', 243, 256),
  def(17, 'The Sun, Moon and Solar System Mysteries', 'Solar physics, lunar science and open questions across the solar system.', 257, 272),
  def(18, "NASA's Biggest Scientific and Technological Contributions", 'Spin-offs, breakthroughs and technologies enabled by space exploration.', 273, 287),
  def(19, "NASA's Future Missions and Ambitions", 'Artemis, upcoming missions, and long-term exploration goals.', 288, 302),
  def(20, "NASA's Lesser-Known Stories and Unusual Events", 'Quirky, overlooked and surprising moments from NASA history.', 303, 320),
  def(21, "NASA's Biggest Unanswered Questions", 'The open scientific and historical questions NASA has yet to resolve.', 321, 340),
]

// --- Question bank -----------------------------------------------------------
//
// VERBATIM CONTENT PENDING: the 340 individual question texts supplied in the
// project brief have not yet been added to the repository. Once provided they
// are inserted here exactly as written, keeping their original numbering and
// category assignment. Until then the research workspace shows the category
// structure and a clear "content pending" state — it never fabricates
// questions.
export const RESEARCH_QUESTIONS: ResearchQuestion[] = []

export const TOTAL_EXPECTED_QUESTIONS = 340

export const getCategory = (number: number): ResearchCategory | undefined =>
  RESEARCH_CATEGORIES.find((c) => c.number === number)

export const getQuestion = (number: number): ResearchQuestion | undefined =>
  RESEARCH_QUESTIONS.find((q) => q.number === number)

export const questionsForCategory = (category: number): ResearchQuestion[] =>
  RESEARCH_QUESTIONS.filter((q) => q.category === category).sort((a, b) => a.number - b.number)

export const isQuestionBankLoaded = (): boolean =>
  RESEARCH_QUESTIONS.length >= TOTAL_EXPECTED_QUESTIONS

// Pure search/filter over an arbitrary question list. Kept separate from the
// module-level bank so it can be unit-tested against fixtures. Matches free
// text (case-insensitive substring) or an exact question number.
export const filterQuestions = (questions: ResearchQuestion[], query: string): ResearchQuestion[] => {
  const term = query.trim().toLowerCase()
  if (!term) return []
  const asNumber = /^\d+$/.test(term) ? Number(term) : null
  return questions
    .filter(
      (q) =>
        q.text.toLowerCase().includes(term) ||
        (asNumber !== null && q.number === asNumber)
    )
    .sort((a, b) => a.number - b.number)
}

// Search across the full question bank by free text or by question number.
// Returns an empty array for an empty query (the caller shows the category list).
export const searchQuestions = (query: string): ResearchQuestion[] =>
  filterQuestions(RESEARCH_QUESTIONS, query)

// Structural integrity check for the question bank. Returns a list of human
// readable problems; an empty array means the bank is fully consistent. Used by
// the automated tests and available for future ingestion validation.
export const validateQuestionBank = (): string[] => {
  const problems: string[] = []
  if (RESEARCH_QUESTIONS.length !== TOTAL_EXPECTED_QUESTIONS) {
    problems.push(
      `expected ${TOTAL_EXPECTED_QUESTIONS} question records, found ${RESEARCH_QUESTIONS.length}`
    )
  }
  const seen = new Set<number>()
  for (const q of RESEARCH_QUESTIONS) {
    if (seen.has(q.number)) problems.push(`duplicate question number ${q.number}`)
    seen.add(q.number)
    const category = getCategory(q.category)
    if (!category) {
      problems.push(`question ${q.number} references unknown category ${q.category}`)
    } else if (q.number < category.startQuestion || q.number > category.endQuestion) {
      problems.push(
        `question ${q.number} falls outside category ${category.number} range (${category.startQuestion}-${category.endQuestion})`
      )
    }
    if (!q.text.trim()) problems.push(`question ${q.number} has empty text`)
  }
  return problems
}

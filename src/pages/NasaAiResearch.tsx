import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles'
import Send from 'lucide-react/dist/esm/icons/send'
import Search from 'lucide-react/dist/esm/icons/search'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Trash from 'lucide-react/dist/esm/icons/trash'
import Copy from 'lucide-react/dist/esm/icons/copy'
import Check from 'lucide-react/dist/esm/icons/check'
import Bot from 'lucide-react/dist/esm/icons/bot'
import User from 'lucide-react/dist/esm/icons/user'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Info from 'lucide-react/dist/esm/icons/info'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import { getResearchQuestions, searchResearchQuestions } from '../services/api'
import type { ResearchChatMessage } from '../types'
import { RESEARCH_CATEGORIES } from '../data/nasaResearch'
import type { ResearchCategory } from '../data/nasaResearch'
import type { NasaResearchQuestion } from '../lib/supabase'
import Markdown from '../components/Markdown'

const RECENT_KEY = 'astrolink:recentResearch'
const MAX_RECENT = 8

interface RecentItem {
  kind: 'question' | 'category'
  id: number
  label: string
}

const loadRecent = (): RecentItem[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

const NasaAiResearch = () => {
  const [selectedCategory, setSelectedCategory] = useState<ResearchCategory | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<NasaResearchQuestion | null>(null)
  const [messages, setMessages] = useState<ResearchChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [copied, setCopied] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [composer, setComposer] = useState('')
  const [supabaseQuestions, setSupabaseQuestions] = useState<NasaResearchQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError, setQuestionsError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<{ questions: NasaResearchQuestion[]; categories: ResearchCategory[] } | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setRecent(loadRecent())
  }, [])

  // Load questions from Supabase when a category is selected
  useEffect(() => {
    if (selectedCategory) {
      setQuestionsLoading(true)
      setQuestionsError(null)
      getResearchQuestions(1, 340, selectedCategory.number)
        .then((response) => {
          setSupabaseQuestions(response.questions)
        })
        .catch((err) => {
          console.error('Failed to load questions:', err)
          setQuestionsError('Failed to load questions from database')
        })
        .finally(() => {
          setQuestionsLoading(false)
        })
    } else {
      setSupabaseQuestions([])
    }
  }, [selectedCategory])

  // Handle search using Supabase API
  useEffect(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      setSearchResults(null)
      return
    }

    setSearchLoading(true)
    const categories = RESEARCH_CATEGORIES.filter((c) => c.title.toLowerCase().includes(term))

    searchResearchQuestions(term, 1, 40)
      .then((response) => {
        setSearchResults({ questions: response.questions, categories })
      })
      .catch((err) => {
        console.error('Search failed:', err)
        setSearchResults({ questions: [], categories })
      })
      .finally(() => {
        setSearchLoading(false)
      })
  }, [search])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const persistRecent = useCallback((item: RecentItem) => {
    setRecent((prev) => {
      const next = [item, ...prev.filter((r) => !(r.kind === item.kind && r.id === item.id))].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // Storage unavailable (private mode) — keep it in memory only.
      }
      return next
    })
  }, [])

  const runResearch = useCallback(
    async (questionText: string, history: ResearchChatMessage[]) => {
      setLoading(true)
      setError(null)

      try {
        // Search for the question in Supabase
        const searchResult = await searchResearchQuestions(questionText, 1, 1)

        if (searchResult.questions.length > 0) {
          const question = searchResult.questions[0]
          // Display the stored answer from Supabase
          const answer = question.answer_material || question.scientific_background || 'No answer available.'
          setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
        } else {
          // No matching question found
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: 'This question is not currently available in the NASA research database. Try another research topic.'
          }])
        }
      } catch (err) {
        console.error('Research error:', err)
        setError('Failed to retrieve research data. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const startQuestion = useCallback(
    (question: NasaResearchQuestion) => {
      const category = RESEARCH_CATEGORIES.find((c) => c.number === question.category) || null
      setSelectedCategory(category)
      setSelectedQuestion(question)
      setMessages([{ role: 'user', content: question.question }])
      persistRecent({ kind: 'question', id: question.question_id, label: question.question })
      setSidebarOpen(false)
      void runResearch(question.question, [])
    },
    [persistRecent, runResearch]
  )

  const startCategoryOverview = useCallback(
    (category: ResearchCategory) => {
      const prompt = `Provide an overview of the research topic "${category.title}" (research library category ${category.number}). Summarise the key themes, the kind of evidence involved, and what is well documented versus still debated. This is topic ${category.startQuestion}-${category.endQuestion} of the NASA research library.`
      setSelectedCategory(category)
      setSelectedQuestion(null)
      setMessages([{ role: 'user', content: prompt }])
      persistRecent({ kind: 'category', id: category.number, label: category.title })
      setSidebarOpen(false)
      void runResearch(prompt, [])
    },
    [persistRecent, runResearch]
  )

  const sendFollowUp = useCallback(() => {
    const text = composer.trim()
    if (!text || loading) return
    setComposer('')
    const history = messages
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    void runResearch(text, history)
  }, [composer, loading, messages, runResearch])

  const newResearch = useCallback(() => {
    setSelectedCategory(null)
    setSelectedQuestion(null)
    setMessages([])
    setError(null)
    setComposer('')
    setLoading(false)
  }, [])

  const clearConversation = useCallback(() => {
    setMessages([])
    setError(null)
    setLoading(false)
  }, [])

  const copyAnswer = useCallback(async () => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant')
    const text = last?.content
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Copying to the clipboard was blocked by the browser.')
    }
  }, [messages])

  const suggestions = useMemo(() => {
    if (!selectedCategory) return []
    const pool = supabaseQuestions.filter(
      (q) => q.question_id !== selectedQuestion?.question_id
    )
    return pool.slice(0, 4)
  }, [selectedCategory, selectedQuestion, supabaseQuestions])

  const categoryQuestions = supabaseQuestions
  const hasConversation = messages.length > 0 || loading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-cyan" />
            <h1 className="page-title">NASA AI Research</h1>
          </div>
          <p className="page-subtitle max-w-3xl">
            A dedicated research assistant for the {RESEARCH_CATEGORIES.length}-category NASA research library
            (340 questions). Answers are grounded in official NASA and scientific sources and
            stay strictly within NASA &amp; space-exploration topics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-success">Supabase Database</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={newResearch} className="btn btn-secondary">
          <Plus className="h-4 w-4" /> New Research
        </button>
        <button onClick={clearConversation} className="btn btn-secondary" disabled={!hasConversation}>
          <Trash className="h-4 w-4" /> Clear Conversation
        </button>
        <button
          onClick={copyAnswer}
          className="btn btn-secondary"
          disabled={!messages.some((m) => m.role === 'assistant')}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy Answer'}
        </button>
        <button onClick={() => setSidebarOpen((v) => !v)} className="btn btn-secondary lg:hidden">
          <BookOpen className="h-4 w-4" /> Topics
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left panel — categories, questions and search */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="card p-4 space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics or question numbers"
                className="input pl-9"
                aria-label="Search NASA research topics"
              />
            </div>

            {searchResults ? (
              <div className="space-y-3">
                {searchResults.categories.length > 0 && (
                  <div>
                    <p className="label">Categories</p>
                    <ul className="mt-1 space-y-1">
                      {searchResults.categories.map((c) => (
                        <li key={c.number}>
                          <button
                            onClick={() => {
                              setSelectedCategory(c)
                              setSearch('')
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-elevated"
                          >
                            <span className="text-ink-muted">{c.number}.</span> {c.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="label">Questions ({searchResults.questions.length})</p>
                  {searchResults.questions.length === 0 ? (
                    <p className="helper-text mt-1">No matching questions.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {searchResults.questions.map((q) => (
                        <li key={q.question_id}>
                          <button
                            onClick={() => startQuestion(q)}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-elevated"
                          >
                            <span className="text-ink-muted">Q{q.question_id}.</span> {q.question}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="label">Research categories</p>
                {RESEARCH_CATEGORIES.map((c) => (
                  <button
                    key={c.number}
                    onClick={() => {
                      setSelectedCategory(c)
                      setSidebarOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory?.number === c.number
                        ? 'bg-brand/15 text-ink'
                        : 'text-ink-soft hover:bg-surface-elevated'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="text-ink-muted">{c.number}.</span> {c.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink-muted">{c.count}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedCategory && (
              <div className="border-t border-surface-border pt-4">
                <p className="label">
                  {selectedCategory.title} · {selectedCategory.count} questions
                </p>
                {categoryQuestions.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {categoryQuestions.map((q) => (
                      <li key={q.question_id}>
                        <button
                          onClick={() => startQuestion(q)}
                          className={`flex w-full gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selectedQuestion?.question_id === q.question_id
                              ? 'bg-brand/15 text-ink'
                              : 'text-ink-soft hover:bg-surface-elevated'
                          }`}
                        >
                          <span className="shrink-0 text-ink-muted">{q.question_id}.</span>
                          <span>{q.question}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 space-y-3">
                    <p className="helper-text">
                      {questionsLoading ? 'Loading questions...' : questionsError ? questionsError : 'No questions are assigned to this category yet.'}
                    </p>
                    <button onClick={() => startCategoryOverview(selectedCategory)} className="btn btn-primary w-full">
                      <Sparkles className="h-4 w-4" /> Ask about this category
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right panel — conversation / welcome */}
        <section className="min-w-0">
          <div className="card flex min-h-[60vh] flex-col">
            {hasConversation ? (
              <>
                {/* Selected topic bar */}
                <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
                  <span className="badge badge-info">
                    {selectedQuestion
                      ? `Q${selectedQuestion.question_id}`
                      : selectedCategory
                        ? `Category ${selectedCategory.number}`
                        : 'Research'}
                  </span>
                  <span className="min-w-0 truncate text-sm text-ink-soft">
                    {selectedQuestion?.question || selectedCategory?.title || 'NASA AI Research'}
                  </span>
                </div>

                {/* Conversation */}
                <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                      {m.role === 'assistant' && (
                        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-brand/20 p-1.5">
                          <Bot className="h-full w-full text-brand-cyan" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          m.role === 'user'
                            ? 'bg-brand/20 text-ink'
                            : 'bg-surface-panel text-ink-soft'
                        }`}
                      >
                        {m.role === 'assistant' ? <Markdown content={m.content} /> : <p className="text-sm">{m.content}</p>}
                      </div>
                      {m.role === 'user' && (
                        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-surface-elevated p-1.5">
                          <User className="h-full w-full text-ink-soft" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-3">
                      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-brand/20 p-1.5">
                        <Bot className="h-full w-full text-brand-cyan" />
                      </div>
                      <div className="max-w-[85%] rounded-2xl bg-surface-panel px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-ink-muted">
                          <span className="spinner h-4 w-4" /> Loading research data…
                        </div>
                      </div>
                    </div>
                  )}

                  {suggestions.length > 0 && !loading && (
                    <div className="pt-2">
                      <p className="label">Suggested questions from this category</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestions.map((q) => (
                          <button
                            key={q.question_id}
                            onClick={() => startQuestion(q)}
                            className="rounded-full border border-surface-border bg-surface-panel px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
                          >
                            Q{q.question_id}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="border-t border-surface-border p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={composer}
                      onChange={(e) => setComposer(e.target.value.slice(0, 1000))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendFollowUp()
                        }
                      }}
                      rows={1}
                      placeholder="Ask a follow-up about this research topic…"
                      className="textarea min-h-[44px] flex-1 resize-none"
                      aria-label="Follow-up question"
                    />
                    {loading ? (
                      <button disabled className="btn btn-secondary" aria-label="Loading">
                        <span className="spinner h-4 w-4" /> Loading…
                      </button>
                    ) : (
                      <button
                        onClick={sendFollowUp}
                        disabled={!composer.trim()}
                        className="btn btn-primary"
                        aria-label="Send follow-up question"
                      >
                        <Send className="h-4 w-4" /> Send
                      </button>
                    )}
                  </div>
                  <p className="helper-text mt-1.5">
                    Follow-ups must stay relevant to the selected NASA research topic. Off-topic requests are declined.
                  </p>
                </div>
              </>
            ) : (
              /* Welcome / discovery */
              <div className="p-6">
                <div className="mx-auto max-w-3xl text-center">
                  <h2 className="text-2xl font-semibold text-ink">Explore NASA research</h2>
                  <p className="mt-2 text-ink-soft">
                    Choose a research category or a question to begin. The assistant investigates only the NASA
                    &amp; space-exploration topics in this library — never unrelated subjects.
                  </p>
                </div>

                {recent.length > 0 && (
                  <div className="mx-auto mt-6 max-w-3xl">
                    <p className="label">Recently viewed</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recent.map((r) => {
                        const category = r.kind === 'category' ? RESEARCH_CATEGORIES.find((c) => c.number === r.id) : null
                        return (
                          <button
                            key={`${r.kind}-${r.id}`}
                            onClick={() => {
                              if (category) startCategoryOverview(category)
                            }}
                            className="rounded-full border border-surface-border bg-surface-panel px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
                          >
                            {r.kind === 'question' ? `Q${r.id}` : `Cat ${r.id}`} · {r.label.slice(0, 48)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {RESEARCH_CATEGORIES.map((c) => (
                    <motion.button
                      key={c.number}
                      whileHover={{ y: -2 }}
                      onClick={() => startCategoryOverview(c)}
                      className="card card-hover flex h-full flex-col p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="badge badge-info">Category {c.number}</span>
                        <span className="text-xs text-ink-muted">{c.count} questions</span>
                      </div>
                      <h3 className="mt-3 font-semibold text-ink">{c.title}</h3>
                      <p className="mt-1 flex-1 text-sm text-ink-soft">{c.description}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand">
                        Explore <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default NasaAiResearch

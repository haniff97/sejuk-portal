import { useEffect, useRef, useState } from 'react';
import Spinner from './Spinner';
import { useStagedMessage } from '../lib/useStagedMessage';
import { stripMarkdown } from '../lib/formatAnswer';

interface QA {
  question: string;
  answer: string;
  error?: boolean;
}

const EXAMPLE_QUESTIONS = [
  'How many jobs were completed today?',
  'Which technician completed the most jobs this week?',
  'What jobs did Ali complete this week?',
];

const LOADING_STAGES = ['Reading your question…', 'Checking job records…', 'Putting together an answer…'];
const LOADING_DELAYS = [900, 1800];

export default function AIQueryPanel() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadingMessage = useStagedMessage(loading, LOADING_STAGES, LOADING_DELAYS);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, loading]);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setQuestion('');

    try {
      const res = await fetch('/api/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHistory((prev) => [...prev, { question: q, answer: data.error ?? 'Request failed.', error: true }]);
      } else {
        setHistory((prev) => [...prev, { question: q, answer: stripMarkdown(data.answer) }]);
      }
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        { question: q, answer: 'Could not reach the AI query service.', error: true },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-100 bg-white shadow-xl shadow-indigo-100/20 p-6">
      <h2 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 mb-2 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#ai-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="ai-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"></path><path d="M12 18a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z"></path><path d="M4.93 4.93a2 2 0 0 1 2.83 0l1.41 1.41a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0L4.93 7.76a2 2 0 0 1 0-2.83Z"></path><path d="M19.07 19.07a2 2 0 0 1-2.83 0l-1.41-1.41a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l1.41 1.41a2 2 0 0 1 0 2.83Z"></path><path d="M2 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"></path><path d="M18 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z"></path><path d="M4.93 19.07a2 2 0 0 1 0-2.83l1.41-1.41a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-1.41 1.41a2 2 0 0 1-2.83 0Z"></path><path d="M19.07 4.93a2 2 0 0 1 0 2.83l-1.41 1.41a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l1.41-1.41a2 2 0 0 1 2.83 0Z"></path>
        </svg>
        Ask about operations
      </h2>
      <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
        Answers are generated from live order data via controlled queries — not free-form
        database access. A question typically takes a few seconds since it's two AI calls
        (pick the right query, then explain the result).
      </p>

      {history.length === 0 && !loading && (
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="text-xs rounded-full border border-indigo-200 bg-indigo-50/50 px-4 py-2 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 font-semibold transition-colors shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="space-y-4 mb-4 max-h-72 overflow-y-auto scroll-smooth pr-2">
        {history.map((qa, i) => (
          <div key={i} className="text-sm bg-slate-50/80 rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="text-slate-900 font-bold flex items-start gap-2 mb-2">
              <span className="text-violet-600 bg-violet-100 p-1 rounded-full shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              {qa.question}
            </div>
            <div className={`pl-7 ${qa.error ? 'text-red-600 font-medium' : 'text-slate-700 whitespace-pre-wrap'}`}>
              {qa.answer}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-3 text-sm text-indigo-600 font-medium bg-indigo-50 rounded-xl p-4 border border-indigo-100 shadow-sm animate-pulse">
            <Spinner className="text-indigo-600" />
            <span>{loadingMessage}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(question)}
          placeholder="e.g. How many jobs did Bala complete this week?"
          disabled={loading}
          className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-inner disabled:opacity-50 transition-all"
        />
        <button
          onClick={() => ask(question)}
          disabled={loading || !question.trim()}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm px-6 py-2 font-bold shadow-md hover:shadow-lg transition-all min-w-[80px] flex items-center justify-center"
        >
          {loading ? <Spinner className="text-white" /> : 'Ask'}
        </button>
      </div>
    </section>
  );
}

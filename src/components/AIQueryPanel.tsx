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
    <section className="rounded-lg border border-slate-800 p-4">
      <h2 className="text-lg font-semibold mb-1">Ask about operations</h2>
      <p className="text-sm text-slate-500 mb-3">
        Answers are generated from live order data via controlled queries — not free-form
        database access. A question typically takes a few seconds since it's two AI calls
        (pick the right query, then explain the result).
      </p>

      {history.length === 0 && !loading && (
        <div className="flex flex-wrap gap-2 mb-3">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="text-xs rounded-full border border-slate-700 px-3 py-1 text-slate-400 hover:text-slate-200 hover:border-slate-500"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="space-y-3 mb-3 max-h-72 overflow-y-auto scroll-smooth">
        {history.map((qa, i) => (
          <div key={i} className="text-sm">
            <div className="text-slate-300 font-medium">{qa.question}</div>
            <div className={qa.error ? 'text-red-400' : 'text-slate-400 whitespace-pre-wrap'}>
              {qa.answer}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner />
            <span>{loadingMessage}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(question)}
          placeholder="e.g. How many jobs did Bala complete this week?"
          disabled={loading}
          className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
        />
        <button
          onClick={() => ask(question)}
          disabled={loading || !question.trim()}
          className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm px-4 py-2 min-w-[64px] flex items-center justify-center"
        >
          {loading ? <Spinner className="text-white" /> : 'Ask'}
        </button>
      </div>
    </section>
  );
}

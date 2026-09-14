'use client';

import { useEffect, useState, use } from 'react';

type Job = {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  errorMessage: string | null;
  aiResult: {
    parsedResult: any;
    rawOutput: string;
  } | null;
  followUpResult: any[];
};

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/ai/job/${id}`);
      if (!res.ok) throw new Error('Failed to fetch job');
      const data = await res.json();
      setJob(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchJob();
    const interval = setInterval(() => {
      if (job?.status === 'pending' || job?.status === 'processing' || !job) {
        fetchJob();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [id, job?.status]);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/ai/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarize');
      await fetchJob();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!job) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-4">Job Status: <span className="uppercase text-blue-600">{job.status}</span></h1>
      
      {job.status === 'failed' && (
        <div className="bg-red-50 text-red-700 p-4 rounded mb-4">
          <strong>Error:</strong> {job.errorMessage}
        </div>
      )}

      {job.status === 'done' && job.aiResult && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Extracted Expense Details</h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(job.aiResult.parsedResult, null, 2)}</pre>
          </div>
          
          <div className="mt-6">
            <h3 className="font-medium text-gray-700 mb-2">Raw OCR Output (Evidence)</h3>
            <div className="bg-gray-100 p-3 rounded text-xs text-gray-600 max-h-40 overflow-y-auto">
              {job.aiResult.rawOutput}
            </div>
          </div>

          <div className="mt-6">
            <button 
              onClick={handleSummarize}
              disabled={isSummarizing || job.followUpResult?.length > 0}
              className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isSummarizing ? 'Generating summary...' : 'Generate Short Summary'}
            </button>
          </div>

          {job.followUpResult && job.followUpResult.length > 0 && (
            <div className="mt-6 bg-green-50 p-4 rounded border border-green-200">
              <h2 className="text-xl font-semibold mb-2 text-green-800">Summary</h2>
              <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(job.followUpResult[0].result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { requireAuth } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import '../ai.css';
import Link from 'next/link';

export const metadata = {
  title: 'AI Jobs — AI Integration Slice',
};

export default async function JobsPage() {
  const session = await requireAuth();

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id },
    include: {
      fileAsset: true,
      aiResult: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="ai-page-container">
      <main className="ai-card" style={{ maxWidth: '900px' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="ai-title text-3xl font-bold">Processing History</h1>
            <p className="ai-subtitle">View your recent AI extraction jobs and their statuses.</p>
          </div>
          <Link href="/ai" className="ai-submit-btn !w-auto !inline-block px-4 py-2 text-center" style={{ width: '150px' }}>
            Upload New
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-10 text-zinc-400">
            No jobs found. Upload a file to get started.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-700/50">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800/50 text-zinc-300 border-b border-zinc-700/50">
                <tr>
                  <th className="p-3 font-medium">Job ID</th>
                  <th className="p-3 font-medium">File</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Error / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50 text-zinc-300">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{job.id.slice(0, 8)}...</td>
                    <td className="p-3">{job.fileAsset.originalName}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        job.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                        job.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        job.status === 'processing' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                        'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {job.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">{job.createdAt.toLocaleString()}</td>
                    <td className="p-3 text-red-400 text-xs">
                      {job.errorMessage ? (
                        <div className="max-w-xs break-words">{job.errorMessage}</div>
                      ) : job.aiResult ? (
                        <span className="text-emerald-400">Processed</span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';

export default function Home() {
  const [markdown, setMarkdown] = useState(
    '# Test Document\n\nThis is a test document with some math.\n\nInline math: $a^2 + b^2 = c^2$\n\nBlock math:\n$$ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$\n\nAnd a list:\n1. First item\n2. Second item'
  );
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown, filename: 'test-math' })
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test-math.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Failed to export DOCX');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Markdown to DOCX with Native Math</h1>
      <p className="text-gray-600">
        Enter Markdown with LaTeX math (using <code>$...$</code> or <code>$$...$$</code>) and export it to a DOCX file with native Word equations (OMML).
      </p>
      
      <textarea
        className="w-full h-64 p-4 border rounded-lg font-mono text-sm text-gray-900"
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
      />
      
      <button
        onClick={handleExport}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 self-start"
      >
        {loading ? 'Generating...' : 'Export to DOCX'}
      </button>
    </main>
  );
}

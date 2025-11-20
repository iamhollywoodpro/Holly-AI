'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Code blocks
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : 'text';
          const code = String(children).replace(/\n$/, '');

          return !inline ? (
            <CodeBlock code={code} language={language} showLineNumbers={true} />
          ) : (
            <code
              className="px-1.5 py-0.5 rounded bg-gray-800/60 text-purple-400 font-mono text-sm border border-gray-700/50"
              {...props}
            >
              {children}
            </code>
          );
        },

        // Headings
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold text-white mt-6 mb-4 pb-2 border-b border-gray-700/50">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold text-white mt-5 mb-3">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold text-white mt-4 mb-2">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold text-gray-200 mt-3 mb-2">
            {children}
          </h4>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className="mb-4 leading-relaxed text-gray-100">
            {children}
          </p>
        ),

        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-4 space-y-2 text-gray-100">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-100">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="ml-4 text-gray-100">
            {children}
          </li>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/30 hover:decoration-purple-300 transition-colors"
          >
            {children}
          </a>
        ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-purple-500/50 pl-4 py-2 my-4 bg-gray-800/30 rounded-r italic text-gray-300">
            {children}
          </blockquote>
        ),

        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-gray-700/50 rounded-lg overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-800/50">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-gray-700/50">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-gray-800/30 transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-200">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 text-sm text-gray-300">
            {children}
          </td>
        ),

        // Horizontal Rule
        hr: () => (
          <hr className="my-6 border-t border-gray-700/50" />
        ),

        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-bold text-white">
            {children}
          </strong>
        ),

        // Emphasis/Italic
        em: ({ children }) => (
          <em className="italic text-gray-200">
            {children}
          </em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

import React from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = marked(content);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

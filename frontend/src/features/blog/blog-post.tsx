import React from 'react';
import { ArrowLeft, Calendar, Tag, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { playSound } from '@/lib/sounds';
import { useTranslation } from '@/lib/i18n';
import { getPost } from './post-loader';

interface BlogPostProps {
  slug: string;
  onBack: () => void;
  onProjectLink?: (projectId: string) => void;
}

function formatDate(date: string, lang: 'es' | 'en'): string {
  const months = {
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  }[lang];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const day = parseInt(m[3], 10);
  const month = months[parseInt(m[2], 10) - 1];
  const year = m[1];
  return lang === 'es' ? `${day} de ${month} de ${year}` : `${month} ${day}, ${year}`;
}

export const BlogPost: React.FC<BlogPostProps> = ({ slug, onBack, onProjectLink }) => {
  const { t, language } = useTranslation();
  const post = getPost(slug, language);

  if (!post) {
    return (
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
          <button
            onClick={() => {
              playSound('pop');
              onBack();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border text-sm font-medium text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('detail.back')}
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center text-muted-foreground">
          <p>{t('blog.notFound')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={() => {
            playSound('pop');
            onBack();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border text-sm font-medium text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('detail.back')}
        </button>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(post.frontmatter.date, language)}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            {post.frontmatter.title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {post.frontmatter.description}
          </p>
          {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border text-xs text-muted-foreground"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {post.fellBack && (
            <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-300">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                {language === 'es'
                  ? 'Este post aún no está traducido al español. Lo lees en inglés.'
                  : 'This post is not translated to English yet. You are reading the Spanish version.'}
              </p>
            </div>
          )}

          {post.frontmatter.projectId && onProjectLink && (
            <button
              onClick={() => {
                playSound('pop');
                onProjectLink(post.frontmatter.projectId!);
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              {t('blog.viewRelatedProject')} →
            </button>
          )}
        </header>

        {/* Prose: tipografía amable para lectura larga, estilo markdown-rendered. */}
        <div className="prose-blog">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-black tracking-tight text-foreground mt-10 mb-4">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-3">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-bold text-foreground mt-8 mb-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-base text-foreground/90 leading-relaxed my-4">{children}</p>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="text-accent hover:text-accent/80 underline underline-offset-2"
                >
                  {children}
                </a>
              ),
              code: ({ className, children }) => {
                const isInline = !className?.includes('language-');
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-muted/70 text-foreground font-mono text-[0.9em]">
                      {children}
                    </code>
                  );
                }
                return <code className={className}>{children}</code>;
              },
              pre: ({ children }) => (
                <pre className="my-5 p-4 rounded-xl bg-muted/60 border border-border overflow-x-auto text-sm font-mono leading-relaxed">
                  {children}
                </pre>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside pl-6 my-4 space-y-1.5 text-foreground/90">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside pl-6 my-4 space-y-1.5 text-foreground/90">
                  {children}
                </ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-5 pl-4 border-l-4 border-accent/60 italic text-foreground/80">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-8 border-border" />,
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt}
                  className="my-6 rounded-xl border border-border shadow-md w-full"
                  loading="lazy"
                />
              ),
              table: ({ children }) => (
                <div className="my-5 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border-b-2 border-border px-3 py-2 text-left font-bold text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-border/60 px-3 py-2 text-foreground/90">{children}</td>
              ),
            }}
          >
            {post.body}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
};

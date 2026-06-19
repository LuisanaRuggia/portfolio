import React from 'react';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';

import { playSound } from '@/lib/sounds';
import { useTranslation } from '@/lib/i18n';
import { listPosts } from './post-loader';

interface BlogIndexProps {
  onBack: () => void;
  onOpenPost: (slug: string) => void;
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

export const BlogIndex: React.FC<BlogIndexProps> = ({ onBack, onOpenPost }) => {
  const { t, language } = useTranslation();
  const posts = listPosts(language);

  return (
    <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
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

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="border-b border-border pb-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {t('blog.title')}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-muted-foreground">{t('blog.subtitle')}</p>
        </header>

        {posts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-base">{t('blog.empty')}</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {posts.map((post) => (
              <button
                key={post.slug}
                onClick={() => {
                  playSound('pop');
                  onOpenPost(post.slug);
                }}
                onMouseEnter={() => playSound('whoosh')}
                className="group text-left p-5 sm:p-6 rounded-2xl bg-card border border-border hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.frontmatter.date, language)}
                  </span>
                  {!post.availableLanguages.includes(language) && (
                    <span className="text-amber-500 font-medium">
                      {language === 'es' ? '· (solo en inglés)' : '· (Spanish only)'}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-accent transition-colors">
                  {post.frontmatter.title}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-foreground/85 leading-relaxed">
                  {post.frontmatter.description}
                </p>
                {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
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
              </button>
            ))}
          </div>
        )}
      </article>
    </main>
  );
};

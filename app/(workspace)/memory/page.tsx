'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Brain, Search, Trash2, Pencil, X, Check, ChevronDown,
  MessageSquare, Sparkles, Heart, Settings, Loader2,
  AlertTriangle, Database, Clock, Tag, ChevronRight,
} from 'lucide-react';
// Holly emerald/copper color palette
const C = {
  primary: { cyan: '#66CCCC', purple: '#C7B8EA', pink: '#66CCCC' },
  background: { primary: '#0A0908', secondary: '#141210', tertiary: '#1E1B18', elevated: '#1E1B18' },
  text: { primary: '#F5F0E8', secondary: '#8C8476', tertiary: '#5C564D', muted: '#5C564D' },
  accent: { success: '#66CCCC', error: '#B84052' },
  gradients: {
    primary: 'linear-gradient(135deg, #66CCCC 0%, #C7B8EA 100%)',
    holographic: 'linear-gradient(135deg, #C7B8EA 0%, #66CCCC 50%, #66CCCC 100%)',
  },
  border: { primary: '#2A2520', accent: '#3A3430' },
};

type MemoryType = 'all' | 'conversation' | 'semantic' | 'emotional' | 'preference';

interface Memory {
  id: string;
  rawId: string;
  type: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  relevanceScore: number | null;
  [key: string]: any;
}

const TYPE_TABS: { id: MemoryType; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Database },
  { id: 'conversation', label: 'Conversations', icon: MessageSquare },
  { id: 'semantic', label: 'Semantic', icon: Sparkles },
  { id: 'emotional', label: 'Emotional', icon: Heart },
  { id: 'preference', label: 'Preferences', icon: Settings },
];

const TYPE_COLORS: Record<string, string> = {
  conversation: C.primary.cyan,
  semantic: C.primary.purple,
  emotional: C.primary.pink,
  preference: C.accent.success,
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return months < 12 ? `${months}mo ago` : date.toLocaleDateString();
}

function MemoryCard({
  memory,
  onDelete,
  onEdit,
}: {
  memory: Memory;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(memory.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const typeColor = TYPE_COLORS[memory.type] || C.primary.purple;

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(memory.id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onEdit(memory.id, editContent);
    setSaving(false);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(memory.content);
    setEditing(false);
  };

  const isLong = memory.content.length > 120;

  return (
    <div
      style={{
        background: C.background.tertiary,
        border: `1px solid ${C.border.primary}`,
        borderRadius: '12px',
        padding: '1rem',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = typeColor;
        e.currentTarget.style.boxShadow = `0 0 20px ${typeColor}22`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border.primary;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: `${typeColor}22`,
                color: typeColor,
                border: `1px solid ${typeColor}44`,
              }}
            >
              <Tag style={{ width: '10px', height: '10px' }} />
              {memory.type}
            </span>

            {memory.relevanceScore != null && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: C.text.tertiary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <Sparkles style={{ width: '10px', height: '10px' }} />
                {(memory.relevanceScore * 100).toFixed(0)}%
              </span>
            )}

            <span style={{ fontSize: '0.7rem', color: C.text.muted, marginLeft: 'auto' }}>
              {formatRelativeTime(memory.createdAt)}
            </span>
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  background: C.background.secondary,
                  border: `1px solid ${C.border.accent}`,
                  borderRadius: '8px',
                  padding: '0.5rem',
                  color: C.text.primary,
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: C.accent.success,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {saving ? <Loader2 style={{ width: '12px', height: '12px' }} className="animate-spin" /> : <Check style={{ width: '12px', height: '12px' }} />}
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: C.background.elevated,
                    color: C.text.secondary,
                    border: `1px solid ${C.border.primary}`,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  <X style={{ width: '12px', height: '12px' }} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p
                style={{
                  color: C.text.secondary,
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: expanded ? 'unset' : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: expanded ? 'visible' : 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {memory.content}
              </p>
              {isLong && !expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.primary.cyan,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: '2px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    marginTop: '4px',
                  }}
                >
                  Show more <ChevronDown style={{ width: '12px', height: '12px' }} />
                </button>
              )}
              {expanded && isLong && (
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.primary.cyan,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: '2px 0',
                    marginTop: '4px',
                  }}
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>

        {!editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              style={{
                background: 'transparent',
                border: 'none',
                color: C.text.tertiary,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = C.primary.cyan;
                e.currentTarget.style.background = `${C.primary.cyan}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.text.tertiary;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Pencil style={{ width: '14px', height: '14px' }} />
            </button>

            {confirmDelete ? (
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Confirm delete"
                  style={{
                    background: `${C.accent.error}33`,
                    border: `1px solid ${C.accent.error}`,
                    color: C.accent.error,
                    cursor: deleting ? 'wait' : 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {deleting ? <Loader2 style={{ width: '12px', height: '12px' }} className="animate-spin" /> : <Check style={{ width: '12px', height: '12px' }} />}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  title="Cancel"
                  style={{
                    background: `${C.background.elevated}`,
                    border: `1px solid ${C.border.primary}`,
                    color: C.text.secondary,
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X style={{ width: '12px', height: '12px' }} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.text.tertiary,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = C.accent.error;
                  e.currentTarget.style.background = `${C.accent.error}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = C.text.tertiary;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 style={{ width: '14px', height: '14px' }} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryPageContent() {
  const { user, isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [activeType, setActiveType] = useState<MemoryType>(
    (searchParams.get('type') as MemoryType) ?? 'all'
  );
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [typeBreakdown, setTypeBreakdown] = useState({
    conversation: 0,
    semantic: 0,
    emotional: 0,
    preference: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchMemories = useCallback(
    async (cursor?: string) => {
      try {
        if (!cursor) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (activeType !== 'all') params.set('type', activeType);
        params.set('limit', '30');
        if (cursor) params.set('cursor', cursor);

        const res = await fetch(`/api/memory?${params}`);
        if (!res.ok) throw new Error('Failed to fetch memories');

        const data = await res.json();

        if (cursor) {
          setMemories((prev) => [...prev, ...data.memories]);
        } else {
          setMemories(data.memories);
        }

        setHasMore(data.hasMore ?? false);
        setTotal(data.total ?? 0);
        if (data.typeBreakdown) setTypeBreakdown(data.typeBreakdown);
        if (data.lastUpdated) setLastUpdated(data.lastUpdated);

        const semRes = await fetch(
          `/api/memory/semantic?search=${encodeURIComponent(search)}&limit=20`
        );
        if (semRes.ok) {
          const semData = await semRes.json();
          if (!cursor) {
            const existingIds = new Set(data.memories.map((m: Memory) => m.id));
            const newSemantic = semData.memories.filter(
              (m: Memory) => !existingIds.has(m.id)
            );
            if (activeType === 'all' || activeType === 'semantic') {
              setMemories((prev) => {
                const combined = [...prev, ...newSemantic];
                combined.sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime()
                );
                return combined;
              });
            }
            setTotal((prev) => prev + newSemantic.length);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch memories:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, activeType]
  );

  useEffect(() => {
    if (isSignedIn) {
      fetchMemories();
    }
  }, [fetchMemories, isSignedIn]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleEdit = async (id: string, content: string) => {
    try {
      const res = await fetch('/api/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content }),
      });
      if (!res.ok) throw new Error('Update failed');
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content } : m))
      );
    } catch (err) {
      console.error('Edit error:', err);
    }
  };

  if (!isLoaded) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '60vh',
        }}
      >
        <Loader2
          style={{ width: '32px', height: '32px', color: C.primary.cyan }}
          className="animate-spin"
        />
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${C.primary.purple}, ${C.primary.cyan})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain style={{ width: '22px', height: '22px', color: '#fff' }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: C.text.primary,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Memory
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: C.text.tertiary,
                margin: 0,
              }}
            >
              What HOLLY knows about you
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: C.background.tertiary,
            border: `1px solid ${C.border.primary}`,
            borderRadius: '10px',
            padding: '0.75rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: C.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Memories
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.primary.cyan }}>
            {total}
          </div>
        </div>

        <div
          style={{
            background: C.background.tertiary,
            border: `1px solid ${C.border.primary}`,
            borderRadius: '10px',
            padding: '0.75rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: C.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock style={{ width: '10px', height: '10px' }} />
            Last Updated
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: C.text.primary }}>
            {lastUpdated ? formatRelativeTime(lastUpdated) : 'Never'}
          </div>
        </div>

        {Object.entries(typeBreakdown).map(([tKey, tCount]) => {
          const color = TYPE_COLORS[tKey] || C.text.tertiary;
          return (
            <div
              key={tKey}
              style={{
                background: C.background.tertiary,
                border: `1px solid ${C.border.primary}`,
                borderRadius: '10px',
                padding: '0.75rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {tKey}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text.primary }}>
                {tCount as number}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            color: C.text.muted,
          }}
        />
        <input
          type="text"
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.65rem 0.75rem 0.65rem 2.25rem',
            background: C.background.tertiary,
            border: `1px solid ${C.border.primary}`,
            borderRadius: '10px',
            color: C.text.primary,
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = C.primary.cyan;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = C.border.primary;
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: C.text.muted,
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {TYPE_TABS.map((tab) => {
          const isActive = activeType === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.4rem 0.875rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 400,
                border: `1px solid ${isActive ? C.primary.cyan : C.border.primary}`,
                background: isActive ? `${C.primary.cyan}18` : 'transparent',
                color: isActive ? C.primary.cyan : C.text.tertiary,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <IconComp style={{ width: '13px', height: '13px' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '1rem',
            background: `${C.accent.error}15`,
            border: `1px solid ${C.accent.error}44`,
            borderRadius: '10px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: C.accent.error,
            fontSize: '0.875rem',
          }}
        >
          <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            gap: '1rem',
          }}
        >
          <Loader2
            style={{ width: '28px', height: '28px', color: C.primary.cyan }}
            className="animate-spin"
          />
          <p style={{ color: C.text.tertiary, fontSize: '0.875rem' }}>
            Loading memories...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && memories.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 1rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: `${C.primary.purple}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <Brain style={{ width: '32px', height: '32px', color: C.primary.purple }} />
          </div>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: C.text.primary,
              marginBottom: '0.5rem',
            }}
          >
            No memories found
          </h3>
          <p style={{ color: C.text.tertiary, fontSize: '0.875rem', maxWidth: '360px' }}>
            {search
              ? `No memories match "${search}". Try a different search term.`
              : "HOLLY hasn't formed any memories yet. Start chatting to build your memory!"}
          </p>
        </div>
      )}

      {/* Memory Cards */}
      {!loading && memories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && memories.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => {
              const lastMemory = memories[memories.length - 1];
              if (lastMemory) fetchMemories(lastMemory.id);
            }}
            disabled={loadingMore}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              background: C.background.tertiary,
              border: `1px solid ${C.border.primary}`,
              color: C.text.secondary,
              fontSize: '0.875rem',
              cursor: loadingMore ? 'wait' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.primary.cyan;
              e.currentTarget.style.color = C.primary.cyan;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border.primary;
              e.currentTarget.style.color = C.text.secondary;
            }}
          >
            {loadingMore ? (
              <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
            ) : (
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            )}
            Load more memories
          </button>
        </div>
      )}
    </div>
  );
}

export default function MemoryPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '60vh',
          }}
        >
          <Loader2
            style={{ width: '32px', height: '32px', color: C.primary.cyan }}
            className="animate-spin"
          />
        </div>
      }
    >
      <MemoryPageContent />
    </Suspense>
  );
}

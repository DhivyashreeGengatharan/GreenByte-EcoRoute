import React from 'react';

export interface PipelineStep {
  label: string;
  status: 'pending' | 'running' | 'done';
}

export interface PipelineVisualizerProps {
  steps: PipelineStep[];
  title?: string;
  className?: string;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ steps, title, className = '' }) => {
  return (
    <div 
      className={`rounded-xl border border-[var(--color-border-subtle,rgba(255,255,255,0.08))] bg-[var(--color-bg-card,#0f172a)] p-4 ${className}`}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
      }}
    >
      {title && (
        <p className="text-xs font-mono text-[var(--color-text-muted,#94a3b8)] uppercase tracking-wider mb-3 font-semibold flex items-center justify-between">
          <span>{title}</span>
          <span className="text-[10px] text-[var(--color-accent-cyan,#00f0ff)] font-mono">
            {steps.filter(s => s.status === 'done').length}/{steps.length} COMPLETE
          </span>
        </p>
      )}
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-sm py-0.5">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-mono font-bold transition-all duration-300"
              style={{
                background: step.status === 'done' 
                  ? 'rgba(0, 255, 157, 0.2)' 
                  : step.status === 'running' 
                    ? 'rgba(0, 240, 255, 0.2)' 
                    : 'rgba(255, 255, 255, 0.06)',
                color: step.status === 'done' 
                  ? 'var(--color-accent-emerald, #00ff9d)' 
                  : step.status === 'running' 
                    ? 'var(--color-accent-cyan, #00f0ff)' 
                    : 'var(--color-text-muted, #64748b)',
                boxShadow: step.status === 'running' ? '0 0 12px rgba(0, 240, 255, 0.4)' : 'none',
                border: step.status === 'running' ? '1px solid rgba(0, 240, 255, 0.6)' : 'none'
              }}
            >
              {step.status === 'done' ? '✓' : step.status === 'running' ? '▸' : String(i + 1)}
            </div>
            <span 
              className="text-xs transition-colors duration-200"
              style={{
                color: step.status === 'done' 
                  ? 'var(--color-text-primary, #f8fafc)' 
                  : step.status === 'running' 
                    ? 'var(--color-accent-cyan, #00f0ff)' 
                    : 'var(--color-text-muted, #94a3b8)',
                fontWeight: step.status === 'running' ? 700 : step.status === 'done' ? 600 : 400,
              }}
            >
              {step.label}
            </span>
            {step.status === 'running' && (
              <span className="ml-auto flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-cyan,#00f0ff)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-cyan,#00f0ff)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-cyan,#00f0ff)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineVisualizer;

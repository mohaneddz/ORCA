with open('App/src/pages/SettingsPage.tsx', 'r') as f:
    text = f.read()

# Fix spacing in tabs bar (flex-wrap gap-2) -> (flex w-full)
# And make the buttons flex-1
text = text.replace(
    'className="flex flex-wrap gap-2"',
    'className="flex w-full"'
)

text = text.replace(
    '"rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",',
    '"flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",'
)

# Text replacements
text = text.replace('text-white', 'text-[var(--color-neutral-100)]')
text = text.replace('hover:text-white', 'hover:text-[var(--color-neutral-100)]')
text = text.replace('text-slate-200', 'text-[var(--color-neutral-200)]')
text = text.replace('text-slate-300', 'text-[var(--color-neutral-300)]')
text = text.replace('text-slate-400', 'text-[var(--color-neutral-400)]')
text = text.replace('text-slate-500', 'text-[var(--color-neutral-500)]')

# Tab button text colors
text = text.replace('bg-cyan-500/18 text-cyan-100', 'bg-[var(--color-primary)]/15 text-[var(--color-primary-strong)] dark:text-cyan-100')
text = text.replace('text-cyan-100', 'text-[var(--color-primary-strong)] text-[var(--color-neutral-100)]')

# border and background adjustments
text = text.replace('border-white/8', 'border-[var(--color-border-subtle)]')
text = text.replace('border-white/10', 'border-[var(--color-border)]')
text = text.replace('border-white/15', 'border-[var(--color-border)]')
text = text.replace('border-white/20', 'border-[var(--color-border)]')
text = text.replace('bg-white/4', 'bg-[var(--color-surface-2)]')
text = text.replace('bg-white/5', 'bg-[var(--color-surface-muted)]')
text = text.replace('bg-white/10', 'bg-[var(--color-surface-hover)]')
text = text.replace('bg-slate-900/60', 'bg-[var(--color-bg)]')
text = text.replace('bg-slate-900/70', 'bg-[var(--color-bg)]')
text = text.replace('bg-cyan-500/20', 'bg-[var(--color-primary)]/20')
text = text.replace('border-cyan-400/30', 'border-[var(--color-primary)]/30')
text = text.replace('hover:bg-cyan-500/30', 'hover:bg-[var(--color-primary)]/30')

# Extra replacement fixing duplicate text- classes introduced by the script
text = text.replace('text-[var(--color-primary-strong)] text-[var(--color-neutral-100)]', 'text-[var(--color-primary-strong)]')

with open('App/src/pages/SettingsPage.tsx', 'w') as f:
    f.write(text)
print('Replaced successfully')

const PALETTE = [
  'bg-primary-100 text-primary-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
];

function colorFor(seed: string) {
  const hash = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

export function InitialsAvatar({
  firstName,
  lastName,
  size = 'md',
}: {
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const sizeClasses = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' }[size];

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-semibold ${sizeClasses} ${colorFor(
        firstName + lastName
      )}`}
    >
      {initials}
    </div>
  );
}

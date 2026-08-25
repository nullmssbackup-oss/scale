export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  return (
    <div className="flex justify-center items-center py-10">
      <div className={`animate-spin rounded-full border-b-2 border-indigo-600 ${sizeClass}`} />
    </div>
  );
}

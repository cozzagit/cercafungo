export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-200">
      <div className="text-center">
        <span className="text-5xl animate-bounce inline-block">🍄</span>
        <p className="mt-4 text-sm font-medium text-bark-400 animate-pulse">
          Caricamento...
        </p>
      </div>
    </div>
  );
}

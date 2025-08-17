export function HeaderBanner({ title = "OC Prompt Manager", subtitle }: { title?: string; subtitle?: string }) {
  return (
    <section
      className="relative overflow-hidden rounded-b-[32px] h-[220px] md:h-[280px]"
      style={{ backgroundColor: '#EAF2F8' }}
      aria-label={`${title} header`}
    >
      {/* decorative svg accents */}
      <svg aria-hidden className="absolute left-[-60px] bottom-[-40px]" width="240" height="240">
        <circle cx="120" cy="120" r="120" fill="#0A2740" fillOpacity="0.15" />
      </svg>
      <svg aria-hidden className="absolute right-[-80px] bottom-[-80px]" width="320" height="320">
        <circle cx="160" cy="160" r="160" fill="#FB5A17" />
      </svg>
      <div className="max-w-6xl mx-auto h-full flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#003145]">{title}</h1>
        {subtitle ? (
          <div className="mt-2 text-base md:text-lg italic text-[#003145]/80">{subtitle}</div>
        ) : null}
      </div>
    </section>
  );
}



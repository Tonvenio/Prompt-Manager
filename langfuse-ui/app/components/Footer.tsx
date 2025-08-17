export default function Footer() {
  return (
    <footer
      className="mt-16 rounded-t-3xl relative overflow-hidden"
      style={{ backgroundColor: "#0b1624", color: "#ffffff" }}
    >
      {/* decorative patterns in CI colors */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {/* Gradient circle (top-left) */}
        <svg width="340" height="340" style={{ position: "absolute", top: 0, left: 0, opacity: 0.14 }} aria-hidden>
          <defs>
            <linearGradient id="footer-accent" x1="0" x2="1">
              <stop offset="0%" stopColor="#003145" />
              <stop offset="100%" stopColor="#FB5A17" />
            </linearGradient>
          </defs>
          <circle cx="170" cy="170" r="160" fill="url(#footer-accent)" />
        </svg>
        {/* Solid rounded square (bottom-right) */}
        <svg width="260" height="260" style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.12 }} aria-hidden>
          <rect width="240" height="240" fill="#FB5A17" rx="28" />
        </svg>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-12 text-center relative" style={{ zIndex: 1 }}>
        <div className="text-2xl font-semibold">
          📧 {""}
          <a
            href="mailto:ai@osborneclarke.com"
            className="underline underline-offset-4 hover:no-underline"
            aria-label="Email ai@osborneclarke.com"
          >
            Questions?
          </a>
        </div>
      </div>
    </footer>
  );
}



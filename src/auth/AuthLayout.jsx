export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#F3F2ED", fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "#12213A" }}>
          Keepr<span style={{ color: "#0E8388" }}>.</span>
        </h1>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl border p-6" style={{ borderColor: "#DAD7CC" }}>
        <h2 className="text-lg font-black mb-1" style={{ color: "#12213A" }}>{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
        <div className="space-y-3">{children}</div>
      </div>
      {footer && <div className="mt-4 text-xs text-gray-500 text-center">{footer}</div>}
      <style>{`
        .auth-input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.6rem 0.8rem;font-size:0.875rem;outline:none;}
        .auth-btn{width:100%;padding:0.65rem;border-radius:0.5rem;font-size:0.875rem;font-weight:700;color:#fff;background:#0E8388;}
        .auth-btn:disabled{opacity:0.4;}
        .auth-link{color:#0E8388;font-weight:600;font-size:0.8rem;}
      `}</style>
    </div>
  );
}

"use client";

export default function ConfirmButton({ message, children, className, style }: { message: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <button
      className={className}
      style={style}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

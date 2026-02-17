import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-tertiary">
        <span className="text-3xl">404</span>
      </div>
      <p className="mt-4 text-lg font-semibold text-text-primary">
        Page not found
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        Please check the URL
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-btn-primary-bg px-6 py-2.5 text-sm font-medium text-btn-primary-text"
      >
        Go Home
      </Link>
    </div>
  );
}

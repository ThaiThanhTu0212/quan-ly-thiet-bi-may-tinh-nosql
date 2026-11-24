import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-800 bg-slate-950 text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold text-white">PC Builder</Link>
        <nav aria-label="Liên kết cuối trang" className="flex gap-4">
          <Link href="/products" className="hover:text-sky-300">Danh mục linh kiện</Link>
          <Link href="/pc-builder" className="hover:text-sky-300">Build PC</Link>
        </nav>
      </div>
    </footer>
  );
}

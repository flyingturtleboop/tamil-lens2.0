import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white py-12 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center font-bold text-lg">
              Ta
            </div>
            <span className="text-xl font-bold">Tamil Lens</span>
          </div>
          <p className="text-slate-400">Learn Tamil from the world around you</p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-bold text-lg mb-4">Quick Links</h4>
          <div className="space-y-2">
            <Link href="/#home" className="block text-slate-400 hover:text-white transition">
              Home
            </Link>
            <Link href="/#learn" className="block text-slate-400 hover:text-white transition">
              Lens &amp; Learn
            </Link>
            <Link href="/#quiz" className="block text-slate-400 hover:text-white transition">
              Practice Quiz
            </Link>
            <Link href="/privacy" className="block text-slate-400 hover:text-white transition">
              Privacy
            </Link>
          </div>
        </div>

        {/* Connect */}
        <div>
          <h4 className="font-bold text-lg mb-4">Connect</h4>
          <div className="flex gap-4">
            <a
              href="https://x.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-cyan-500 transition"
            >
              <span className="text-xl">𝕏</span>
            </a>
            <a
              href="https://facebook.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-cyan-500 transition"
            >
              <span className="text-xl">f</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-slate-800 text-center text-slate-400">
        © {year} Tamil Lens. All rights reserved.
      </div>
    </footer>
  );
}

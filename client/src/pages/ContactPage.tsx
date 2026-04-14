import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Contact Us</h1>
        <p className="text-slate-500 mt-3">Have a question? We'd love to hear from you.</p>
      </div>

      <a href="mailto:contact@houserush.app" className="bg-brand-50 border border-brand-100 rounded-2xl p-6 flex items-center gap-4 hover:bg-brand-100/50 transition-colors">
        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6 text-brand-700" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Email Us</p>
          <span className="text-brand-600 text-sm">contact@houserush.app</span>
        </div>
      </a>
    </div>
  );
}

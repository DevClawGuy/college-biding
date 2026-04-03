import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Information We Collect',
    content: 'We collect the following information when you use HouseRush: account information (name, email address, phone number, university affiliation, academic year); verification data (.edu email verification status); bidding activity (bid amounts, timestamps, listings bid on); listing data (property details, photos, and descriptions submitted by landlords); usage data (pages visited, features used, device and browser information); and communications (messages sent through the Platform, support requests).',
  },
  {
    title: '2. How We Use Your Information',
    content: 'We use your information to: operate and improve the Platform; connect students with available housing listings near their campus; process and display bids in real time; send notifications about bid activity, auction results, and account updates; verify .edu email addresses to establish student status; enable landlords to contact auction winners to finalize leases; prevent fraud and enforce our Terms of Service; and analyze usage patterns to improve the user experience.',
  },
  {
    title: '3. Information Sharing',
    content: 'We share your information only in limited circumstances. When you win an auction, we share your name, email address, and phone number with the listing landlord so they can contact you to finalize the lease. During active auctions, we display anonymized bid information (university affiliation and bid amount) to other bidders. We do not sell your personal information to third parties. We may share data with service providers who help us operate the Platform (hosting, email delivery, analytics), subject to confidentiality agreements.',
  },
  {
    title: '4. Data Security',
    content: 'We implement appropriate technical and organizational measures to protect your personal information, including encryption of passwords using bcrypt hashing, secure HTTPS connections, and access controls on our database. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.',
  },
  {
    title: '5. Cookies',
    content: 'HouseRush uses local storage and session tokens (JWT) to keep you logged in and maintain your session. We do not use third-party tracking cookies. Essential cookies are necessary for the Platform to function and cannot be disabled.',
  },
  {
    title: '6. Your Rights',
    content: 'You have the right to: access the personal information we hold about you by viewing your profile page; update or correct your information through your account settings; request deletion of your account and associated data by contacting us; and export your bid history and account data. To exercise any of these rights, please contact us at the address below. We will respond to requests within 30 days.',
  },
  {
    title: '7. Data Retention',
    content: 'We retain your account information for as long as your account is active. Bid history and auction records are retained for a reasonable period for record-keeping and dispute resolution purposes. If you request account deletion, we will remove your personal information within 30 days, except where we are required by law to retain certain records.',
  },
  {
    title: '8. Contact Information',
    content: 'If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at houserush@gmail.com.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="text-slate-500 mt-2">Last updated: March 29, 2026</p>
      </div>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">{s.title}</h2>
            <p className="text-slate-600 leading-relaxed text-sm">{s.content}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 text-sm text-slate-500">
        <p>See also: <Link to="/terms" className="text-brand-600 hover:underline">Terms of Service</Link></p>
      </div>
    </div>
  );
}

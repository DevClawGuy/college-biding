import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing or using HouseRush ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform. We reserve the right to modify these terms at any time, and your continued use of the Platform constitutes acceptance of any changes.',
  },
  {
    title: '2. Description of Service',
    content: 'HouseRush is a real-time auction platform that connects college students seeking off-campus housing with landlords and property managers near Monmouth University. The Platform facilitates competitive bidding on rental listings, enabling students to secure housing through a transparent auction process. HouseRush is not a real estate brokerage, landlord, or property manager. We provide a marketplace and do not own, manage, or maintain any listed properties.',
  },
  {
    title: '3. User Accounts and Eligibility',
    content: 'To use the Platform, you must create an account and provide accurate, complete information. Student accounts may be verified using a .edu email address. You must be at least 18 years of age to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Landlord accounts are intended for property owners, property managers, or their authorized agents.',
  },
  {
    title: '4. Bidding Rules',
    content: 'All bids placed on HouseRush are binding commitments. By placing a bid, you agree to enter into a lease agreement at your bid price if you are the winning bidder. The minimum bid increment is $25 above the current highest bid. Auctions end at the time specified by the landlord. If a bid is placed within the final 5 minutes of an auction, the auction may be automatically extended by 5 minutes to prevent last-second sniping. The highest bidder at auction close is the winner. Auto-bid features, if used, will automatically bid on your behalf up to your specified maximum in $25 increments.',
  },
  {
    title: '5. Landlord Responsibilities',
    content: 'Landlords must provide accurate, truthful information about their properties, including but not limited to: address, number of bedrooms and bathrooms, amenities, photos, and rental terms. Landlords agree to honor the winning bid and make reasonable efforts to finalize a lease with the winning bidder. Listings are subject to approval before appearing on the Platform. Landlords must comply with all applicable federal, state, and local housing laws, including fair housing regulations.',
  },
  {
    title: '6. Fees and Payments',
    content: 'HouseRush is free for students. There is no fee to create an account, browse listings, or place bids. Landlords may be subject to a platform fee for successful auctions, as outlined in the landlord agreement. All rent payments are made directly between the tenant and landlord outside of HouseRush. The Platform does not process rent payments.',
  },
  {
    title: '7. Prohibited Conduct',
    content: 'Users may not: place fake or fraudulent bids with no intention to honor them; create multiple accounts to manipulate bidding; provide false or misleading information in listings or profiles; harass, threaten, or abuse other users; use the Platform for any unlawful purpose; attempt to circumvent Platform security or functionality; scrape, mine, or collect user data without authorization; post spam, solicitations, or unrelated content.',
  },
  {
    title: '8. Disclaimer of Warranties',
    content: 'THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. HOUSERUSH DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE DO NOT VERIFY THE ACCURACY OF LISTING INFORMATION AND ARE NOT RESPONSIBLE FOR THE CONDITION OF ANY PROPERTY. USERS ARE ENCOURAGED TO INDEPENDENTLY VERIFY ALL LISTING DETAILS BEFORE ENTERING INTO A LEASE.',
  },
  {
    title: '9. Limitation of Liability',
    content: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOUSERUSH AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID TO HOUSERUSH IN THE TWELVE MONTHS PRECEDING THE CLAIM.',
  },
  {
    title: '10. Contact Information',
    content: 'If you have questions about these Terms of Service, please contact us at houserush@gmail.com.',
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Terms of Service</h1>
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
        <p>See also: <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link></p>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { CheckSquare, AlertTriangle, Users, ShieldAlert, Search, Trophy, Download, ArrowRight } from 'lucide-react';

// TODO: upgrade to downloadable PDF generation in the future

interface Guide {
  slug: string;
  icon: typeof CheckSquare;
  title: string;
  description: string;
  bullets: string[];
  content: string;
}

const guides: Guide[] = [
  {
    slug: 'move-in-essentials',
    icon: CheckSquare,
    title: 'Move-In Essentials Checklist',
    description: 'Everything you need to buy and bring when moving into your first off-campus apartment. Don\'t show up unprepared.',
    bullets: [
      'Kitchen essentials (plates, pots, utensils)',
      'Bathroom supplies checklist',
      'Bedroom and bedding must-haves',
      'Cleaning supplies starter kit',
      'First week groceries list',
    ],
    content: `MOVE-IN ESSENTIALS CHECKLIST
By HouseRush — houserush.vercel.app

KITCHEN
[ ] Plates and bowls (4 of each)
[ ] Cups and mugs (4 of each)
[ ] Forks, knives, spoons (4 of each)
[ ] Cooking pot and frying pan
[ ] Spatula, wooden spoon, can opener
[ ] Cutting board and knife
[ ] Dish soap and sponge
[ ] Paper towels and trash bags
[ ] Tupperware containers
[ ] Baking sheet

BATHROOM
[ ] Towels (2 bath, 2 hand)
[ ] Shower curtain and rings
[ ] Bath mat
[ ] Toilet paper (bulk pack)
[ ] Shampoo, conditioner, body wash
[ ] Toothbrush holder
[ ] First aid kit
[ ] Plunger (trust us)

BEDROOM
[ ] Sheets (2 sets)
[ ] Comforter or duvet
[ ] Pillows (2)
[ ] Mattress pad or topper
[ ] Hangers (20+)
[ ] Desk lamp
[ ] Power strip with surge protector
[ ] Laundry basket and detergent

CLEANING
[ ] All-purpose cleaner
[ ] Broom and dustpan
[ ] Vacuum or Swiffer
[ ] Glass cleaner
[ ] Disinfecting wipes
[ ] Trash cans (kitchen + bathroom)

FIRST WEEK GROCERIES
[ ] Water (case)
[ ] Bread, peanut butter, jelly
[ ] Eggs, milk, butter
[ ] Pasta and sauce
[ ] Rice and canned beans
[ ] Snacks and cereal
[ ] Coffee or tea
[ ] Cooking oil and salt/pepper`,
  },
  {
    slug: 'lease-red-flags',
    icon: AlertTriangle,
    title: 'Lease Red Flags to Watch For',
    description: 'Know what to look for before you sign. These common lease clauses have cost students thousands of dollars.',
    bullets: [
      'Automatic renewal clauses',
      'Vague maintenance responsibility language',
      'Security deposit trap clauses',
      'Subletting restrictions',
      'Early termination penalties',
    ],
    content: `LEASE RED FLAGS TO WATCH FOR
By HouseRush — houserush.vercel.app

1. AUTOMATIC RENEWAL CLAUSES
Watch for: "Lease automatically renews for 12 months unless 90-day written notice is given."
Why it's dangerous: Miss the notice window and you're locked in for another year.
What to do: Ask for the renewal to require mutual written agreement.

2. VAGUE MAINTENANCE RESPONSIBILITY
Watch for: "Tenant is responsible for routine maintenance and upkeep."
Why it's dangerous: "Routine" could mean anything — they could charge you for appliance repairs.
What to do: Ask for specific examples in writing. Get a list of what landlord vs. tenant covers.

3. SECURITY DEPOSIT TRAPS
Watch for: Non-refundable "fees" disguised as deposits, or no timeline for return.
Why it's dangerous: NJ law requires deposits returned within 30 days. Some landlords ignore this.
What to do: Document everything at move-in. Take timestamped photos. Know NJ deposit laws.

4. SUBLETTING RESTRICTIONS
Watch for: "Subletting is prohibited under any circumstances."
Why it's dangerous: If you need to leave early (internship, family emergency), you're stuck paying.
What to do: Negotiate a subletting clause or at minimum an early termination option.

5. EARLY TERMINATION PENALTIES
Watch for: "Tenant must pay remaining lease balance plus 2 months rent as penalty."
Why it's dangerous: On a $1,500/mo lease, that could be $10,000+.
What to do: Negotiate a fixed early termination fee (e.g., 2 months rent max).

GENERAL TIPS:
- Never sign same-day. Always take the lease home and read it.
- Google your landlord's name + "complaints" before signing.
- Ask other tenants in the building about their experience.
- Keep copies of ALL communication with your landlord.`,
  },
  {
    slug: 'roommate-agreement',
    icon: Users,
    title: 'Roommate Agreement Template',
    description: 'Set clear expectations before moving in. A simple agreement now prevents major conflicts later.',
    bullets: [
      'Rent and utility split breakdown',
      'Cleaning schedule and responsibilities',
      'Guest and quiet hours policies',
      'Shared grocery and supply rules',
      'What happens if someone wants to leave early',
    ],
    content: `ROOMMATE AGREEMENT TEMPLATE
By HouseRush — houserush.vercel.app

Date: _______________
Address: _______________

ROOMMATES:
1. _______________
2. _______________
3. _______________

1. RENT & UTILITIES
- Total monthly rent: $_______________
- Split method: [ ] Equal  [ ] By room size  [ ] Custom
- Person responsible for collecting rent: _______________
- Utilities included in rent: _______________
- Utilities split equally: Electric, Internet, Water
- Payment due date: _______________

2. CLEANING RESPONSIBILITIES
- Common areas cleaned on a rotating schedule: [ ] Weekly [ ] Bi-weekly
- Kitchen: cleaned after each use by the person who cooked
- Bathroom: _______________
- Trash/recycling taken out by: _______________
- Failure to clean results in: _______________

3. GUEST & QUIET HOURS POLICY
- Quiet hours: _____ PM to _____ AM (weekdays)
- Weekend quiet hours: _____ PM to _____ AM
- Overnight guests: [ ] Allowed  [ ] Max ___ nights/week
- Advance notice required for overnight guests: [ ] Yes  [ ] No
- Party policy: _______________

4. SHARED EXPENSES
- Shared groceries: [ ] Yes (split equally) [ ] No (buy your own)
- Shared household supplies (TP, soap, etc.): [ ] Split equally [ ] Rotate buying
- Who buys what: _______________

5. EARLY DEPARTURE
- If someone wants to leave before the lease ends:
  [ ] They must find a replacement roommate
  [ ] They must pay their share until a replacement is found
  [ ] ___ days notice required
- Subletting: [ ] Allowed with group approval [ ] Not allowed

6. CONFLICT RESOLUTION
- First step: Direct conversation between involved parties
- Second step: Group meeting
- Third step: _______________

SIGNATURES:
1. _______________ Date: _______________
2. _______________ Date: _______________
3. _______________ Date: _______________`,
  },
  {
    slug: 'rental-scam-warning-signs',
    icon: ShieldAlert,
    title: 'Rental Scam Warning Signs',
    description: 'Protect yourself from fake listings and fraudulent landlords. These red flags can save you from losing your deposit.',
    bullets: [
      'Too-good-to-be-true pricing',
      'Landlord refuses in-person showing',
      'Requests for wire transfer or gift cards',
      'Pressure to sign immediately',
      'No lease or vague rental agreement',
    ],
    content: `RENTAL SCAM WARNING SIGNS
By HouseRush — houserush.vercel.app

RED FLAG #1: TOO-GOOD-TO-BE-TRUE PRICING
If a 2BR in Long Branch is listed at $600/mo when similar units go for $1,500+, it's a scam.
Always compare with similar listings in the same area.

RED FLAG #2: LANDLORD REFUSES IN-PERSON SHOWING
"I'm out of the country" or "I'll mail you the keys" = scam.
Never rent a place you haven't seen in person or via a verified video tour.

RED FLAG #3: WIRE TRANSFERS OR GIFT CARDS
Legitimate landlords accept checks, Venmo, or Zelle. They never ask for:
- Wire transfers
- Gift cards
- Bitcoin/crypto
- Cash sent through the mail

RED FLAG #4: PRESSURE TO SIGN IMMEDIATELY
"Someone else is interested, you need to sign today!" is a pressure tactic.
Real landlords give you time to read the lease and think it over.

RED FLAG #5: NO LEASE OR VAGUE AGREEMENT
If there's no written lease, walk away. Period.
A handshake deal gives you zero legal protection.

HOW TO PROTECT YOURSELF:
[ ] Google the property address — does the listing match public records?
[ ] Search the landlord's name + "scam" or "complaints"
[ ] Never send money before seeing the property in person
[ ] Ask for the landlord's ID and proof of ownership
[ ] Use HouseRush — all listings are verified before going live
[ ] Trust your gut — if it feels off, it probably is

WHAT TO DO IF YOU'VE BEEN SCAMMED:
1. File a report with local police
2. Report to the FTC at reportfraud.ftc.gov
3. Contact your bank to dispute the charge
4. Report the listing on the platform where you found it`,
  },
  {
    slug: 'apartment-inspection',
    icon: Search,
    title: 'How to Inspect an Apartment',
    description: 'What to check before you sign the lease. Document everything to protect your security deposit.',
    bullets: [
      'Check all appliances and fixtures',
      'Look for water damage and mold',
      'Test all locks, windows, and doors',
      'Take timestamped photos of everything',
      'Ask about pest history and utilities',
    ],
    content: `HOW TO INSPECT AN APARTMENT
By HouseRush — houserush.vercel.app

BEFORE THE VISIT:
[ ] Bring your phone (camera + flashlight)
[ ] Bring a notebook or this checklist
[ ] Visit during daylight hours
[ ] Check the neighborhood at night too

KITCHEN:
[ ] Turn on every burner on the stove
[ ] Open and close the oven
[ ] Run the dishwasher if present
[ ] Check under the sink for leaks or mold
[ ] Test garbage disposal
[ ] Open all cabinets — look for pests or droppings
[ ] Run hot and cold water — check pressure and temperature

BATHROOM:
[ ] Flush the toilet — does it run?
[ ] Check for mold around the tub/shower
[ ] Test hot water — how long to get hot?
[ ] Check under the sink for leaks
[ ] Look at the ceiling for water stains
[ ] Test the exhaust fan

LIVING AREAS:
[ ] Check all electrical outlets with a phone charger
[ ] Test all light switches
[ ] Look for cracks in walls or ceiling
[ ] Check the floors for damage
[ ] Open and close all windows — do they lock?
[ ] Test the heating/AC system
[ ] Check for cell signal in every room

DOORS & SECURITY:
[ ] Test the front door lock and deadbolt
[ ] Check all bedroom door locks
[ ] Look at the door frame — signs of forced entry?
[ ] Check smoke detectors — are they present and working?
[ ] Check carbon monoxide detector

ASK THE LANDLORD:
[ ] What's the pest control schedule?
[ ] Who handles maintenance requests and how fast?
[ ] What utilities are included?
[ ] Is there laundry on-site or in-unit?
[ ] What's the parking situation?
[ ] Has anyone broken the lease early? Why?

DOCUMENT EVERYTHING:
[ ] Take photos of every room (wide shots + close-ups)
[ ] Photograph any existing damage
[ ] Make sure photos have timestamps
[ ] Email photos to yourself as a record
[ ] Note everything in writing on a move-in checklist`,
  },
  {
    slug: 'after-winning-auction',
    icon: Trophy,
    title: 'What Happens After You Win a HouseRush Auction',
    description: "You won — now what? Here's exactly what happens next and what to expect from your agent.",
    bullets: [
      'You receive a winner confirmation email',
      'Your agent contacts you within 24 hours',
      'Lease review and signing process',
      'Security deposit and move-in date',
      'What to do if you change your mind',
    ],
    content: `WHAT HAPPENS AFTER YOU WIN A HOUSERUSH AUCTION
By HouseRush — houserush.vercel.app

STEP 1: WINNER CONFIRMATION (Immediate)
- You'll see confetti on screen and a "You Won!" banner
- You'll receive an email with the property details and winning bid
- The landlord also receives an email with your contact info

STEP 2: AGENT CONTACT (Within 24 Hours)
- The landlord or their agent will reach out via email or phone
- They'll schedule a time to review the lease
- If you haven't heard within 48 hours, check your spam folder and contact support

STEP 3: LEASE REVIEW (Days 2-5)
- You'll receive a lease agreement to review
- READ THE ENTIRE LEASE — use our "Lease Red Flags" guide
- Ask questions about anything you don't understand
- Negotiate terms if needed (move-in date, pet policy, etc.)
- Consider having a parent or advisor review it

STEP 4: SIGNING & DEPOSIT (Days 5-10)
- Sign the lease (electronically or in person)
- Pay the security deposit (typically 1-1.5 months rent)
- Get a receipt for every payment you make
- Ask about first month's rent timing

STEP 5: MOVE-IN PREP
- Get your keys and any access codes
- Set up utilities if not included (electric, internet)
- Do a thorough inspection using our apartment inspection checklist
- Document everything with photos before moving furniture in

WHAT IF YOU CHANGE YOUR MIND?
- Before signing the lease: You can walk away, but it's considered bad faith
- After signing: Review the early termination clause in your lease
- Contact the landlord ASAP — honest communication goes a long way
- Note: Backing out may affect your HouseRush reputation for future bids

NEED HELP?
- Contact us at houserush.vercel.app/contact
- Check our other guides for lease and inspection tips`,
  },
];

function downloadGuide(guide: Guide) {
  const blob = new Blob([guide.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `houserush-${guide.slug}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function GuidesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-900" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-60 h-60 bg-white rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white rounded-full blur-[100px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center px-4 py-16 sm:py-20 relative">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Student Housing Guides & Checklists</h1>
          <p className="text-brand-200 mt-4 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Everything you need to find, secure, and move into your perfect off-campus home near Monmouth University.
          </p>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide) => (
            <div key={guide.slug} className="bg-white rounded-2xl border border-slate-200 card-shadow hover:card-shadow-hover transition-all duration-300 flex flex-col">
              <div className="p-6 flex-1">
                <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                  <guide.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{guide.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{guide.description}</p>
                <ul className="space-y-2">
                  {guide.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={() => downloadGuide(guide)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" /> Download Checklist
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-3xl mx-auto text-center px-4 pb-16 sm:pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Ready to find your place?</h2>
        <p className="text-slate-500 mt-3 max-w-lg mx-auto">Browse verified listings near Monmouth University and start bidding today.</p>
        <Link
          to="/listings"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3.5 rounded-xl font-semibold text-base mt-8 transition-all hover:shadow-xl hover:shadow-brand-600/20 active:scale-[0.98]"
        >
          Browse Listings <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}

export { guides };

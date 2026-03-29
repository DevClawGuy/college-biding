import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ChevronLeft } from 'lucide-react';
import api from '../lib/api';

const amenityOptions = [
  'In-Unit Laundry', 'Laundry In Building', 'Dishwasher', 'Central AC',
  'Hardwood Floors', 'Gym', 'Pool', 'Rooftop Access', 'Doorman',
  'Bike Storage', 'EV Charging', 'Garage', 'Backyard', 'Balcony',
  'Furnished', 'Smart Home', 'High Ceilings', 'Exposed Brick',
  'Package Lockers', 'Concierge', 'Gated Community', 'Private Patio',
];

const tagOptions = ['Pet Friendly', 'Utilities Included', 'Furnished', 'Parking Included'];

const universityCoords: Record<string, { lat: number; lng: number }> = {
  'Monmouth University': { lat: 40.2773, lng: -74.0048 },
};

export default function CreateListingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', address: '', city: '', state: '', nearestUniversity: '',
    beds: 1, baths: 1, sqft: 500, distanceToCampus: 0.5, startingBid: 500, reservePrice: 800,
    auctionDays: 7, amenities: [] as string[], tags: [] as string[],
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleAmenity = (a: string) => setForm(prev => ({ ...prev, amenities: prev.amenities.includes(a) ? prev.amenities.filter(x => x !== a) : [...prev.amenities, a] }));
  const toggleTag = (t: string) => setForm(prev => ({ ...prev, tags: prev.tags.includes(t) ? prev.tags.filter(x => x !== t) : [...prev.tags, t] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const coords = universityCoords[form.nearestUniversity] || { lat: 42.3601, lng: -71.0942 };
    const offset = (Math.random() - 0.5) * 0.01;
    const auctionEnd = new Date(Date.now() + form.auctionDays * 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data } = await api.post('/listings', {
        ...form, lat: coords.lat + offset, lng: coords.lng + offset, auctionEnd,
        photos: [`https://picsum.photos/seed/${Date.now()}1/800/600`, `https://picsum.photos/seed/${Date.now()}2/800/600`, `https://picsum.photos/seed/${Date.now()}3/800/600`],
      });
      navigate(`/listing/${data.id}`);
    } catch (err: any) { const msg = err.response?.data?.error; setError(typeof msg === 'string' ? msg : 'Failed to create listing'); } finally { setLoading(false); }
  };

  if (!user || user.role !== 'landlord') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-slate-700">Landlord Access Only</h2>
        <p className="text-slate-500 mt-2">You need a landlord account to create listings.</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm";
  const selectClass = "w-full py-3 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/dashboard?tab=listings" className="text-slate-500 hover:text-slate-700 text-sm mb-6 inline-flex items-center gap-1 font-medium">
        <ChevronLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Create New Listing</h1>
      <p className="text-slate-500 text-sm mb-8">Fill in the details to list your property for auction.</p>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Property Details</h2>
          <div className="space-y-4">
            <div><label className={labelClass}>Title</label><input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} className={inputClass} placeholder="e.g. Sunny 2BR Near Campus" required /></div>
            <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={(e) => update('description', e.target.value)} className={`${inputClass} min-h-[100px]`} placeholder="Describe the property..." required /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={labelClass}>Beds</label><input type="number" value={form.beds} onChange={(e) => update('beds', Number(e.target.value))} className={inputClass} min={0} /></div>
              <div><label className={labelClass}>Baths</label><input type="number" value={form.baths} onChange={(e) => update('baths', Number(e.target.value))} className={inputClass} min={1} /></div>
              <div><label className={labelClass}>Sq Ft</label><input type="number" value={form.sqft} onChange={(e) => update('sqft', Number(e.target.value))} className={inputClass} min={100} /></div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Location</h2>
          <div className="space-y-4">
            <div><label className={labelClass}>Address</label><input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} className={inputClass} placeholder="Street address" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>City</label><input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass} required /></div>
              <div><label className={labelClass}>State</label><input type="text" value={form.state} onChange={(e) => update('state', e.target.value)} className={inputClass} placeholder="e.g. MA" required maxLength={2} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Nearest University</label><select value={form.nearestUniversity} onChange={(e) => update('nearestUniversity', e.target.value)} className={selectClass} required><option value="">Select</option>{Object.keys(universityCoords).map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              <div><label className={labelClass}>Distance to Campus (mi)</label><input type="number" value={form.distanceToCampus} onChange={(e) => update('distanceToCampus', Number(e.target.value))} className={inputClass} step="0.1" min="0" /></div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Auction Settings</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelClass}>Starting Bid ($/mo)</label><input type="number" value={form.startingBid} onChange={(e) => update('startingBid', Number(e.target.value))} className={inputClass} min={100} step={25} required /></div>
            <div><label className={labelClass}>Reserve Price ($/mo)</label><input type="number" value={form.reservePrice} onChange={(e) => update('reservePrice', Number(e.target.value))} className={inputClass} min={100} step={25} required /></div>
            <div><label className={labelClass}>Duration (days)</label><select value={form.auctionDays} onChange={(e) => update('auctionDays', Number(e.target.value))} className={selectClass}>{[3, 5, 7, 10, 14].map(d => <option key={d} value={d}>{d} days</option>)}</select></div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {amenityOptions.map(a => (
              <button key={a} type="button" onClick={() => toggleAmenity(a)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  form.amenities.includes(a) ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}>{a}</button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map(t => (
              <button key={t} type="button" onClick={() => toggleTag(t)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  form.tags.includes(t) ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}>{t}</button>
            ))}
          </div>
        </section>

        <button type="submit" disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-2xl font-semibold text-lg transition-all disabled:opacity-50 hover:shadow-xl hover:shadow-brand-600/20 active:scale-[0.98]">
          {loading ? 'Creating Listing...' : 'Create Listing'}
        </button>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
// lucide-react icons used inline
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
  'Boston University': { lat: 42.3505, lng: -71.1054 },
  'MIT': { lat: 42.3601, lng: -71.0942 },
  'Harvard': { lat: 42.3770, lng: -71.1167 },
  'UT Austin': { lat: 30.2849, lng: -97.7341 },
  'UCLA': { lat: 34.0689, lng: -118.4452 },
  'USC': { lat: 34.0224, lng: -118.2851 },
  'NYU': { lat: 40.7291, lng: -73.9965 },
  'Columbia': { lat: 40.8075, lng: -73.9626 },
  'UChicago': { lat: 41.7886, lng: -87.5987 },
  'Northwestern': { lat: 42.0565, lng: -87.6753 },
};

export default function CreateListingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    nearestUniversity: '',
    beds: 1,
    baths: 1,
    sqft: 500,
    distanceToCampus: 0.5,
    startingBid: 500,
    reservePrice: 800,
    auctionDays: 7,
    amenities: [] as string[],
    tags: [] as string[],
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleAmenity = (a: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const toggleTag = (t: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(t)
        ? prev.tags.filter(x => x !== t)
        : [...prev.tags, t],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const coords = universityCoords[form.nearestUniversity] || { lat: 42.3601, lng: -71.0942 };
    const offset = (Math.random() - 0.5) * 0.01;
    const auctionEnd = new Date(Date.now() + form.auctionDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { data } = await api.post('/listings', {
        ...form,
        lat: coords.lat + offset,
        lng: coords.lng + offset,
        auctionEnd,
        photos: [
          `https://picsum.photos/seed/${Date.now()}1/800/600`,
          `https://picsum.photos/seed/${Date.now()}2/800/600`,
          `https://picsum.photos/seed/${Date.now()}3/800/600`,
        ],
      });
      navigate(`/listing/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'landlord') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-700">Landlord Access Only</h2>
        <p className="text-gray-500 mt-2">You need a landlord account to create listings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Listing</h1>
      <p className="text-gray-500 text-sm mb-8">Fill in the details to list your property for auction.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Property Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500"
                placeholder="e.g. Sunny 2BR Near Campus" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500 min-h-[100px]"
                placeholder="Describe the property..." required />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                <input type="number" value={form.beds} onChange={(e) => update('beds', Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                  min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                <input type="number" value={form.baths} onChange={(e) => update('baths', Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                  min={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
                <input type="number" value={form.sqft} onChange={(e) => update('sqft', Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                  min={100} />
              </div>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Location</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                placeholder="Street address" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={form.state} onChange={(e) => update('state', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                  placeholder="e.g. MA" required maxLength={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nearest University</label>
                <select value={form.nearestUniversity} onChange={(e) => update('nearestUniversity', e.target.value)}
                  className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500" required>
                  <option value="">Select</option>
                  {Object.keys(universityCoords).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distance to Campus (mi)</label>
                <input type="number" value={form.distanceToCampus} onChange={(e) => update('distanceToCampus', Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                  step="0.1" min="0" />
              </div>
            </div>
          </div>
        </section>

        {/* Auction Settings */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Auction Settings</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Bid ($/mo)</label>
              <input type="number" value={form.startingBid} onChange={(e) => update('startingBid', Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                min={100} step={25} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reserve Price ($/mo)</label>
              <input type="number" value={form.reservePrice} onChange={(e) => update('reservePrice', Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500"
                min={100} step={25} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <select value={form.auctionDays} onChange={(e) => update('auctionDays', Number(e.target.value))}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500">
                {[3, 5, 7, 10, 14].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Amenities */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {amenityOptions.map(a => (
              <button key={a} type="button" onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  form.amenities.includes(a)
                    ? 'bg-electric-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {a}
              </button>
            ))}
          </div>
        </section>

        {/* Tags */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map(t => (
              <button key={t} type="button" onClick={() => toggleTag(t)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  form.tags.includes(t)
                    ? 'bg-navy-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </section>

        <button type="submit" disabled={loading}
          className="w-full bg-electric-500 hover:bg-electric-600 text-white py-3.5 rounded-xl font-semibold text-lg transition-all disabled:opacity-50">
          {loading ? 'Creating Listing...' : 'Create Listing'}
        </button>
      </form>
    </div>
  );
}

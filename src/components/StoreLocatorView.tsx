import { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Bookmark,
  BookmarkCheck,
  LocateFixed,
  MapPin,
  Phone,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { SavedCenterRecord } from '../types/recharge';

interface StoreLocatorViewProps {
  user: User | null;
  isCloudSynced: boolean;
  onRequireAuth: () => void;
  onNotice: (msg: string) => void;
}

interface CityPreset {
  id: string;
  label: string;
  center: { lat: number; lng: number };
}

interface StoreResult {
  id: string;
  name: string;
  address: string;
  position: { lat: number; lng: number };
  rating?: number;
  userRatingCount?: number;
  phone?: string;
}

const CITY_PRESETS: CityPreset[] = [
  { id: 'delhi', label: 'Delhi NCR', center: { lat: 28.6139, lng: 77.209 } },
  { id: 'mumbai', label: 'Mumbai', center: { lat: 19.076, lng: 72.8777 } },
  { id: 'bengaluru', label: 'Bengaluru', center: { lat: 12.9716, lng: 77.5946 } },
  { id: 'kolkata', label: 'Kolkata', center: { lat: 22.5726, lng: 88.3639 } },
  { id: 'chennai', label: 'Chennai', center: { lat: 13.0827, lng: 80.2707 } },
  { id: 'hyderabad', label: 'Hyderabad', center: { lat: 17.385, lng: 78.4867 } },
];

const CARRIER_QUERIES = [
  { id: 'all', label: 'All Telecom Stores', query: 'Airtel Jio Vi mobile store SIM center' },
  { id: 'jio', label: 'Jio Store', query: 'Jio Store Digital Express' },
  { id: 'airtel', label: 'Airtel Store', query: 'Airtel Store Express' },
  { id: 'vi', label: 'Vi Store', query: 'Vi Vodafone Idea Store' },
  { id: 'bsnl', label: 'BSNL Center', query: 'BSNL Customer Service Center' },
];

function isQuotaError(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err ?? '');
  return (
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('429') ||
    text.includes('OverQuotaMapError') ||
    text.includes('Quota')
  );
}

function StoreMapContent({
  user,
  isCloudSynced,
  onRequireAuth,
  onNotice,
}: StoreLocatorViewProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const [cityId, setCityId] = useState<string>('delhi');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [customSearch, setCustomSearch] = useState<string>('');
  const [center, setCenter] = useState<{ lat: number; lng: number }>(CITY_PRESETS[0].center);
  const [places, setPlaces] = useState<StoreResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<StoreResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [savedCenters, setSavedCenters] = useState<SavedCenterRecord[]>([]);
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);

  const loadSavedCenters = useCallback(async () => {
    if (!user || !isCloudSynced) {
      setSavedCenters([]);
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/saved-stores', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { centers?: SavedCenterRecord[] };
      if (Array.isArray(data.centers)) {
        setSavedCenters(data.centers);
      }
    } catch {
      // keep silent in UI
    }
  }, [user, isCloudSynced]);

  useEffect(() => {
    void loadSavedCenters();
  }, [loadSavedCenters]);

  const runPlaceSearch = useCallback(
    async (targetCenter: { lat: number; lng: number }, queryText: string) => {
      if (!placesLib) return;
      setIsSearching(true);
      setSearchError(null);

      try {
        const { places: rawPlaces } = await placesLib.Place.searchByText({
          textQuery: queryText,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'nationalPhoneNumber',
          ],
          locationBias: { center: targetCenter, radius: 14000 },
          maxResultCount: 12,
          language: 'en',
          region: 'IN',
        });

        type RawPlaceResult = {
          id?: string;
          displayName?: string | null;
          formattedAddress?: string | null;
          location?: { lat: () => number; lng: () => number } | null;
          rating?: number | null;
          userRatingCount?: number | null;
          nationalPhoneNumber?: string | null;
        };

        const mapped: StoreResult[] = ((rawPlaces ?? []) as RawPlaceResult[])
          .filter((p): p is RawPlaceResult & { id: string; location: { lat: () => number; lng: () => number } } =>
            Boolean(p.id && p.location)
          )
          .map((p) => ({
            id: p.id,
            name: p.displayName || 'Telecom Service Center',
            address: p.formattedAddress || 'Address unavailable',
            position: {
              lat: p.location.lat(),
              lng: p.location.lng(),
            },
            rating: typeof p.rating === 'number' ? p.rating : undefined,
            userRatingCount:
              typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
            phone:
              typeof p.nationalPhoneNumber === 'string' ? p.nationalPhoneNumber : undefined,
          }));

        setPlaces(mapped);
        setSelectedPlace(mapped[0] ?? null);
        if (mapped[0] && map) {
          map.panTo(mapped[0].position);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSearchError('Unable to load nearby telecom stores right now. Please retry.');
        setPlaces([]);
      } finally {
        setIsSearching(false);
      }
    },
    [placesLib, map]
  );

  useEffect(() => {
    if (!placesLib) return;
    const carrierEntry =
      CARRIER_QUERIES.find((c) => c.id === carrierFilter) ?? CARRIER_QUERIES[0];
    const cityLabel = CITY_PRESETS.find((c) => c.id === cityId)?.label ?? 'India';
    const textQuery = customSearch.trim()
      ? `${customSearch.trim()} telecom store`
      : `${carrierEntry.query} near ${cityLabel}`;
    void runPlaceSearch(center, textQuery);
    // Only re-run automatically when filter, city, or library readiness changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib, cityId, carrierFilter]);

  const handleCitySelect = (preset: CityPreset) => {
    setCityId(preset.id);
    setCenter(preset.center);
    if (map) {
      map.panTo(preset.center);
      map.setZoom(12);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      onNotice('Location services are not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCenter = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(nextCenter);
        if (map) {
          map.panTo(nextCenter);
          map.setZoom(13);
        }
        const carrierEntry =
          CARRIER_QUERIES.find((c) => c.id === carrierFilter) ?? CARRIER_QUERIES[0];
        void runPlaceSearch(nextCenter, customSearch.trim() || carrierEntry.query);
      },
      () => {
        onNotice('Location access declined. Choose a city hub to explore stores.');
      },
      { timeout: 8000 }
    );
  };

  const handleBookmarkStore = async (store: StoreResult) => {
    if (!user || !isCloudSynced) {
      onNotice('Sign in with a verified account to bookmark service centers.');
      onRequireAuth();
      return;
    }

    setSavingPlaceId(store.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/saved-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          placeId: store.id,
          storeName: store.name,
          address: store.address,
          carrierTag:
            CARRIER_QUERIES.find((c) => c.id === carrierFilter)?.label ?? 'Telecom',
          lat: store.position.lat,
          lng: store.position.lng,
        }),
      });
      if (!res.ok) {
        onNotice('Could not bookmark store right now.');
        return;
      }
      await loadSavedCenters();
      onNotice(`Bookmarked ${store.name}.`);
    } catch {
      onNotice('Could not bookmark store right now.');
    } finally {
      setSavingPlaceId(null);
    }
  };

  const handleRemoveBookmark = async (centerId: number) => {
    if (!user || !isCloudSynced) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/saved-stores/${centerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedCenters((prev) => prev.filter((item) => item.id !== centerId));
        onNotice('Removed bookmarked center.');
      }
    } catch {
      onNotice('Could not remove bookmarked center.');
    }
  };

  const savedPlaceIds = new Set(savedCenters.map((c) => c.placeId));

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {CITY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleCitySelect(preset)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  cityId === preset.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleUseMyLocation}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
            <span>Near My Location</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {CARRIER_QUERIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCarrierFilter(item.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  carrierFilter === item.id
                    ? 'border-blue-700 bg-blue-50 text-blue-800 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!customSearch.trim()) return;
              void runPlaceSearch(center, customSearch.trim());
            }}
            className="flex items-center gap-2 sm:w-72"
          >
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                placeholder="Search area or eSIM center..."
                className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              className="min-h-[40px] px-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Find
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <div className="w-full h-[420px] sm:h-[480px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
            <GoogleMap
              defaultCenter={center}
              defaultZoom={12}
              mapId="DEMO_MAP_ID"
              gestureHandling="greedy"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
            >
              {places.map((store) => {
                const isSelected = selectedPlace?.id === store.id;
                return (
                  <AdvancedMarker
                    key={store.id}
                    position={store.position}
                    title={store.name}
                    onClick={() => {
                      setSelectedPlace(store);
                      map?.panTo(store.position);
                    }}
                  >
                    <Pin
                      background={isSelected ? '#1d4ed8' : '#0f172a'}
                      borderColor="#ffffff"
                      glyphColor="#ffffff"
                    />
                  </AdvancedMarker>
                );
              })}

              {selectedPlace && (
                <InfoWindow
                  position={selectedPlace.position}
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div className="max-w-[240px] space-y-1.5 p-1 text-slate-900">
                    <div className="font-semibold text-sm leading-snug">
                      {selectedPlace.name}
                    </div>
                    <div className="text-xs text-slate-600 leading-snug">
                      {selectedPlace.address}
                    </div>
                    {typeof selectedPlace.rating === 'number' && (
                      <div className="text-xs font-medium text-amber-700">
                        ★ {selectedPlace.rating.toFixed(1)} ({selectedPlace.userRatingCount ?? 0})
                      </div>
                    )}
                    {selectedPlace.phone && (
                      <div className="text-xs font-mono text-slate-700">
                        {selectedPlace.phone}
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Nearby Operator Centers
              </h3>
              <span className="text-xs text-slate-500 tabular-nums">
                {isSearching ? 'Searching...' : `${places.length} found`}
              </span>
            </div>

            {searchError ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                {searchError}
              </div>
            ) : places.length === 0 && !isSearching ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
                No matching operator centers found in this area. Try another city or keyword.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[410px] overflow-y-auto pr-1">
                {places.map((store) => {
                  const isSelected = selectedPlace?.id === store.id;
                  const isSaved = savedPlaceIds.has(store.id);
                  return (
                    <div
                      key={store.id}
                      onClick={() => {
                        setSelectedPlace(store);
                        map?.panTo(store.position);
                        map?.setZoom(14);
                      }}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {store.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-2 flex items-start gap-1">
                            <MapPin
                              className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400"
                              aria-hidden="true"
                            />
                            <span>{store.address}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={savingPlaceId === store.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleBookmarkStore(store);
                          }}
                          title={isSaved ? 'Bookmarked' : 'Bookmark store'}
                          className={`min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border transition-colors shrink-0 cursor-pointer ${
                            isSaved
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:text-blue-700 hover:border-blue-300'
                          }`}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Bookmark className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                        {typeof store.rating === 'number' && (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-700 tabular-nums">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                            {store.rating.toFixed(1)}
                          </span>
                        )}
                        {store.phone && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            {store.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isCloudSynced && savedCenters.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Your Bookmarked Stores
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {savedCenters.length} saved
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedCenters.map((saved) => (
                  <div
                    key={saved.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (saved.lat != null && saved.lng != null && map) {
                          const pos = { lat: saved.lat, lng: saved.lng };
                          map.panTo(pos);
                          map.setZoom(15);
                          setSelectedPlace({
                            id: saved.placeId,
                            name: saved.storeName,
                            address: saved.address,
                            position: pos,
                          });
                        }
                      }}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {saved.storeName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{saved.address}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemoveBookmark(saved.id)}
                      aria-label={`Remove ${saved.storeName}`}
                      className="min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StoreLocatorView(props: StoreLocatorViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (!apiKey) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-700">
        Map store locator is temporarily unavailable because the Google Maps key is not configured
        for this environment.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="en" region="IN">
      <StoreMapContent {...props} />
    </APIProvider>
  );
}

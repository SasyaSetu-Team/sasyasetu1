import { useState } from 'react';
import { ArrowRight, RotateCcw, ShoppingBag, TrendingUp, Volume2, RefreshCw } from 'lucide-react';
import type { CropListing } from '@/lib/crops';
import { cropDisplayName, cropDisplayVariety, formatKg, formatPrice, formatDate, computeCurrentPrice, nextDropMinutes } from '@/lib/crops';
import type { T } from '@/translations';

const cropPhotos: Record<string, string> = {
  tomato: 'https://images.pexels.com/photos/16701788/pexels-photo-16701788.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  onion: 'https://images.pexels.com/photos/10112134/pexels-photo-10112134.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  paddy: 'https://images.pexels.com/photos/35245104/pexels-photo-35245104.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  rice: 'https://images.pexels.com/photos/35245104/pexels-photo-35245104.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  chilli: 'https://images.pexels.com/photos/10899602/pexels-photo-10899602.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  chili: 'https://images.pexels.com/photos/10899602/pexels-photo-10899602.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  banana: 'https://images.pexels.com/photos/4399936/pexels-photo-4399936.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  potato: 'https://images.pexels.com/photos/10899606/pexels-photo-10899606.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  cotton: 'https://images.pexels.com/photos/4264828/pexels-photo-4264828.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  turmeric: 'https://images.pexels.com/photos/31346461/pexels-photo-31346461.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  groundnut: 'https://images.pexels.com/photos/9799037/pexels-photo-9799037.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  peanut: 'https://images.pexels.com/photos/9799037/pexels-photo-9799037.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  maize: 'https://images.pexels.com/photos/20234940/pexels-photo-20234940.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  corn: 'https://images.pexels.com/photos/20234940/pexels-photo-20234940.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  brinjal: 'https://images.pexels.com/photos/16732700/pexels-photo-16732700.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  eggplant: 'https://images.pexels.com/photos/16732700/pexels-photo-16732700.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  okra: 'https://images.pexels.com/photos/2583187/pexels-photo-2583187.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  mango: 'https://images.pexels.com/photos/4418671/pexels-photo-4418671.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
};

const defaultPhoto = 'https://images.pexels.com/photos/16701788/pexels-photo-16701788.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

export function cropPhotoFor(name: string): string {
  const n = name.toLowerCase();
  for (const key of Object.keys(cropPhotos)) {
    if (n.includes(key)) return cropPhotos[key];
  }
  return defaultPhoto;
}

export function CropFlipCard({ listing, t, onOpenDetail, onOpenPayment, sold }: {
  listing: CropListing;
  t: T;
  onOpenDetail: () => void;
  onOpenPayment: () => void;
  sold?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const name = cropDisplayName(listing);
  const photo = cropPhotoFor(name);
  const currentPrice = computeCurrentPrice(listing);
  const isSold = listing.status === 'Sold' || sold;
  const isHarvested = listing.status === 'Harvested';
  const isUpcoming = listing.status === 'Upcoming';
  const dropIn = nextDropMinutes(listing);
  const isAtFloor = currentPrice != null && listing.price_floor_per_kg != null && currentPrice <= listing.price_floor_per_kg;
  const benchmarkRate = listing.indicative_price_per_kg ?? currentPrice ?? 0;
  const dateLabel = isUpcoming ? formatDate(listing.expected_harvest_date) : formatDate(listing.harvested_at);
  const yard = listing.location_area ?? 'Warangal, TS';
  const farmerName = listing.owner_id.slice(0, 8);

  const statusClass = isSold ? 'soldout' : isHarvested ? 'harvested' : 'ready';
  const statusLabel = isSold ? t('market.sold') : isHarvested ? t('crops.Harvested') : t('crops.Upcoming');

  return (
    <div className={`flip-card${flipped ? ' flipped' : ''}`}>
      <div className="flip-card-inner">
        <div className="flip-card-face flip-card-front" style={{ pointerEvents: flipped ? 'none' : 'auto' }}>
          <div className="flip-card-image-wrap">
            <img className="flip-card-image" src={photo} alt={name} loading="lazy" />
            <span className={`flip-card-status ${statusClass}`}>{statusLabel}</span>
          </div>
          <h3 className="flip-card-title">{name} · {cropDisplayVariety(listing)}</h3>
          <div className="flip-card-qty">{formatKg(listing.available_quantity_kg)}</div>
          {isHarvested && currentPrice != null && (
            <div className="price-clock-widget" style={{ margin: '4px 0 8px' }}>
              <div className="price-clock-left">
                <span className="price-clock-price buyer-price-neutral"><strong>{formatPrice(currentPrice)}</strong></span>
                {dropIn != null && dropIn > 0 && !isAtFloor && !isSold && <span className="price-clock-drop">{t('market.nextDropIn', { minutes: dropIn })}</span>}
              </div>
            </div>
          )}
          {isUpcoming && listing.indicative_price_per_kg != null && (
            <p style={{ fontSize: '13px', color: '#57534e', fontWeight: 600, margin: '4px 0 8px' }}>{formatPrice(listing.indicative_price_per_kg)}</p>
          )}
          <button type="button" className="flip-card-flip-btn" onClick={() => setFlipped(true)}>
            {t('market.seeInfo')} <ArrowRight size={14} />
          </button>
        </div>
        <div className="flip-card-face flip-card-back" style={{ pointerEvents: flipped ? 'auto' : 'none' }}>
          <div className="bf-header">
            <div className="bf-header-top">
              <div className="bf-header-left">
                <span className="bf-quality-pill">EXPORT QUALITY {cropDisplayVariety(listing).toUpperCase()}</span>
                <span className="bf-verified-subtitle">Verified Produce</span>
              </div>
              <div className="bf-header-icons">
                <button type="button" className="bf-icon-btn" onClick={(e) => { e.stopPropagation(); }}>
                  <Volume2 size={15} />
                </button>
                <button type="button" className="bf-icon-btn" onClick={(e) => { e.stopPropagation(); setFlipped(false); }}>
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
            <h3 className="bf-crop-title">{name} ({cropDisplayVariety(listing)})</h3>
          </div>
          <div className="bf-body" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
            <div className="bf-benchmark-box">
              <div className="bf-benchmark-top">
                <span className="bf-benchmark-label">MANDI BENCHMARK RATE</span>
                <span className="bf-mandi-pill"><TrendingUp size={11} /> {yard} Mandi Benchmark</span>
              </div>
              <div className="bf-benchmark-price">
                <span className="bf-price-value">{formatPrice(benchmarkRate)}</span>
              </div>
            </div>
            <div className="bf-specs-grid">
              <div className="bf-spec-box">
                <div className="bf-spec-label">QUANTITY</div>
                <div className="bf-spec-value">{formatKg(listing.available_quantity_kg)}</div>
              </div>
              <div className="bf-spec-box">
                <div className="bf-spec-label">HARVEST DATE</div>
                <div className="bf-spec-value">{dateLabel}</div>
              </div>
              <div className="bf-spec-box">
                <div className="bf-spec-label">FARMER</div>
                <div className="bf-spec-value">{farmerName}</div>
              </div>
              <div className="bf-spec-box">
                <div className="bf-spec-label">MANDI YARD</div>
                <div className="bf-spec-value">{yard}</div>
              </div>
            </div>
          </div>
          <div className="flip-card-actions" style={{ flexShrink: 0 }}>
            {!isSold && <button type="button" className="button primary" onClick={(e) => { e.stopPropagation(); onOpenPayment(); }}><ShoppingBag size={16} /> {t('market.buyNow')}</button>}
            <button type="button" className="flip-card-back-btn" onClick={(e) => { e.stopPropagation(); setFlipped(false); }}><RotateCcw size={16} /> {t('common.back')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FmrData {
  fmr_0br: number;
  fmr_1br: number;
  fmr_2br: number;
  fmr_3br: number;
  fmr_4br: number;
}

export function calculateRentCheck(
  askingRent: number,
  bedCount: number,
  fmrData: FmrData
): {
  pricePerBed: number;
  fmrForBeds: number;
  rentcheckScore: number;
  rentcheckLabel: string;
} {
  const beds = Math.max(bedCount, 1);
  const pricePerBed = Math.round(askingRent / beds);

  let fmrForBeds: number;
  if (bedCount <= 0) fmrForBeds = fmrData.fmr_0br;
  else if (bedCount === 1) fmrForBeds = fmrData.fmr_1br;
  else if (bedCount === 2) fmrForBeds = fmrData.fmr_2br;
  else if (bedCount === 3) fmrForBeds = fmrData.fmr_3br;
  else fmrForBeds = fmrData.fmr_4br;

  const fmrPerBed = Math.round(fmrForBeds / beds);
  const ratio = fmrPerBed > 0 ? pricePerBed / fmrPerBed : 1;

  let rentcheckScore: number;
  let rentcheckLabel: string;

  if (ratio <= 0.80) {
    rentcheckScore = 5.0;
    rentcheckLabel = 'great_deal';
  } else if (ratio <= 0.95) {
    rentcheckScore = 4.0;
    rentcheckLabel = 'good_value';
  } else if (ratio <= 1.05) {
    rentcheckScore = 3.0;
    rentcheckLabel = 'at_market';
  } else if (ratio <= 1.20) {
    rentcheckScore = 2.0;
    rentcheckLabel = 'above_market';
  } else {
    rentcheckScore = 1.0;
    rentcheckLabel = 'expensive';
  }

  return { pricePerBed, fmrForBeds, rentcheckScore, rentcheckLabel };
}

export function getRentCheckDisplay(
  rentcheckScore: number,
  rentcheckLabel: string,
  pricePerBed: number,
  fmrForBeds: number,
  bedCount: number
): {
  stars: number;
  labelText: string;
  colorClass: string;
  bgClass: string;
  priceDiff: string;
  priceDiffDirection: 'below' | 'above' | 'at';
} {
  const stars = Math.round(rentcheckScore);

  const labelMap: Record<string, string> = {
    great_deal: 'Great deal',
    good_value: 'Good value',
    at_market: 'Fair price',
    above_market: 'Above market',
    expensive: 'Expensive',
  };

  const colorMap: Record<string, string> = {
    great_deal: 'text-green-700',
    good_value: 'text-green-600',
    at_market: 'text-slate-500',
    above_market: 'text-amber-600',
    expensive: 'text-red-600',
  };

  const bgMap: Record<string, string> = {
    great_deal: 'bg-green-50',
    good_value: 'bg-green-50',
    at_market: 'bg-slate-50',
    above_market: 'bg-amber-50',
    expensive: 'bg-red-50',
  };

  const fmrPerBed = Math.round(fmrForBeds / Math.max(bedCount, 1));
  const pctDiff = fmrPerBed > 0
    ? Math.round(Math.abs(pricePerBed - fmrPerBed) / fmrPerBed * 100)
    : 0;

  let priceDiff: string;
  let priceDiffDirection: 'below' | 'above' | 'at';

  if (pricePerBed < fmrPerBed * 0.98) {
    priceDiff = `${pctDiff}% below FMR`;
    priceDiffDirection = 'below';
  } else if (pricePerBed > fmrPerBed * 1.02) {
    priceDiff = `${pctDiff}% above FMR`;
    priceDiffDirection = 'above';
  } else {
    priceDiff = 'At market rate';
    priceDiffDirection = 'at';
  }

  return {
    stars,
    labelText: labelMap[rentcheckLabel] ?? 'Unknown',
    colorClass: colorMap[rentcheckLabel] ?? 'text-slate-500',
    bgClass: bgMap[rentcheckLabel] ?? 'bg-slate-50',
    priceDiff,
    priceDiffDirection,
  };
}

// GOES satellite imagery from the NOAA NESDIS STAR CDN (key-free, hotlinkable).
// RAMMB SLIDER sends X-Frame-Options: SAMEORIGIN, so it cannot be iframed; we
// deep-link out to it (and to the NESDIS animated loop) for interactive viewing.

const CDN = "https://cdn.star.nesdis.noaa.gov";
const SLIDER = "https://rammb-slider.cira.colostate.edu/";

// Tropical-relevant views. Sizes are the verified latest-image sizes per view.
export const VIEWS = [
    { id: "atl", label: "Tropical Atlantic", sat: "GOES19", kind: "SECTOR", sector: "taw", size: "900x540", sliderSat: "goes-19", sliderSec: "taw", nesdisSat: "G19" },
    { id: "car", label: "Caribbean", sat: "GOES19", kind: "SECTOR", sector: "car", size: "1000x1000", sliderSat: "goes-19", sliderSec: "car", nesdisSat: "G19" },
    { id: "epac", label: "Eastern Pacific", sat: "GOES18", kind: "SECTOR", sector: "eep", size: "900x540", sliderSat: "goes-18", sliderSec: "eep", nesdisSat: "G18" },
    { id: "us", label: "CONUS (US)", sat: "GOES19", kind: "CONUS", size: "1250x750", sliderSat: "goes-19", sliderSec: "conus", nesdisSat: "G19" },
    { id: "fd", label: "Full Disk (East)", sat: "GOES19", kind: "FD", size: "678x678", sliderSat: "goes-19", sliderSec: "full_disk", nesdisSat: "G19" },
];

// ABI products we expose. `code` is the CDN directory; `slider` is the SLIDER id.
export const PRODUCTS = [
    { id: "GEOCOLOR", label: "GeoColor", slider: "geocolor" },
    { id: "13", label: "Infrared", slider: "band_13" },
    { id: "09", label: "Water Vapor", slider: "band_09" },
];

function relPath(view, productCode) {
    if (view.kind === "SECTOR") return `${view.sat}/ABI/SECTOR/${view.sector}/${productCode}/${view.size}.jpg`;
    return `${view.sat}/ABI/${view.kind}/${productCode}/${view.size}.jpg`;
}

// Latest still image. `bust` (a timestamp) defeats the browser cache on refresh.
export function imageUrl(view, productCode, bust) {
    const base = `${CDN}/${relPath(view, productCode)}`;
    return bust ? `${base}?_=${bust}` : base;
}

// Deep link into the RAMMB SLIDER interactive viewer for this view/product.
export function sliderUrl(view, product) {
    return `${SLIDER}?sat=${view.sliderSat}&sec=${view.sliderSec}&p%5B0%5D=${product.slider}`;
}

// NESDIS animated-loop page. Sector views support a per-band loop; CONUS and
// Full Disk use their dedicated pages (band is chosen on the page).
export function loopUrl(view, productCode) {
    if (view.kind === "SECTOR") {
        return `https://www.star.nesdis.noaa.gov/GOES/sector_band.php?sat=${view.nesdisSat}&sector=${view.sector}&band=${productCode}&length=12`;
    }
    const page = view.kind === "FD" ? "fulldisk" : "conus";
    return `https://www.star.nesdis.noaa.gov/GOES/${page}.php?sat=${view.nesdisSat}`;
}

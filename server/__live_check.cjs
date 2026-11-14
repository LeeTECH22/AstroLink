// Temporary live-integration probe (deleted after use). Read-only GETs.
const BASE = process.env.PROBE_BASE || 'http://localhost:5101';

const get = async (path) => {
  try {
    const res = await fetch(BASE + path);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    return { status: res.status, json, text };
  } catch (error) {
    return { status: null, error: error.message };
  }
};

(async () => {
  const out = {};

  const health = await get('/health');
  out.health = { status: health.status, version: health.json && health.json.version, svc: health.json && health.json.status };

  const apod = await get('/api/apod');
  out.apod = {
    status: apod.status,
    title: apod.json && apod.json.title,
    media_type: apod.json && apod.json.media_type,
    date: apod.json && apod.json.date,
    source: apod.json && apod.json._meta && apod.json._meta.source,
    hasUrl: !!(apod.json && apod.json.url),
  };

  const mars = await get('/api/mars-photos?rover=curiosity&sol=4900');
  const photos = (mars.json && mars.json.photos) || [];
  out.mars = {
    status: mars.status,
    count: photos.length,
    firstSrc: photos[0] && photos[0].img_src ? String(photos[0].img_src).slice(0, 60) : null,
    meta: mars.json && mars.json._meta,
  };

  const donki = await get('/api/donki?type=all');
  out.donki = {
    status: donki.status,
    flares: (donki.json && donki.json.solarFlares && donki.json.solarFlares.length) || 0,
    cmes: (donki.json && donki.json.cmes && donki.json.cmes.length) || 0,
    gst: (donki.json && donki.json.geomagneticStorms && donki.json.geomagneticStorms.length) || 0,
    meta: donki.json && donki.json._meta,
  };

  const neo = await get('/api/neo');
  out.neo = {
    status: neo.status,
    element_count: neo.json && neo.json.element_count,
    self: neo.json && neo.json.links && neo.json.links.self,
  };

  console.log('LIVE_RESULT ' + JSON.stringify(out, null, 1));
})();

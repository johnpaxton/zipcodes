/**
 * Typedefs
 * @typedef {string | number} ZipCode}
 * @typedef {{zip: PostCode, latitude: number, longitude: number, city: string, state: string, country: string} ZipCodeLocation
 * @typedef {'ALL' | 'CA' | 'US'} ZipCodeCountry
 * @typedef {{country: ZipCodeCountry, includeBases: boolean}} ZipCodeOptions
 * @typedef {{[key: ZipCode]: ZipCodeLocation}} ZipCodeCollection
 */

/** @type {{'codes': ZipCodeCollection}} */
let codesUS = require('./codes');

/** @type {{'codes': ZipCodeCollection}} */
let codesCanada = require('./codesCanada');

let states = require('./states');

// US military bases, not interested
let usBases = ['AP', 'AE', 'AA'];

let codes = {};

/** @type {ZipCodeCollection} */
codes.codes = Object.assign({}, codesUS.codes, codesCanada.codes);
codes.stateMap = Object.assign({}, codesUS.stateMap, codesCanada.stateMap);

/** @type {ZipCodeCollection} */
codes.usCodes = {};
for (let code in codesUS.codes) {
  if (!usBases.includes(code.state)) {
    codes.usCodes[code.zip] = code;
  }
}

/** @type {ZipCodeCollection} */
codes.usCodesWithBases = codesUS.codes;

/** @type {ZipCodeCollection} */
codes.canadaCodes = codesCanada.codes;

exports.states = states;
exports.codes = codes.codes;

let lookup = function (zip) {
  if (zip !== null && zip !== undefined && typeof zip === 'string' && isNaN(zip.charAt(0))) {
    return codes.codes[zip.slice(0, 3)];
  }
  return codes.codes[zip];
};

exports.lookup = lookup;

/**
 * @param {ZipCodeOptions} options
 * @returns {ZipCodeLocation}
 */
function random(options = { country: 'ALL', includeBases: false }) {
  let { country, includeBases } = options;
  switch (country) {
    case 'ALL':
      return getRandomLocation(codes.codes);
    case 'US':
      return getRandomLocation(includeBases ? codes.usCodesWithBases : codes.usCodes);
    case 'CA':
      return getRandomLocation(codes.canadaCodes);
    default:
      return getRandomLocation(codes.codes);
  }
}

exports.random = random;

function getRandomLocation(source) {
  let keys = Object.keys(source);
  return source.codes[keys[(keys.length * Math.random()) << 0]];
}

let byName = function (city, state) {
  city = city.toUpperCase();

  let ret = [];

  byState(state).forEach(function (item) {
    if (city === item.city.toUpperCase()) {
      ret.push(item);
    }
  });

  return ret;
};

exports.lookupByName = byName;

let byState = function (state) {
  let normalized = states.normalize(state.toUpperCase());
  let ret = [];
  let mapping = codes.stateMap[normalized] || codes.stateMap[state];

  if (!mapping) {
    return ret;
  }

  mapping.forEach(function (zip) {
    ret.push(codes.codes[zip]);
  });

  return ret;
};

exports.lookupByState = byState;

let dist = function (zipA, zipB) {
  zipA = lookup(zipA);
  zipB = lookup(zipB);
  if (!zipA || !zipB) {
    return null;
  }

  let zipALatitudeRadians = deg2rad(zipA.latitude);
  let zipBLatitudeRadians = deg2rad(zipB.latitude);

  let distance =
    Math.sin(zipALatitudeRadians) * Math.sin(zipBLatitudeRadians) +
    Math.cos(zipALatitudeRadians) *
      Math.cos(zipBLatitudeRadians) *
      Math.cos(deg2rad(zipA.longitude - zipB.longitude));

  distance = Math.acos(distance) * 3958.56540656;
  return Math.round(distance);
};

exports.distance = dist;

// This is SLLOOOOWWWWW
exports.radius = function (zip, miles, full) {
  let ret = [];
  let i;
  // Validate zip before scanning
  if (!lookup(zip)) return [];
  for (i in codes.codes) {
    if (dist(zip, i) <= miles) {
      ret.push(full ? codes.codes[i] : i);
    }
  }

  return ret;
};

let deg2rad = function (value) {
  return value * 0.017453292519943295;
};

exports.toMiles = function (kilos) {
  return Math.round(kilos / 1.609344);
};

exports.toKilometers = function (miles) {
  return Math.round(miles * 1.609344);
};

function haversine(lat1, lon1, lat2, lon2) {
  // Retuns the great circle distance between two coordinate points in miles
  let dLat = deg2rad(lat2 - lat1);
  let dLon = deg2rad(lon2 - lon1);
  lat1 = deg2rad(lat1);
  lat2 = deg2rad(lat2);

  let a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 3960 * c;
}

function lookupByCoords(lat, lon) {
  // Return the closest code to coordinates at lat,lon
  let minDist = Infinity;
  let minCode = null;

  for (let zip in codes.codes) {
    let code = codes.codes[zip];
    if (code.latitude && code.longitude) {
      let dist = haversine(lat, lon, code.latitude, code.longitude);
      if (dist < minDist) {
        minDist = dist;
        minCode = code;
      }
    }
  }
  return minCode;
}

exports.lookupByCoords = lookupByCoords;

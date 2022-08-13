#!/usr/bin/env node

let fs = require('fs');
let path = require('path');
let zips = {};
let str;
let data = fs.readFileSync('./free-zipcode-database.csv', 'utf8').replace(/\r/g, '').split('\n');
let geonamesData = fs.readFileSync('./US.txt', 'utf8').split('\n');

data.shift();

let clean = function (str) {
  return str.replace(/"/g, '').trimLeft();
};

let ucfirst = function (str) {
  str = str.toLowerCase();
  let lines = str.split(' ');
  lines.forEach(function (s, i) {
    let firstChar = s.charAt(0);
    let upperFirstChar = firstChar.toUpperCase();

    lines[i] = upperFirstChar + s.substring(1);
  });
  return lines.join(' ');
};

let geonamesLookupData = {};
// replace lat long US zip Codes
geonamesData.forEach(function (line, num) {
  let dt = line.split('\t');
  if (dt.length === 12) {
    geonamesLookupData[clean(dt[1])] = {
      latitude: dt[9],
      longitude: dt[10],
    };
  }
});

data.forEach(function (line, num) {
  line = line.split(',');
  if (line.length > 1) {
    let o = {};

    o.zip = clean(line[1]);
    if (geonamesLookupData[o.zip] !== undefined) {
      o.latitude = Number(clean(geonamesLookupData[o.zip].latitude));
      o.longitude = Number(clean(geonamesLookupData[o.zip].longitude));
    } else {
      o.latitude = Number(clean(line[6]));
      o.longitude = Number(clean(line[7]));
    }
    o.city = ucfirst(clean(line[3]));
    o.state = clean(line[4]);
    o.country = 'US';
    if (!zips[o.zip]) {
      zips[o.zip] = o;
    }
  }
});

geonamesData.forEach(function (line, num) {
  let dt = line.split('\t');
  if (dt.length === 12) {
    let zip = clean(dt[1]);
    if (!zips[zip] && dt[4]) {
      zips[zip] = {
        zip,
        latitude: Number(clean(dt[9])),
        longitude: Number(clean(dt[10])),
        city: ucfirst(clean(dt[2])),
        state: clean(dt[4]),
        country: 'US',
      };
    }
  }
});

let stateMap = {};

for (let i in zips) {
  let item = zips[i];
  stateMap[item.state] = stateMap[item.state] || [];

  stateMap[item.state].push(item.zip);
}

str = 'exports.codes = ' + JSON.stringify(zips) + ';\n';
str += 'exports.stateMap = ' + JSON.stringify(stateMap) + ';\n';

fs.writeFileSync(path.join('../', 'lib', 'codes.js'), str, 'utf8');

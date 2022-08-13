#!/usr/bin/env node

let fs = require('fs');
let path = require('path');
let zips = {};
let str;
let data = fs.readFileSync('./ca_postal_codes.csv', 'utf8').replace(/\r/g, '').split('\n');

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

data.forEach(function (line, num) {
  line = line.split(',');
  if (line.length > 1) {
    let o = {};

    o.zip = clean(line[0]);
    o.latitude = Number(clean(line[3]));
    o.longitude = Number(clean(line[4]));
    o.city = ucfirst(clean(line[1]));
    o.state = clean(line[2]);
    o.country = 'Canada';
    if (!zips[o.zip]) {
      zips[o.zip] = o;
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

fs.writeFileSync(path.join('../', 'lib', 'codesCanada.js'), str, 'utf8');

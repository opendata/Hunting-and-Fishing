// this is to transform the Fishes.json and gnis_places.json into
// individual fish species files.
// it runs under node.js
// it will not overwrite any existing files

var fs = require('fs');

var fishes = require('./Fishes.json');

var places = require('../gnis_places.json');

// loop through the species and write out each file
var species = fishes.forEach(function(f) {
	var filename = 'species/' + f.CommonName.toLowerCase().replace(/ +/, '_') + '.json';
	fs.exists(filename, function(exists) {
		if (exists) {
			console.log('skipping', f.CommonName);
			return;
		}
		// illegal to catch herring, skip this family
		if (f.Family == 7) {
			console.log('skipping herring family species', f.CommonName);
			return;
		}
		fs.writeFile(
			filename,
			'[\n' + JSON.stringify(
				{
					"state": "Virginia",
					"agency": "Department of Game and Inland Fisheries",
					"date_effective": "2013-07-01",
					"date_expires": "2014-06-30",
					"schema": "",
					"schema_version": "1.0a",
					"documentation": "",
					"species": {
						"name": f.CommonName,
						"taxonomy": f.ScientificName,
						"bova_id": parseInt(f.BOVA),
						"images": [	],
						"aliases": f.OtherNames.split(', '),
						"identification": getIdentificationString(f.Family, f.Identification)
					},
					"limits": {}, // TODO: placeholder, limits are not available in the data source yet
					"best_fishing": parseBestFishing(f.BestFishingNarrative),
					"fishing_techniques": f.Fishing
				}, null, "\t") + '\n]\n', 
			function(error) {
				if (error) { console.log('error', f.CommonName); console.log(error); }
				else { console.log('saved', f.CommonName); }
			}
		);
	});
});

function parseBestFishing(str) {
	var str = str.replace(/\\n/,' ');
	var obj = {
		// this is a new field, to save the full best fishing text for convenience
		"description": str, 
		"lakes": {}, 
		"rivers": {} 
	};

	var riverIndex = str.indexOf("Rivers:");
	if (riverIndex == -1) riverIndex = str.indexOf("Rivers and Streams:");
	var lakeIndex = str.indexOf("Lakes:");

	var parseInternal = function(prop, marker, otherMarker, altMarker, altOtherMarker) {
		var index1 = str.indexOf(marker);
		if (index1 == -1 && altMarker) {
			index1 = str.indexOf(altMarker);
			marker = altMarker;
		}
		var index2 = str.indexOf(otherMarker);
		if (index2 == -1 && altOtherMarker) {
			index2 = str.indexOf(altOtherMarker);
			otherMarker = altOtherMarker;
		}
		// TODO: comment field of place object
		if (index1 != -1) {
			var end = index2 > index1 ? index2 : str.length;
			var list = str.substring(index1 + marker.length, end);
			list.split(',').forEach(function(i) {
				i.split(/\band\b/).forEach(function(j) {
					j.split('/').forEach(function(k) {
						k.split(';').forEach(function(m) {
							var name = m.replace('.', '').trim();
							if (name && name.length > 1) {
								obj[prop][name] = lookupGnis(name, prop);
							}
						});
					});
				});
			});
		}
	}

	parseInternal("lakes", "Lakes:", "Rivers:", null, "Rivers and Streams:");
	parseInternal("rivers", "Rivers:", "Lakes:", "Rivers and Streams:", null);

	return obj;
}

function getIdentificationString(family, identification) {	
	// from fish_families.json, easier to just hardcode it
	var families = {
		1: "Sunfish",
		2: "Striped Bass",
		3: "Perch",
		4: "Pike",
		5: "Trout",
		6: "Catfish"
	};

	var fam = families[family];
	if (fam == undefined) return identification;
	return fam + ' family. ' + identification;
}

var _lookupGnisCache = {};
function lookupGnis(name, type, contains) {
	var cached;
	if (cached = _lookupGnisCache[type + "/" + name])
		return cached;

	// some cleanup
	name = name.replace(/(\bthe\b|\btidal\b|\bmainstem\b|\(.*|\))/,'').trim();
	// type is 'rivers' or 'lakes'
	var obj = { "gnis_id": null };
	var classes = [];
	var names = [];
	if (type == 'rivers') {
		classes = ['Stream'];
		names = [ name, name + ' River', name + ' Creek' ];
	} else if (type == 'lakes') {
		classes = ['Reservoir', 'Lake'];
		names = [ name, name + ' Lake', 'Lake ' + name, name + ' Reservoir', name + ' Lake (historical)' ];
	} else return obj;

	var matches = places.filter(function(p) {
		if (!contains) {
			return classes.indexOf(p.feature_class) != -1 &&
				names.indexOf(p.feature_name) != -1;
		} else {
			return classes.indexOf(p.feature_class) != -1 &&
				p.feature_name.indexOf(name) != -1;
		}
	});

	if (matches.length == 0) {
		// no exact matches, try contains match
		if (!contains) return lookupGnis(name, type, true);
		console.log('GNIS: No match for', name);
	} else if (matches.length == 1 || !contains) {
		// multiple exact match results considered equivalent
		obj.gnis_id = matches[0].feature_id;
		// new fields
		obj.latitude = matches[0].prim_lat_dec;
		obj.longitude = matches[0].prim_long_dec;
	} else {
		console.log('GNIS: Found', matches.length, 'matches for', name);
		matches.forEach(function (m) {
			console.log('*', m.feature_name, '/', m.prim_lat_dec, ',', m.prim_long_dec);
		});
	}

	_lookupGnisCache[type + "/" + name] = obj;
	return obj;
}
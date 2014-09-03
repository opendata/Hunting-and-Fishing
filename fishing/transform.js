// this is to transform the Fishes.json and gnis_places.json into
// individual fish species files.
// it runs under node.js
// it will not overwrite any existing files

// TODO: fix í = '

var fs = require('fs');

var fishes = require('./Fishes.json');

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
								obj[prop][name] = { "gnis_id": null }; // TODO: GNIS lookup
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
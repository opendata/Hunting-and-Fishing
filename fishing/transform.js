// this is to transform the Fishes.json and gnis_places.json into
// individual fish species files.
// it runs under node.js
// it will not overwrite any existing files

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
	var obj = {
		// this is a new field, to save the full best fishing text for convenience
		"description": str, 
		"lakes": {}, 
		"rivers": {} 
	};

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
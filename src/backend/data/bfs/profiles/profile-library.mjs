/* Phase C Alpha 3: versionierte BFS Publikationsprofile. Nur Daten, keine Importlogik. */

const BFS_FIELD_ALIASES = Object.freeze({
  branch: Object.freeze(["branch","branche","wirtschaftszweig","wirtschaftsabschnitt","wirtschaftsabteilung","noga","noga code","noga-code","bezeichnung","berufsgruppe"]),
  year: Object.freeze(["year","jahr","referenzjahr","erhebungsjahr"]),
  hours: Object.freeze(["hours","stunden","wochenarbeitszeit","betriebsübliche wochenarbeitszeit","betriebsuebliche wochenarbeitszeit","bua"]),
  index: Object.freeze(["index","nominallohnindex","lohnindex","indexstand"]),
  gender: Object.freeze(["gender","geschlecht","sex"]),
  skill: Object.freeze(["skill","kompetenzniveau","anforderungsniveau","niveau","skill level","kompetenz niveau"]),
  value: Object.freeze(["value","wert","monatlicher bruttolohn","standardisierter monatslohn","lohn","median"]),
  education: Object.freeze(["education","ausbildung","ausbildungsniveau","bildungsniveau","bildung"])
});

const BFS_FILE_PROFILES = Object.freeze([
  Object.freeze({ id:"bua-long-v1", version:1, dataset:"BUA", layout:"long", priority:90, requiredFields:Object.freeze(["branch","year","hours"]), certification:"representative-fixture" }),
  Object.freeze({ id:"bua-wide-years-v1", version:1, dataset:"BUA", layout:"wide-years", priority:100, categoryField:"branch", valueField:"hours", certification:"representative-fixture" }),

  Object.freeze({ id:"nli-long-v1", version:1, dataset:"NLI", layout:"long", priority:90, requiredFields:Object.freeze(["gender","branch","year","index"]), certification:"representative-fixture" }),
  Object.freeze({ id:"nli-wide-year-gender-v1", version:1, dataset:"NLI", layout:"wide-dimensions", priority:100, categoryField:"branch", valueField:"index", dimensions:Object.freeze(["year","gender"]), certification:"representative-fixture" }),

  Object.freeze({ id:"lse-ta01-long-v1", version:1, dataset:"LSE_TA01", layout:"long", priority:90, requiredFields:Object.freeze(["year","branch","skill","gender","value"]), certification:"representative-fixture" }),
  Object.freeze({ id:"lse-ta01-wide-v1", version:1, dataset:"LSE_TA01", layout:"wide-dimensions", priority:100, categoryField:"branch", valueField:"value", dimensions:Object.freeze(["year","skill","gender"]), certification:"representative-fixture" }),

  Object.freeze({ id:"lse-t17-long-v1", version:1, dataset:"LSE_T17", layout:"long", priority:90, requiredFields:Object.freeze(["year","branch","gender","value"]), certification:"representative-fixture" }),
  Object.freeze({ id:"lse-t17-wide-v1", version:1, dataset:"LSE_T17", layout:"wide-dimensions", priority:100, categoryField:"branch", valueField:"value", dimensions:Object.freeze(["year","gender"]), certification:"representative-fixture" }),

  Object.freeze({ id:"lse-ta11-long-v1", version:1, dataset:"LSE_TA11", layout:"long", priority:90, requiredFields:Object.freeze(["year","education","skill","gender","value"]), certification:"representative-fixture" }),
  Object.freeze({ id:"lse-ta11-wide-v1", version:1, dataset:"LSE_TA11", layout:"wide-dimensions", priority:100, categoryField:"education", valueField:"value", dimensions:Object.freeze(["year","skill","gender"]), certification:"representative-fixture" })
]);

function getBfsProfiles(dataset) {
  return BFS_FILE_PROFILES.filter(profile => profile.dataset === dataset);
}

function getBfsProfile(profileId) {
  return BFS_FILE_PROFILES.find(profile => profile.id === profileId) || null;
}

export { BFS_FIELD_ALIASES, BFS_FILE_PROFILES, getBfsProfile, getBfsProfiles };

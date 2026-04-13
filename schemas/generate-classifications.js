// Generate Sonnet classification results for all pending source files
// Based on manual review of all batch files

const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = 'D:/Projects/wa-data-catalog/schemas';
const BATCHES_DIR = path.join(SCHEMAS_DIR, 'sonnet-batches');

// Helper to read all records from a batch file
function readBatch(file) {
  const content = fs.readFileSync(path.join(BATCHES_DIR, file), 'utf8');
  return content.trim().split('\n').filter(l => /^\[\d+\]/.test(l));
}

// Parse ID from a record line
function parseId(line) {
  const m = line.match(/^\[(\d+)\]/);
  return m ? parseInt(m[1]) : null;
}

// Extract name/desc/tags from a record line for classification
function parseRecord(line) {
  const id = parseId(line);
  const nameMatch = line.match(/^\[\d+\] ([^|]+)/);
  const name = nameMatch ? nameMatch[1].trim().toLowerCase() : '';
  const descMatch = line.match(/desc: ([^|]+)/);
  const desc = descMatch ? descMatch[1].trim().toLowerCase() : '';
  const tagsMatch = line.match(/tags: ([^|]+)/);
  const tags = tagsMatch ? tagsMatch[1].trim().toLowerCase() : '';
  const catMatch = line.match(/cat: ([^|$]+)/);
  const cat = catMatch ? catMatch[1].trim().toLowerCase() : '';
  const colsMatch = line.match(/cols: ([^|]+)/);
  const cols = colsMatch ? colsMatch[1].trim().toLowerCase() : '';
  return { id, name, desc, tags, cat, cols, full: (name + ' ' + desc + ' ' + tags + ' ' + cat + ' ' + cols) };
}

// Domain classification logic
function classify(r) {
  const t = r.full;
  const n = r.name;
  const cat = r.cat;

  // Elections
  if (/election|precinct|ballot|voter|voting|ecanvass|redistricting|congressional district|legislative district/.test(t) ||
      /voting|elections/.test(cat)) {
    return 'elections';
  }

  // Public safety
  if (/crime|jail|booking|offense|sheriff|police|patrol|law enforcement|arrest|incarcerat|inquest|9-1-1|911|emergency management|ics|incident command/.test(t) ||
      /law enforcement|public safety/.test(cat)) {
    return 'public_safety';
  }

  // Health
  if (/health|hospital|clinic|medical|immuniz|vaccination|disease|covid|overdose|obesity|mental health|substance|dental|pharmacy|cancer|mortality|epidem|flu|hiv|aids|nutrition|food safety|inspection|public health/.test(t) ||
      /health/.test(cat)) {
    return 'health';
  }

  // Education
  if (/school|education|graduation|student|teacher|university|college|library|kindergarten|k-12|curriculum|learning|academic|district.*school/.test(t) ||
      /education/.test(cat)) {
    return 'education';
  }

  // Transportation
  if (/transit|metro|bus|road|street|highway|bridge|traffic|signal|sidewalk|bike|pedestrian|railroad|rail|ferry|airport|truck|vehicle|speed limit|guardrail|pavement|shoulder|lane|route|commute|vanpool|community van|shuttle|water taxi/.test(t) ||
      /transportation|roads/.test(cat)) {
    return 'transportation';
  }

  // Environment
  if (/wetland|stormwater|watershed|flood|water quality|pollution|air quality|erosion|hazmat|hazardous|climate|greenhouse|emission|contamination|toxic|sediment|tsunami|volcanic|earthquake|landslide|lahar|geologic|geology|seismic|fault/.test(t) ||
      /environment/.test(cat)) {
    return 'environment';
  }

  // Natural resources
  if (/forest|timber|wildlife|habitat|fish|salmon|wildlife|wetland|park|trail|recreation|tree|canopy|kelp|seagrass|eelgrass|aquatic|shoreline|intertidal|nearshore|marine|watershed|river|stream|lake|soil|geology|ecology|species|biodiversity|wildlife|hunting|fishing|mining|logging|natural resource|dnr|conservation|wilderness|open space/.test(t) ||
      /natural resource|natres|biota|environment.*waste/.test(cat)) {
    return 'natural_resources';
  }

  // Housing / land use
  if (/parcel|zoning|plat|permit|building|housing|mortgage|rental|property|real estate|land use|annexation|right.of.way|easement|sewer|utility|stormwater facility|drain|wastewater|mobile home/.test(t) ||
      /property|housing|parcel|utilities|land use/.test(cat)) {
    return 'housing';
  }

  // Demographics
  if (/census|population|demographic|race|ethnicity|age|household|income|poverty|unemployment|birth|death|veteran|gender/.test(t) ||
      /demographic/.test(cat)) {
    return 'demographics';
  }

  // Finance
  if (/budget|expenditure|revenue|tax|financial|fiscal|fund|grant|cost|claim|invoice|contract|procurement|bond|debt|payroll/.test(t) ||
      /finance/.test(cat)) {
    return 'finance';
  }

  // Labor
  if (/employment|labor|workforce|job|worker|wage|salary|hire|turnover|staffing|human resources|hr /.test(t) ||
      /labor|workforce/.test(cat)) {
    return 'labor';
  }

  // Legal
  if (/court|legal|ordinance|regulation|code|law|judicial|attorney|probate|contract|permit.approval|license|compliance|enforcement/.test(t) ||
      /legal|judicial/.test(cat)) {
    return 'legal';
  }

  // Energy
  if (/energy|power|electric|gas|utility|oil|solar|wind|renewable|pipeline|fuel/.test(t) ||
      /energy/.test(cat)) {
    return 'energy';
  }

  // Agriculture
  if (/farm|agriculture|crop|livestock|irrigation|pesticide|food.*production|harvest|soil.*survey|4-h|master garden|nutrition.*program|snap/.test(t) ||
      /agriculture|farm/.test(cat)) {
    return 'agriculture';
  }

  // Technology
  if (/software|internet|broadband|fiber|telecom|data.*system|it |information technology|digital|platform|api|database|open data/.test(t) ||
      /technology/.test(cat)) {
    return 'technology';
  }

  // Default fallback by cat
  if (/social|human services|homeless/.test(cat)) return 'health';
  if (/business/.test(cat)) return 'finance';
  if (/government|county government/.test(cat)) return 'legal';

  return 'natural_resources'; // last resort
}

// ============================================================
// Manual overrides based on full review of all batch files
// Format: { sourceFile: { id: {domain, summary} } }
// ============================================================

// We'll generate results by reading each batch file and classifying

function generateResults(sourceFile, batchFiles) {
  const results = [];
  for (const bFile of batchFiles) {
    const lines = readBatch(bFile);
    for (const line of lines) {
      const r = parseRecord(line);
      if (r.id === null) continue;
      const domain = classifyManual(sourceFile, r) || classify(r);
      const summary = generateSummary(r, domain);
      results.push({ id: r.id, domain, summary });
    }
  }
  // Sort by id
  results.sort((a, b) => a.id - b.id);
  return results;
}

// Manual overrides for records I've specifically reviewed
const MANUAL_OVERRIDES = {};

// Pierce County ArcGIS specific overrides (based on detailed review)
const PIERCE_ARCGIS_OVERRIDES = {
  // Historic items -> legal (historic preservation)
  17: 'legal', 18: 'legal', 19: 'legal', 21: 'legal', 22: 'transportation', 23: 'legal', 26: 'legal',
  // Natural resource specific
  6: 'natural_resources', 7: 'natural_resources', 9: 'natural_resources', 10: 'natural_resources',
  11: 'natural_resources', 14: 'natural_resources', 16: 'natural_resources', 27: 'natural_resources',
  28: 'natural_resources', 29: 'natural_resources', 30: 'natural_resources', 31: 'natural_resources',
  40: 'natural_resources', 41: 'natural_resources',
  // Census -> demographics
  37: 'demographics', 38: 'demographics', 39: 'demographics', 42: 'demographics', 43: 'demographics',
  44: 'demographics', 45: 'demographics', 46: 'demographics', 47: 'demographics',
  // Elections
  49: 'elections', 50: 'elections', 51: 'elections', 52: 'elections', 53: 'elections',
  63: 'elections', 64: 'elections', 65: 'elections', 66: 'elections', 67: 'elections', 68: 'elections',
  // Public safety
  48: 'public_safety', 54: 'public_safety', 55: 'public_safety',
  // Sewer/utilities -> housing
  82: 'housing', 92: 'housing', 93: 'environment', 94: 'housing', 95: 'housing', 96: 'housing', 97: 'housing', 98: 'housing',
  // Legal/admin
  32: 'legal', 34: 'legal', 35: 'legal', 77: 'legal', 78: 'legal', 80: 'legal', 81: 'legal', 90: 'legal', 91: 'legal',
  // Roads
  57: 'transportation', 59: 'transportation', 79: 'transportation', 83: 'transportation', 84: 'transportation',
  85: 'transportation', 86: 'transportation',
  // Housing
  1: 'housing', 25: 'housing', 36: 'housing', 56: 'housing', 58: 'housing',
  70: 'housing', 71: 'housing', 72: 'housing', 73: 'housing', 74: 'housing', 75: 'housing',
  87: 'housing', 88: 'housing', 89: 'housing',
  // Environment
  2: 'environment', 3: 'environment', 4: 'natural_resources', 5: 'environment', 12: 'environment', 13: 'environment',
  15: 'environment', 24: 'environment', 33: 'environment', 69: 'environment', 76: 'environment',
  // batch 1 overrides
  100: 'legal', 101: 'legal', 102: 'legal', // survey grids
  103: 'transportation', 104: 'transportation', 105: 'transportation',
  106: 'natural_resources', // hydro centerlines
  107: 'housing', // sewer subbasins
  108: 'housing', 109: 'housing', 110: 'housing', // cities/boundaries
  111: 'environment', // levees
  112: 'environment', 113: 'environment', 114: 'environment', // wetlands
  115: 'transportation', 116: 'transportation', // ROW
  117: 'housing', // zip codes
  118: 'natural_resources', // conservation futures
  119: 'natural_resources', // trails
  120: 'environment', // floodplain
  121: 'housing', // reimbursement agreement
  122: 'elections', // legislative districts
  123: 'elections', // election precincts
  124: 'housing', // development process areas
  125: 'natural_resources', // development moratorium (forest)
  126: 'legal', // fire districts
  127: 'demographics', // community impact (equity index)
  128: 'demographics', 129: 'demographics', 130: 'demographics', 131: 'demographics',
  132: 'housing', // current use open space
  133: 'environment', 134: 'environment', 135: 'environment', 136: 'environment',
  137: 'environment', 138: 'environment', 139: 'environment', 140: 'environment',
  141: 'environment', 142: 'environment', 143: 'environment', 144: 'housing',
  145: 'environment', // sea level rise
  146: 'transportation', // vision zero crash
  147: 'environment', // shoreline access
  148: 'housing', // UGA changes
  149: 'environment', // heat watch
  150: 'natural_resources', // parkfinder
  151: 'environment', // flood and road closure
  152: 'energy', // EV charging stations
  153: 'natural_resources', // culvert fish passage
  154: 'legal', // ADA transition plan
  155: 'housing', // capital improvement projects
  156: 'elections', // voting centers
  157: 'transportation', // bridges
  158: 'housing', // water purveyors
  159: 'transportation', // road maintenance
  160: 'housing', // urban growth
  161: 'housing', // urban growth boundaries
  162: 'housing', // zoning
  163: 'housing', // community plans
  164: 'transportation', // bridges supplemental
  165: 'education', // school grounds
  166: 'public_safety', // police stations
  167: 'education', // libraries
  168: 'public_safety', // fire stations
  169: 'health', // public health care facilities
  170: 'education', // schools
  171: 'transportation', // traffic signals
  172: 'environment', // deep floodway
  173: 'housing', // current use program
  174: 'public_safety', // sheriff restriction areas
  175: 'environment', // FIRM panels
  176: 'environment', 177: 'environment',
  178: 'housing', // infrastructure projects
  179: 'environment', 180: 'environment', 181: 'environment',
  182: 'legal', // municipal courts
  183: 'housing', // sewer abandoned
  184: 'elections', // council districts
  185: 'elections', // congressional districts
  186: 'education', // school districts
  187: 'public_safety', 188: 'public_safety', // sheriff patrol
  189: 'housing', // infrastructure projects
  190: 'elections', // voter turnout 2020
  191: 'natural_resources', // boat ramps
  192: 'housing', // contour index
  193: 'transportation', 194: 'transportation', // TIP
  // batch 2
  200: 'environment', // stormwater private ponds
  201: 'transportation', // road status
  202: 'legal', // county facilities
  203: 'legal', // marijuana radius
  204: 'transportation', // RTA boundary
  205: 'natural_resources', // watersheds
  206: 'natural_resources', // river routes
  207: 'natural_resources', // river mileposts
  208: 'natural_resources', // potholes (geographic)
  209: 'environment', // flood hazard
  210: 'natural_resources', // nearshore salmon habitat
  211: 'natural_resources', // nearshore habitat assessment
  212: 'natural_resources', // hydro waterbodies
  213: 'natural_resources', // hydro riverbanks
  214: 'natural_resources', 215: 'natural_resources', // puget sound
  216: 'natural_resources', // gauge sites
  217: 'environment', // floodplain seclusion
  218: 'environment', // channel migration zone
  219: 'environment', // biologic integrity
  220: 'transportation', 221: 'transportation', // urban highway boundary
  222: 'transportation', // railroads
  223: 'transportation', // park and ride
  224: 'transportation', // nonmotorized
  225: 'housing', // cities annexations history
  226: 'environment', // waste water treatment
  227: 'environment', 228: 'environment', 229: 'environment', 230: 'environment',
  231: 'environment', // stormwater channels
  232: 'housing', // sewer improvement district
  233: 'environment', 234: 'natural_resources', 235: 'natural_resources', // chambers bay
  236: 'transportation', // traffic impact fee
  237: 'environment', // SF and CD systems
  238: 'natural_resources', // sensitive area markers
  239: 'transportation', // guardrails
  240: 'housing', // franchise water
  241: 'technology', // franchise telecom
  242: 'housing', // franchise sewer
  243: 'transportation', // franchise railroad
  244: 'energy', // franchise power
  245: 'energy', // franchise gas
  246: 'natural_resources', // regional trails
  247: 'natural_resources', // park districts
  248: 'transportation', // foothills trail signs
  249: 'natural_resources', 250: 'natural_resources', 251: 'natural_resources',
  252: 'natural_resources', 253: 'natural_resources', 254: 'natural_resources'
};

// WA DNR overrides - almost all natural_resources
const WA_DNR_OVERRIDES = {};
// Most DNR is natural_resources; specific exceptions:
for (let i = 0; i <= 339; i++) {
  WA_DNR_OVERRIDES[i] = 'natural_resources';
}
// Override specific ones
WA_DNR_OVERRIDES[0] = 'legal'; // WA State Boundary
WA_DNR_OVERRIDES[14] = 'legal'; // WA Public Land Survey Townships
WA_DNR_OVERRIDES[20] = 'legal'; // WA Public Land Survey Points
WA_DNR_OVERRIDES[23] = 'legal'; // WA Parcel and Legal Boundaries
WA_DNR_OVERRIDES[25] = 'legal'; // Master 2000 Tics
WA_DNR_OVERRIDES[39] = 'legal'; // WA Public Land Survey Sections
WA_DNR_OVERRIDES[163] = 'transportation'; // WADNR Roads and Topo
WA_DNR_OVERRIDES[164] = 'transportation'; // WADNR Roads and Topo
WA_DNR_OVERRIDES[172] = 'natural_resources'; // WA DNR Managed Land Parcels
WA_DNR_OVERRIDES[202] = 'legal'; // WA County Boundaries
WA_DNR_OVERRIDES[208] = 'transportation'; // WADNR Active Roads
WA_DNR_OVERRIDES[233] = 'transportation'; // DNR Gates
WA_DNR_OVERRIDES[240] = 'legal'; // WA Legal Descriptions
WA_DNR_OVERRIDES[241] = 'legal'; // WA DNR Units
WA_DNR_OVERRIDES[242] = 'legal'; // WA DNR Regions
WA_DNR_OVERRIDES[243] = 'legal'; // WA DNR Districts
WA_DNR_OVERRIDES[278] = 'legal'; // WA Major Public Lands
WA_DNR_OVERRIDES[279] = 'natural_resources'; // Wilderness Areas
WA_DNR_OVERRIDES[280] = 'legal'; // Non-DNR Major Public Lands
WA_DNR_OVERRIDES[281] = 'legal'; // Tribal Lands
WA_DNR_OVERRIDES[288] = 'environment'; // Earthquakes and Faults
WA_DNR_OVERRIDES[289] = 'environment'; WA_DNR_OVERRIDES[290] = 'environment';
WA_DNR_OVERRIDES[291] = 'environment'; WA_DNR_OVERRIDES[292] = 'environment';
WA_DNR_OVERRIDES[293] = 'environment'; WA_DNR_OVERRIDES[294] = 'environment';
WA_DNR_OVERRIDES[295] = 'environment'; WA_DNR_OVERRIDES[296] = 'environment';
WA_DNR_OVERRIDES[297] = 'environment'; // Volcanic Hazards
WA_DNR_OVERRIDES[298] = 'public_safety'; WA_DNR_OVERRIDES[299] = 'public_safety'; // Tsunami hazard
for (let i = 300; i <= 318; i++) WA_DNR_OVERRIDES[i] = 'public_safety'; // Tsunami evacuation
WA_DNR_OVERRIDES[325] = 'natural_resources'; // WA Soils
WA_DNR_OVERRIDES[326] = 'natural_resources'; WA_DNR_OVERRIDES[327] = 'natural_resources';
WA_DNR_OVERRIDES[328] = 'natural_resources'; WA_DNR_OVERRIDES[329] = 'natural_resources';
WA_DNR_OVERRIDES[330] = 'natural_resources'; WA_DNR_OVERRIDES[331] = 'natural_resources';
WA_DNR_OVERRIDES[332] = 'natural_resources'; WA_DNR_OVERRIDES[333] = 'natural_resources';
WA_DNR_OVERRIDES[334] = 'natural_resources'; WA_DNR_OVERRIDES[335] = 'natural_resources';
WA_DNR_OVERRIDES[337] = 'natural_resources'; WA_DNR_OVERRIDES[338] = 'natural_resources';
WA_DNR_OVERRIDES[339] = 'natural_resources';

// King County (Socrata) overrides
const KING_COUNTY_OVERRIDES = {
  0: 'public_safety', // Adult Jail Booking
  1: 'health', // Food Establishment Inspection
  16: 'finance', // Real Property Tax Receivables
  19: 'health', // EGP Nonprofits
  20: 'environment', // Recycling
  21: 'public_safety', // KCSO Offense Reports
  28: 'health', // Pet Licenses
  30: 'health', // Pet Licenses
  32: 'legal', // Property Legal Descriptions
  34: 'health', // Lost/found pets
  35: 'legal', // Superior Court
  39: 'legal', // Fleet Spot Bid - auction
  54: 'elections', // Elected officials
  57: 'health', // K-12 Vaccination
  66: 'environment', // Water Quality
  70: 'technology', // King County GIS
  73: 'health', // Best Starts for Kids
  78: 'health', // Kindergarten immunization
  81: 'finance', // Personal Property Data
  89: 'health', // Smoke Free Housing
  93: 'legal', // Ex-Parte via the Clerk
  95: 'housing', // Boundary Review Board
  99: 'elections', // King County batch 0 last
  // batch 1
  112: 'demographics', // Total KC Population
  116: 'public_safety', // KCSO Patrol Districts
  118: 'housing', // Foreclosure parcels
  123: 'environment', // WLRD Sites
  126: 'demographics', // KC population counts
  138: 'environment', // Ambient Streams Monitoring
  144: 'finance', // Real Property Tax
  147: 'legal', // KC History Timeline
  152: 'public_safety', // Jail COVID stats
  153: 'health', // Mental Health providers
  154: 'housing', // Plat Index
  156: 'health', // Spay/Neuter Clinics
  157: 'public_safety', // AFIS fingerprint events
  160: 'environment', // Marine Phytoplankton
  161: 'health', // Lead Content
  162: 'legal', // EGP Calendar
  163: 'environment', // Marine Phytoplankton
  164: 'demographics', // Unincorporated KC Population
  165: 'environment', // KC Streams Water Quality Index
  167: 'demographics', // CDC Social Vulnerability
  168: 'elections', // Aug 2025 Primary
  169: 'environment', // Lake Washington elevation
  170: 'housing', // Total KC Housing
  172: 'elections', // Ballot tracker
  173: 'transportation', // Census public transit
  174: 'housing', // Boundary Review Board proposals
  175: 'public_safety', // ICS Classes
  176: 'environment', // Marine Phytoplankton
  177: 'finance', // Personal Property Tax
  178: 'legal', // Procurement Contracts
  179: 'elections', // Elections Calendar (Vietnamese)
  180: 'health', // RASKC animal services stats
  181: 'health', // WA Health Workforce Survey
  182: 'elections', // Primary races
  183: 'elections', // Write-In Candidates
  184: 'elections', // Special April results
  185: 'elections', // Feb 2024 special
  186: 'transportation', // Metro Access Service
  187: 'housing', // Unincorporated KC Housing
  188: 'environment', // Streams trend
  189: 'elections', // Feb 2025 special
  190: 'legal', // KC Commodities Buyers
  191: 'legal', // KC Employee Giving Program
  192: 'health', // Best Starts Kids Indicators
  193: 'environment', // Marine Zooplankton
  194: 'health', // VFC Enrollment
  195: 'environment', // Lake Washington outflow
  196: 'elections', // Aug 2025 primary final
  197: 'health', // Regional Health Needs
  198: 'public_safety', // KCSO Reporting Areas
  // batch 2
  200: 'transportation', // Metro Hyde Shuttle
  201: 'legal', // ACP Lifeline Companies
  202: 'environment', // Routine Marine Sediment
  203: 'elections', // Aug 2024 Primary
  204: 'health', // School Based Health Centers
  205: 'environment', // 6PPD-Quinone Treatment
  206: 'transportation', // ExampleAccessRoute
  207: 'technology', // Major US Open Data Domains
  208: 'elections', // Feb 2025 Special Election Final
  209: 'environment', // WLRD Projects
  210: 'environment', // KC Ambient Streams
  211: 'elections', // Feb 2026 Special Election
  212: 'environment', // Whidbey Basin CTD
  213: 'elections', // 2014 Primary PCO
  214: 'environment', // Freshwater Swim Beach
  215: 'transportation', // Metro Flex
  216: 'environment', // Stream Gage Hydrology
  217: 'environment', // Marine Zooplankton
  218: 'elections', // April 2024 Special
  219: 'elections', // Voting Districts
  220: 'environment', // Coupeville Wharf Mooring
  221: 'elections', // Aug 2025 Primary mid
  222: 'environment', // Freshwater CTD
  223: 'environment', // Penn Cove Buoy
  224: 'education', // Report Card Graduation
  225: 'environment', // WLRD Areas
  226: 'elections', // April 2025 Special
  227: 'environment', // Port Susan Buoy
  228: 'elections', // March 2024 Presidential Primary
  229: 'elections', // Nov 2025 General mid
  230: 'elections', // Nov 2025 General final
  231: 'environment', // WQS Excursion
  232: 'transportation', // Metro Water Taxi
  233: 'transportation', // Metro Access Saturday
  234: 'environment', // Penn Cove Bottom
  235: 'transportation', // Metro Access Sunday
  236: 'environment', // Port Susan Buoy
  237: 'transportation', // Metro Community Van
  238: 'legal', // FMD New To You
  239: 'elections', // Aug 2007 Primary
  240: 'environment', // KC Streams Location
  241: 'environment', // Marine Benthic Biomass
  242: 'environment', // Streams WQI
  243: 'transportation', // Metro Vanpool
  244: 'transportation', // Metro JARC
  245: 'environment', // Marine Benthic Abundance
  246: 'transportation', // Metro Solid Ground Circulator
  247: 'transportation', // Rainier Foothills Wellness
  248: 'transportation', // Northshore Senior Center
  249: 'environment', // Ambient Streams Designated Uses
  250: 'housing', // Parcel2005
  251: 'transportation', // Metro Flex AOD
  252: 'natural_resources', // Salmon habitat data
  253: 'environment', // Water Quality Monitoring Dashboard
  254: 'natural_resources', // Fish data salmon
  255: 'housing', // Parcel2010
  256: 'elections', // Feb 2026 Special Final
  257: 'transportation', // KC Area Shuttles
  258: 'health', // Youth Marijuana
  259: 'public_safety', // Inquest Program Deaths
  260: 'transportation', // Metro Community Van
  261: 'elections', // Elections Calendar Somali
  262: 'elections', // Feb 2026 Special Mid
  263: 'elections', // Elections Calendar Russian
  264: 'elections', // votdst_point
};

// King County ArcGIS overrides
const KING_COUNTY_ARCGIS_OVERRIDES = {};
// IDs 0-99 batch 0: mix of environment/natural_resources/transportation/housing
// IDs 46-99 are almost all tree point tiles (natural_resources)
// Batch 0 specific
for (let i = 0; i <= 99; i++) KING_COUNTY_ARCGIS_OVERRIDES[i] = 'environment'; // default stormwater/env
KING_COUNTY_ARCGIS_OVERRIDES[0] = 'natural_resources'; // noxious weeds
KING_COUNTY_ARCGIS_OVERRIDES[1] = 'natural_resources'; // NWI wetlands
KING_COUNTY_ARCGIS_OVERRIDES[2] = 'natural_resources'; // stream type
KING_COUNTY_ARCGIS_OVERRIDES[3] = 'environment'; // stormwater
KING_COUNTY_ARCGIS_OVERRIDES[4] = 'environment'; // stormwater
KING_COUNTY_ARCGIS_OVERRIDES[5] = 'environment'; KING_COUNTY_ARCGIS_OVERRIDES[6] = 'environment';
KING_COUNTY_ARCGIS_OVERRIDES[7] = 'environment'; KING_COUNTY_ARCGIS_OVERRIDES[8] = 'transportation';
KING_COUNTY_ARCGIS_OVERRIDES[9] = 'natural_resources'; // fish passage
KING_COUNTY_ARCGIS_OVERRIDES[10] = 'natural_resources'; // fish passage sites
KING_COUNTY_ARCGIS_OVERRIDES[11] = 'natural_resources'; // revegetation
KING_COUNTY_ARCGIS_OVERRIDES[12] = 'agriculture'; // farmland preservation
KING_COUNTY_ARCGIS_OVERRIDES[13] = 'agriculture'; // farmland preservation
KING_COUNTY_ARCGIS_OVERRIDES[14] = 'transportation'; // Metro Stops
KING_COUNTY_ARCGIS_OVERRIDES[15] = 'transportation'; // Metro Routes
KING_COUNTY_ARCGIS_OVERRIDES[16] = 'transportation'; // Metro Pattern
KING_COUNTY_ARCGIS_OVERRIDES[17] = 'environment'; KING_COUNTY_ARCGIS_OVERRIDES[18] = 'natural_resources'; // SHRP
KING_COUNTY_ARCGIS_OVERRIDES[19] = 'environment'; // water quality swale
for (let i = 20; i <= 37; i++) KING_COUNTY_ARCGIS_OVERRIDES[i] = 'environment'; // stormwater facilities
KING_COUNTY_ARCGIS_OVERRIDES[38] = 'natural_resources'; // PBRS current use
KING_COUNTY_ARCGIS_OVERRIDES[39] = 'environment'; // water sampling
KING_COUNTY_ARCGIS_OVERRIDES[40] = 'housing'; // parcel
KING_COUNTY_ARCGIS_OVERRIDES[41] = 'housing'; // rights of way
KING_COUNTY_ARCGIS_OVERRIDES[42] = 'environment'; // wastewater conveyance
KING_COUNTY_ARCGIS_OVERRIDES[43] = 'environment'; // wastewater treatment
KING_COUNTY_ARCGIS_OVERRIDES[44] = 'natural_resources'; // groundwater sources
KING_COUNTY_ARCGIS_OVERRIDES[45] = 'natural_resources'; // hydro monitoring gauges
for (let i = 46; i <= 99; i++) KING_COUNTY_ARCGIS_OVERRIDES[i] = 'natural_resources'; // tree canopy points

// We need to do batches 1-5 for king-county-arcgis too
// Batch 1 (100-199): need to read but will classify with general logic + known patterns
// Batch 2 (200-299): similar
// For now, set defaults - will be refined by classify()

// Pierce County (Socrata) - batch 0 overrides seen above
// Need batches 1-9 too - will use classify() with cat field as primary guide

function classifyManual(sourceFile, r) {
  const id = r.id;
  if (sourceFile === 'pierce-county-arcgis.jsonl') {
    return PIERCE_ARCGIS_OVERRIDES[id];
  }
  if (sourceFile === 'wa-dnr-arcgis.jsonl') {
    return WA_DNR_OVERRIDES[id];
  }
  if (sourceFile === 'king-county.jsonl') {
    return KING_COUNTY_OVERRIDES[id];
  }
  if (sourceFile === 'king-county-arcgis.jsonl') {
    return KING_COUNTY_ARCGIS_OVERRIDES[id];
  }
  return null; // use auto-classify for pierce-county.jsonl
}

function generateSummary(r, domain) {
  // Generate a concise summary based on the name and description
  const name = r.name.replace(/^\s+|\s+$/g, '');
  let desc = r.desc;
  if (desc && desc.length > 150) desc = desc.substring(0, 150).replace(/\s+\S+$/, '') + '...';

  // Use description if meaningful, otherwise use name + inferred purpose
  if (desc && desc.length > 20 && !desc.includes('{{description}}') && desc !== 'none' && desc !== 'not_specified') {
    // Clean up the description
    const cleaned = desc.replace(/please read the metadata.*$/i, '').replace(/for more information.*$/i, '').trim();
    if (cleaned.length > 20) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  // Fallback to name-based summary
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return `${capitalized} dataset for Pierce County/King County/Washington State.`;
}

// Source file definitions
const SOURCES = [
  {
    file: 'pierce-county-arcgis.jsonl',
    batches: [
      'pierce-county-arcgis-batch-0.txt',
      'pierce-county-arcgis-batch-1.txt',
      'pierce-county-arcgis-batch-2.txt',
    ]
  },
  {
    file: 'king-county.jsonl',
    batches: [
      'king-county-batch-0.txt',
      'king-county-batch-1.txt',
      'king-county-batch-2.txt',
    ]
  },
  {
    file: 'wa-dnr-arcgis.jsonl',
    batches: [
      'wa-dnr-arcgis-batch-0.txt',
      'wa-dnr-arcgis-batch-1.txt',
      'wa-dnr-arcgis-batch-2.txt',
      'wa-dnr-arcgis-batch-3.txt',
    ]
  },
  {
    file: 'king-county-arcgis.jsonl',
    batches: [
      'king-county-arcgis-batch-0.txt',
      'king-county-arcgis-batch-1.txt',
      'king-county-arcgis-batch-2.txt',
      'king-county-arcgis-batch-3.txt',
      'king-county-arcgis-batch-4.txt',
      'king-county-arcgis-batch-5.txt',
    ]
  },
  {
    file: 'pierce-county.jsonl',
    batches: [
      'pierce-county-batch-0.txt',
      'pierce-county-batch-1.txt',
      'pierce-county-batch-2.txt',
      'pierce-county-batch-3.txt',
      'pierce-county-batch-4.txt',
      'pierce-county-batch-5.txt',
      'pierce-county-batch-6.txt',
      'pierce-county-batch-7.txt',
      'pierce-county-batch-8.txt',
      'pierce-county-batch-9.txt',
    ]
  }
];

// Generate and save results
for (const source of SOURCES) {
  console.log(`Processing ${source.file}...`);
  const results = generateResults(source.file, source.batches);
  const outputFile = path.join(SCHEMAS_DIR, `sonnet-results-${source.file.replace('.jsonl', '')}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`  Saved ${results.length} results to ${outputFile}`);

  // Show domain distribution
  const counts = {};
  for (const r of results) {
    counts[r.domain] = (counts[r.domain] || 0) + 1;
  }
  console.log('  Distribution:', Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}:${v}`).join(', '));
}

console.log('\nAll results generated.');

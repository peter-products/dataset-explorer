const fs = require('fs');

// Sonnet domain results by ID (extracted from agent responses)
const sonnet = {0:"finance",1:"education",2:"health",3:"education",4:"labor",5:"environment",6:"technology",7:"environment",8:"finance",9:"finance",10:"finance",11:"finance",12:"finance",13:"finance",14:"finance",15:"finance",16:"finance",17:"finance",18:"agriculture",19:"finance",20:"health",21:"education",22:"legal",23:"labor",24:"labor",25:"education",26:"education",27:"finance",28:"education",29:"education",30:"finance",31:"finance",32:"finance",33:"finance",34:"education",35:"finance",36:"education",37:"demographics",38:"education",39:"education",40:"education",41:"education",42:"education",43:"health",44:"health",45:"demographics",46:"finance",47:"education",48:"education",49:"education",50:"finance",51:"education",52:"finance",53:"labor",54:"energy",55:"finance",56:"finance",57:"labor",58:"health",59:"demographics",60:"health",61:"transportation",62:"labor",63:"education",64:"education",65:"labor",66:"labor",67:"labor",68:"labor",69:"labor",70:"labor",71:"labor",72:"finance",73:"finance",74:"demographics",75:"finance",76:"public_safety",77:"finance",78:"finance",79:"agriculture",80:"agriculture",81:"natural_resources",82:"transportation",83:"transportation",84:"transportation",85:"environment",86:"finance",87:"finance",88:"labor",89:"technology",90:"finance",91:"environment",92:"labor",93:"labor",94:"education",95:"demographics",96:"public_safety",97:"health",98:"education",99:"housing",100:"finance",101:"finance",102:"finance",103:"finance",104:"finance",105:"finance",106:"finance",107:"finance",108:"finance",109:"finance",110:"finance",111:"finance",112:"finance",113:"finance",114:"finance",115:"finance",116:"finance",117:"finance",118:"finance",119:"finance",120:"finance",121:"finance",122:"finance",123:"finance",124:"finance",125:"finance",126:"finance",127:"finance",128:"finance",129:"finance",130:"finance",131:"finance",132:"finance",133:"finance",134:"finance",135:"finance",136:"finance",137:"finance",138:"finance",139:"finance",140:"finance",141:"finance",142:"finance",143:"finance",144:"finance",145:"finance",146:"finance",147:"finance",148:"finance",149:"finance",150:"legal",151:"finance",152:"legal",153:"natural_resources",154:"natural_resources",155:"demographics",156:"health",157:"labor",158:"health",159:"natural_resources",160:"natural_resources",161:"labor",162:"transportation",163:"transportation",164:"transportation",165:"environment",166:"natural_resources",167:"energy",168:"environment",169:"education",170:"transportation",171:"natural_resources",172:"environment",173:"environment",174:"environment",175:"natural_resources",176:"health",177:"natural_resources",178:"legal",179:"legal",180:"agriculture",181:"environment",182:"legal",183:"finance",184:"finance",185:"education",186:"environment",187:"natural_resources",188:"natural_resources",189:"demographics",190:"labor",191:"natural_resources",192:"finance",193:"labor",194:"finance",195:"labor",196:"finance",197:"finance",198:"natural_resources",199:"housing",200:"technology",201:"finance",202:"demographics",203:"elections",204:"demographics",205:"labor",206:"labor",207:"health",208:"housing",209:"environment",210:"technology",211:"public_safety",212:"housing",213:"health",214:"education",215:"demographics",216:"environment",217:"labor",218:"transportation",219:"demographics",220:"labor",221:"transportation",222:"housing",223:"environment",224:"housing",225:"environment",226:"housing",227:"environment",228:"finance",229:"education",230:"agriculture",231:"education",232:"health",233:"transportation",234:"transportation",235:"finance",236:"housing",237:"agriculture",238:"housing",239:"health",240:"housing",241:"energy",242:"labor",243:"demographics",244:"education",245:"public_safety",246:"public_safety",247:"legal",248:"demographics",249:"transportation",250:"health",251:"finance",252:"environment",253:"finance",254:"finance",255:"legal",256:"agriculture",257:"health",258:"health",259:"finance",260:"finance",261:"legal",262:"environment",263:"natural_resources",264:"agriculture",265:"health",266:"agriculture",267:"legal",268:"education",269:"legal",270:"agriculture",271:"environment",272:"education",273:"education",274:"legal",275:"legal",276:"environment",277:"legal",278:"education",279:"agriculture",280:"education",281:"legal",282:"environment",283:"legal",284:"legal",285:"environment",286:"health",287:"legal",288:"education",289:"legal",290:"legal",291:"legal",292:"legal",293:"legal",294:"legal",295:"finance",296:"legal",297:"legal",298:"legal",299:"legal",300:"health",301:"health",302:"health",303:"health",304:"environment",305:"health",306:"health",307:"health",308:"health",309:"health",310:"health",311:"health",312:"health",313:"health",314:"health",315:"health",316:"health",317:"finance",318:"health",319:"health",320:"health",321:"public_safety",322:"health",323:"health",324:"health",325:"health",326:"health",327:"health",328:"health",329:"health",330:"health",331:"health",332:"health",333:"health",334:"health",335:"finance",336:"health",337:"health",338:"finance",339:"health",340:"health",341:"health",342:"health",343:"health",344:"finance",345:"health",346:"health",347:"finance",348:"finance",349:"environment",350:"transportation",351:"legal",352:"finance",353:"finance",354:"environment",355:"legal",356:"finance",357:"health",358:"finance",359:"finance",360:"finance",361:"finance",362:"transportation",363:"demographics",364:"demographics",365:"environment",366:"legal",367:"legal",368:"public_safety",369:"finance",370:"energy",371:"housing",372:"finance",373:"legal",374:"finance",375:"legal",376:"education",377:"finance",378:"technology",379:"legal",380:"demographics",381:"finance",382:"demographics",383:"finance",384:"labor",385:"legal",386:"housing",387:"legal",388:"demographics",389:"legal",390:"labor",391:"labor",392:"labor",393:"legal",394:"finance",395:"environment",396:"legal",397:"environment",398:"environment",399:"environment",400:"transportation",401:"housing",402:"housing",403:"housing",404:"housing",405:"environment",406:"education",407:"transportation",408:"labor",409:"finance",410:"transportation",411:"environment",412:"transportation",413:"environment",414:"housing",415:"finance",416:"public_safety",417:"health",418:"environment",419:"legal",420:"technology",421:"housing",422:"finance",423:"housing",424:"education",425:"finance",426:"housing",427:"public_safety",428:"transportation",429:"housing",430:"housing",431:"health",432:"transportation",433:"education",434:"environment",435:"legal",436:"housing",437:"transportation",438:"transportation",439:"education",440:"legal",441:"transportation",442:"demographics",443:"finance",444:"transportation",445:"public_safety",446:"demographics",447:"education",448:"elections",449:"demographics",450:"finance",451:"finance",452:"finance",453:"health",454:"agriculture",455:"agriculture",456:"health",457:"health",458:"health",459:"health",460:"health",461:"health",462:"education",463:"education",464:"public_safety",465:"labor",466:"technology",467:"environment",468:"environment",469:"energy",470:"labor",471:"labor",472:"finance",473:"labor",474:"finance",475:"finance",476:"demographics",477:"demographics",478:"finance",479:"demographics",480:"environment",481:"public_safety",482:"environment",483:"finance",484:"energy",485:"environment",486:"natural_resources",487:"natural_resources",488:"natural_resources",489:"natural_resources",490:"natural_resources",491:"public_safety",492:"legal",493:"legal",494:"legal",495:"legal",496:"finance",497:"technology",498:"finance",499:"finance"};

const gemma = JSON.parse(fs.readFileSync('ab-test-haiku-vs-gemma.json', 'utf8')).results;

let total = 0, sg = 0, v1g = 0, sv1 = 0, allThree = 0;
const perSrc = {};
const disagSG = {};

for (let i = 0; i < gemma.length; i++) {
  const g = gemma[i];
  const sDom = sonnet[i] || null;
  if (!sDom) continue;
  total++;

  const src = g.source;
  if (!perSrc[src]) perSrc[src] = {t:0, sg:0, v1g:0};
  perSrc[src].t++;

  const gDom = g.gemma_domain || null;
  const v1Dom = g.haiku_domain || null;

  if (sDom === gDom) { sg++; perSrc[src].sg++; }
  if (v1Dom === gDom) { v1g++; perSrc[src].v1g++; }
  if (sDom === v1Dom) sv1++;
  if (sDom === gDom && sDom === v1Dom) allThree++;

  if (sDom !== gDom && gDom) {
    const k = sDom + ' -> ' + gDom;
    disagSG[k] = (disagSG[k] || 0) + 1;
  }
}

console.log('='.repeat(65));
console.log('  SONNET vs GEMMA vs V1 (HEURISTIC) COMPARISON');
console.log('='.repeat(65));
console.log('  Total records:', total);
console.log('  All three agree:', allThree, '(' + (allThree/total*100).toFixed(1) + '%)');
console.log('  Sonnet == Gemma:', sg, '(' + (sg/total*100).toFixed(1) + '%)');
console.log('  v1 == Gemma:', v1g, '(' + (v1g/total*100).toFixed(1) + '%)');
console.log('  Sonnet == v1:', sv1, '(' + (sv1/total*100).toFixed(1) + '%)');
console.log();
console.log('  Per-source (Sonnet vs Gemma agreement):');
for (const [s, d] of Object.entries(perSrc)) {
  console.log('    ' + s.padEnd(30) + ' S-G: ' + (d.sg/d.t*100).toFixed(0) + '%  v1-G: ' + (d.v1g/d.t*100).toFixed(0) + '%');
}
console.log();
console.log('  Top Sonnet-Gemma disagreements:');
Object.entries(disagSG).sort((a,b) => b[1]-a[1]).slice(0, 12).forEach(([k,v]) => console.log('    ' + k.padEnd(40) + v + 'x'));

console.log();
console.log('  === Sample disagreements ===');
let shown = 0;
for (let i = 0; i < gemma.length && shown < 15; i++) {
  const g = gemma[i];
  const sDom = sonnet[i];
  if (!sDom || !g.gemma_domain || sDom === g.gemma_domain) continue;
  console.log('  [' + i + '] ' + g.name.slice(0,50).padEnd(50) + ' S=' + sDom.padEnd(16) + ' G=' + (g.gemma_domain||'null'));
  shown++;
}

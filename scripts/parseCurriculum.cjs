const fs = require('fs');
const path = require('path');

// Raw text from Education Ministry 3,000 Curriculum Word List provided by user
const rawText = `
A
 a* (an)
 abandon
 able** (disabled)
 aboard
 abort (abortion)
 abound (abundant)
 about*
 above*
 abroad
 absent
 absolute**
 absorb
 abstract
 absurd
 abuse
 academy
 accelerate
 accent**
 accept**
 access**
 accident**
 accommodate
 accompany
 accomplish
 accord
 account**
 accumulate
 accurate
 accuse**
 ache (headache)
 achieve**
 acid
 acknowledge
 acquire
 acquisition
 across*
 act* (actual, interact)
 adapt**
 add*
 addict
 address*
 adequate
 adjust
 administer
 (administration)
 admire**
 admit** (admission)
 adolescent
 adopt**
 adult*
 advance**
 advantage** (disadvantage)
 adventure**
 adverse
 advertize** / advertise**
 advice**
 advise**
 advocate
 aesthetic
 affair**
 affect** (affection)
 afford**
 afraid*
 after*
 afternoon*
 again*
 against*
 age*
 agency
 agenda
 agent**
 aggress (aggressive)
 ago*
 agree* (disagree)
 agriculture
 ahead*
 aid**
 aim**
 air*
 airline**
 airplane* / aeroplane*
 airport**
 alarm**
 album*
 alcohol**
 alert
 alien
 alike
 alive**
 all*
 allocate
 allow**
 ally
 almost*
 alone*
 along*
 alongside
 aloud**
 already*
 alright*
 also*
 alter**
 alternate (alternative)
 although**
 altogether**
 always*
 amaze**
 ambassador
 ambition (ambitious)
 ambulance**
 among**
 amount**
 amuse**
 analysis**
 analyze / analyse
 anchor
 ancient
 and*
 angel**
 anger**
 angle
 animal*
 anniversary
 announce**
 annoy**
 annual**
 another*
 answer*
 ant**
 anticipate
 anxiety
 anxious**
 any*
 apart**
 apartment*
 apology
 apparent
 appeal**
 appear** (disappear)
 apple*
 apply** (applicant)
 appoint**
 appreciate**
 approach**
 appropriate**
 approve
 approximate
 architect (architecture)
 area*
 argue**
 arise
 arm*
 army**
 around*
 arrange**
 arrest**
 arrive*
 arrow
 art*
 article**
 artifice (artificial)
 as*
 aside**
 ask*
 asleep**
 aspect
 aspire
 assault
 assemble
 assert
 assess**
 asset
 assign** (assignment)
 assist** (assistant)
 associate**
 assume**
 assure
 astonish
 at*
 athlete
 atmosphere**
 atom
 attach**
 attack**
 attempt**
 attend**
 attention**
 attitude**
 attract**
 attribute
 auction
 audience**
 aunt*
 authentic
 author
 automatic**
 autumn*
 avail (available)
 average**
 avoid**
 await
 awake**
 award**
 aware** (unaware)
 away*
 awe (awful)
 awkward**
 
B
 baby*
 back*
 background**
 bacon**
 bad*
 badminton*
 bag*
 bake*
 balance**
 ball*
 balloon**
 ban
 banana*
 band**
 bang**
 bank*
 bankrupt
 bar**
 bare**
 bargain
 bark**
 barrier
 base*
 baseball*
 basis**
 basket*
 basketball*
 bat*
 bath*
 battery**
 battle**
 bay**
 be*
 beach*
 beam
 bean**
 bear*
 beard
 beast
 beat**
 beauty*
 because*
 become*
 bed*
 bee* 
 beef*
 beer**
 before*
 beg**
 begin*
 behalf
 behave (behavior /
 behaviour)
 behind*
 belief**
 believe*
 bell*
 belong**
 below*
 belt*
 bench**
 bend**
 beneath**
 benefit**
 beside*
 bet**
 betray
 between*
 beyond**
 bias
 big*
 bike*
 bill*
 billion**
 bin**
 bind**
 biography
 biology
 bird*
 birth*
 biscuit*
 bit**
 bite**
 bitter**
 black*
 blame**
 blank**
 blanket**
 blast
 blend
 bless**
 blind**
 blink
 block**
 blonde**
 blood*
 bloom**
 blossom
 blow**
 blue*
 board*
 boat*
 body* (embody)
 boil**
 bold
 bomb**
 bond**
 bone*
 book*
 boom**
 boost
 boot**
 border
 bore**
 borrow*
 boss**
 both*
 bother**
 bottle*
 bottom*
 bounce**
 boundary
 bow**
 bowl**
 box*
 boy*
 brain**
 brake**
 branch**
 brand**
 brave*
 bread*
 break*
 breakfast*
 breast**
 breath**
 breathe**
 breed
 breeze
 brick**
 bridge*
 brief**
 bright*
 brilliant**
 bring*
 broad**
 broadcast
 brother*
 brown*
 brush*
 brute (brutal)
 bubble**
 budget**
 bug** 
 build*
 bulk
 bull
 bully
 bump**
 bunch**
 bundle
 burden
 burn*
 burst**
 bury**
 bus*
 bush**
 business*
 busy*
 but*
 butcher
 butter*
 button*
 buy*
 buzz
 by*

C
 cable**
 cage**
 cake*
 calculate** (calculator)
 calendar**
 call*
 calm**
 camera*
 camp*
 campaign* 
 can*
 cancel
 cancer
 candidate
 candy*
 canvas
 cap*
 capable**
 cape**
 capital**
 captain**
 capture
 car*
 card*
 care*
 career**
 carpet**
 carrot* 
 carry*
 cart**
 carve
 case* (casual)
 cash*
 cast**
 castle**
 cat*
 catalogue** / catalog**
 catch*
 category**
 cater
 cattle
 cause** (causal)
 caution
 cave
 cease
 ceiling**
 celebrate
 celebrity
 cell**
 censor
 center*
 century**
 certain*
 certificate
 chain**
 chair*
 chairman**
 challenge**
 chamber
 champion**
 chance*
 change*
 channel**
 chaos
 character**
 characteristic**
 charge** (discharge)
 charity
 charm**
 chart**
 chase**
 chat**
 cheap*
 check* / cheque*
 cheek**
 cheer**
 cheese*
 chef
 chemical
 chest**
 chew**
 chicken*
 chief**
 child*
 chill
 chin
 chip**
 chocolate*
 choice**
 choir
 choose*
 chop**
 chorus
 chronic
 church*
 cigarette**
 cinema**
 circle*
 circulate
 circumstance**
 cite
 citizen**
 city*
 civil**
 claim**
 clap
 clash
 class* (classic, classify)
 clause
 clay
 clean*
 clear* (clarify)
 clerk**
 clever*
 click**
 client**
 cliff**
 climate**
 climb*
 cling
 clinic
 clip**
 clock*
 close* (disclose, enclose)
 clothes*
 cloud*
 club*
 clue**
 cluster
 coach**
 coal**
 coast**
 coat*
 code**
 coffee*
 coin**
 coincide
 cold*
 collaborate
 collapse
 collar
 colleague
 collect*
 college*
 colony
 color* / colour*
 column
 combat
 combine**
 come*
 comedy**
 comfort** (comfortable)
 comic*
 command**
 comment**
 commerce**
 commit (commission)
 committee**
 commodity
 common**
 communicate**  
(communication)
 communist
 community**
 companion
 company*
 compare**
 compatible
 compel
 compensate
 compete (competent)
 compile
 complain**
 complement
 complete**
 complex** (complexity)
 complicate**
 component
 compose
 compound
 comprehend 
(comprehensive)
 comprise
 compromise
 compute* (computer)
 conceal
 conceive
 concentrate**
 concept**
 concern**
 concert**
 conclude
 concrete
 condemn
 condition*
 conduct
 confer
 confess
 confide (confident)
 confine
 confirm**
 conflict**
 conform
 confront
 confuse**
 congratulate*
 congress
 connect**
 conscience
 conscious**
 consent
 conserve
 consider**
 consist (consistent)
 constant**
 constitute (constitution)
 constrain
 construct (construction)
 consult
 consume** (consumer,
 consumption)
 contact**
 contain**
 contemporary
 contend
 content**
 contest**
 context**
 continent
 continue**
 contract**
 contradict
 contrary
 contrast
 contribute**
 control*
 controversy
 convene (convenient, 
 convention)
 converse** (conversation)
 convert
 convey
 convict
 convince**
 cook*
 cookie* / cooky*
 cool*
 cooperate
 coordinate
 cop**
 cope**
 copy**
 copyright
 cord
 core
 corn
 corner*
 corporate (corporation)
 correct**
 correspond
 corridor
 corrupt
 cost*
 costume
 cottage**
 cotton**
 cough**
 could*
 council**
 counsel
 count** (discount,
 counter)
 counterpart
 country*
 countryside**
 county**
 couple*
 coupon
 courage (discourage,      
  encourage)
 course*
 court*
 cousin*
 cover* (discover)
 cow* 
 crack**
 craft
 crash**
 crawl**
 crayon*
 craze (crazy)
 cream*
 create** (creature)
 credible (incredible)
 credit**
 creep
 crew
 crime** (criminal)
 crisis**
 crisp**
 criterion
 critic (criticize / criticise,
 criticism)
 crop
 cross*
 crowd**
 crown**
 crucial
 cruel**
 cruise
 crush
 cry*
 crystal
 cultivate
 culture*
 cup*
 cure**
 curious** (curiosity)
 curl**
 currency
 current**
 curriculum
 curry
 curse
 curtain*
 curve
 custody
 custom
 customer*
 cut*
 cute**
 cycle**(recycle, cyclist)
 cynical

D
 dairy
 damage**
 damp
 dance*
 danger*
 dare**
 dark*
 darling**
 dash
 database
 date*
 datum (data)
 daughter*
 dawn**
 day*
 dead*
 deal**
 death*
 debate**
 debt**
 decade
 decay
 decent
 decide* (decision)
 deck**
 declare, decline (declension), decorate**, decrease, dedicate, deep*, defeat, defend (defendant), defense** / defence**, deficiency, deficit, define**, definite**, degree**, delay**, delegate, delete, deliberate, delicate, delicious*, delight**, deliver**, demand**, democracy, democrat, demon, demonstrate**, dense, dentist**, deny**, depart (department, departure), depend** (dependence, independent), depict, deposit, depress**, deprive, derive, descend, describe** (description), desert**, deserve**, design*, designate, desire**, desk*, despair, desperate**, despite**, destine (destination), destiny, destroy**, destruct (destruction), detach, detail**, detect**, determine**, develop**, device, devil, devise, devote, diabetes, dialogue* / dialog*, diary**, dictate, dictionary**, die*, diet**, differ (different), difficult*, dig**, dignity, dimension, diminish, dine, dinner*, dip, diplomat, direct**, dirt** (dirty), disappoint**, disaster, disc** (disk), discipline**, discourse, discriminate, discuss*, disgust**, dish**, dismiss, display**, dispute, disrupt, distance**, distinct, distinguish, distort, distract, distribute, district**, disturb**, dive**, diverse, divide**, divine, divorce**, do*, doctor*, document**, dog*, doll*, dolphin**, domain, domestic**, dominate (dominant), donate**, door*, dose, dot, double*, doubt**, doughnut*, down*, dozen**, draft, drag**, drain, drama**, draw* (drawer), dread, dream*, dress*, drill, drink*, drive*, drop*, drown, drug**, drum*, dry*, dual, duck*, due**, dull, dump**, during*, dust**, duty**, dwell, dynamic

E
 each**, eager, ear*, early*, earn**, earth*, ease** (disease, easy), east*, eat*, economy**, edge**, edit**, educate**, effect** (effective), efficient, effort**, egg*, eight*, either**, elaborate, elect**, electric**, electronic, elegant, element** (elementary), elephant*, elevate (elevator), eleven*, eliminate, elite, else**, embarrass**, embassy, embrace, emerge (emergence), emergency, emit (emission), emotion**, emphasis, emphasize**, empire**, employ**, empty**, encounter, end*, endure, enemy**, energy*, engage**, engine**, engineer**, enhance, enormous**, enough*, enter*, enterprise, entertain**, enthusiastic, entire**, entry, envelope**, environ (environment), envy, equal**, equip (equipment), era, erase (eraser), erect, err (error), escape**, especial** (especially), essay**, essence (essential), establish**, estate, estimate**, ethic (ethical), ethnic, evacuate, evaluate, even**, evening*, event** (eventually), ever**, every*, evidence**, evil**, evitable (inevitable), evolution, evolve, exact**, exaggerate, examine** (examination / exam), example*, exceed, excel (excellent), except**, excess, exchange**, excite**, exclude (exclusive), excuse**, executive, exercise*, exhaust**, exhibit, exist**, exit**, exotic, expand**, expect**, expense** (expensive), experience**, experiment**, expert**, expertise, explain**, explicit, explode, explore, export, expose**, express**, extend**, extent, external, extinct, extra**, extract, extraordinary, extreme**, eye*, eyebrow

F
 fabric, face*, facilitate, facility, fact* (factual), factor**, factory**, faculty, fade, fail*, faint**, fair**, faith**, fall*, false, fame (famous), familiar**, family*, fan*, fancy**, fantastic**, far*, fare, farm*, fascinate**, fashion**, fast*, fasten, fat*, fate (fatal), father* (dad, daddy), fault**, favor** / favour**, favorite* / favourite*, fear**, feature**, federal, fee**, feed**, feel*, fellow**, female**, fence**, ferry, fertile, festival*, fever**, few**, fiber / fibre, fiction, field*, fierce, fight*, figure**, file*, fill*, film*, filter, final**, finance**, find*, fine*, finger*, finish*, finite, fire*, firm**, first*, fish*, fit**, five*, fix*, flag**, flame**, flash**, flat**, flavor / flavour, flaw, flee, flesh, flexible, flight**, flip, float**, flock, flood**, floor*, flourish, flow**, flower*, flush, fly*, focus*, fog**, fold**, folk**, follow**, fond, food*, fool*, foot*, football*, for*, forbid, force** (enforce), forecast, forehead, foreign**, forest*, forever**, forget*, forgive**, fork*, form* (formal, formation, informal), format, former, formula, forth**, fortunate**, fortune**, forward**, foster, found** (foundation), fountain, four*, fox*, fraction, frame**, framework, frankly**, free*, freeze**, frequent, fresh*, friend* (friendship), fright**, frog**, from*, front*, frost, frown, fruit*, frustrate**, fry**, fuel, fulfil, full*, fun*, function**, fund**, fundamental, funeral, fur**, furnish, furniture**, furthermore, fury (furious), fuse, future*

G
 gain**, gallery, gamble, game*, gang, gap, garage**, garden*, gas*, gasoline / petrol, gate**, gather**, gaze, gear**, gender, gene (genetic), general**, generate (generation), generous, genius, gentle**, gentleman*, genuine, geography, geology, gesture**, get*, ghost**, giant**, gift**, giraffe**, girl*, give*, glad*, glance**, glare, glass*, globe (global), glory**, glove**, glow, glue**, go*, goal*, goat, god*, gold*, golf**, good* (goods), goodbye* (bye), gorgeous**, govern** (government), grab**, grace**, grade** (gradual), graduate, grain, grand**, grandfather*, grant**, grape*, graph** (graphic), grasp, grass*, grateful, grave, gray* / grey*, great*, greed, green*, greet**, grief, grip, grocery**, gross, ground*, group*, grow*, guarantee**, guard**, guardian, guess*, guest**, guide**, guideline, guilt** (guilty), guitar*, gulf, gum*, gun**, guy*, gymnasium / gym

H
 habit*, habitat, hair*, half**, hall**, halt, hamburger*, hammer, hand*, handicap, handle**, handsome**, hang*, happen**, happy*, harbor / harbour, hard* (hardly), harm**, harmony (harmonious), harsh, harvest, hat*, hate*, haunt, have*, hazard, he*, head*, headquarters, heal, health** (healthy), hear**, heart*, heat*, heaven**, heavy*, heel, height**, heir, helicopter**, hell**, hello* / hey* / hi*, helmet*, help*, hence, here*, heritage, hero*, hesitate**, hide**, hierarchy, high*, highlight, highway**, hike*, hill*, hint**, hire**, history*, hit*, hobby*, hold*, hole**, holiday*, holy, home*, homework*, honest*, honey**, honor** / honour**, hook, hope*, horizon, horror, horse*, hospital*, host, hostile, hot*, hotel**, hour*, house*, household, how*, however*, hug**, huge**, human*, humor** / humour**, hundred*, hunger** (hungry), hunt*, hurry*, hurt**, husband*, hut, hypothesis

I
 I*, ice*, idea*, ideal, identical, identity** (identify), ideology, if*, ignore**, ill**, illude (illusion), illustrate**, image*, imagine**, imitate, immediate**, immense, immigrate, immune, impact, imperial, implement, imply, import (importance, important), impose, impress**, improve**, in*, incentive, incident, incline, include**, income**, incorporate, increase**, indeed**, index, indicate**, individual**, induce, industry**, infant, infect, infer (inference), inflate, influence**, inform**, ingredient, inhabit, inherent, inhibit, initial, inject, injure**, inn, innocent**, innovate, input, inquire / enquire, insect, insert, inside*, insight, insist**, inspect**, inspire, install, instance**, instant**, instead**, instinct, institute (institution), instruct**, instrument**, insult, insure** (insurance), integrate, intellect (intellectual), intelligent, intend**, intense**, intent** (intention), interest**, interfere, interior, intermediate, internal**, internet*, interpret, interrupt**, interval, intervene, intimate, into*, intrigue, introduce*, invade, invent** (inventor), invest**, investigate**, invite*, involve**, iron**, irony, irritate, island**, isolate, issue*, it*, item**

J
 jacket*, jail, jam*, jar, jaw**, jeans**, job*, jog, join*, joint, joke**, journal, journey**, joy** (enjoy), judge**, juice*, jump*, junior**, jury, just*, justice**

K
 keen, keep*, key*, kick*, kid*, kill*, kind*, king*, kiss*, kit, kitchen*, knee**, knife*, knight, knock**, knot, know*, knowledge**

L
 label**, labor** / labour**, laboratory** / lab**, lack**, ladder, lady*, lake*, lamb**, lamp**, land*, landscape, lane**, language**, lap, large*, laser*, last*, late*, latter, laugh**, launch, laundry, law**, lawn**, lawyer**, lay** (layer), lazy*, lead**, leaf**, league**, leak, lean**, leap**, learn*, lease, leather, leave**, lecture, left*, leg*, legal**, legend, legislate, legitimate, leisure, lemon**, lend**, lesson*, let**, letter* (literal), level**, liberal, liberty, library*, license** / licence**, lid**, lie*, life*, lift**, light*, like* (likely), likewise, limit**, line*, linguistic, link**, lion*, lip*, liquid, list**, listen*, literature, little*, live*, livingroom**, load**, loan**, local**, locate**, lock**, log**, logic, lone, long*, look*, loose**, lose**, loss**, lot**, loud**, love*, low*, loyal, luck*, lump, lunch*, luxury

M
 machine**, mad*, magazine**, magic**, magnet, magnificent, mail*, main**, maintain**, major** (majority), make*, male**, man*, manage**, manifest, manipulate, manner**, manufacture**, many*, map*, marathon*, margin, marine, mark**, market*, marry*, marvel**, mask**, mass**, master**, match**, mate**, mathematics* / maths* / math*, matter** (material), mature, maximum**, may*, maybe**, mayor, meal**, mean**, meanwhile, measure**, meat*, mechanic, mechanism, medal*, mediate, medical**, medicine**, medieval, medium (media), meet*, melon**, melt**, member* (membership), memory*, mental**, mention**, menu**, merchant, mere, merge, merit, mess**, message**, metal**, method**, metropolitan, microphone, microwave**, middle*, might*, migrate (migrant), mild, military**, milk*, mill**, million, mind*, mine (miner), mineral, minimal, minimum, ministry, minor**, minute**, miracle, mirror**, miss*, missile, mission**, mix**, mobile, mock, mode, modify, model*, moderate, modern**, modest, moist (moisture), molecule, moment**, money*, monitor**, monkey*, monster, month*, monument, mood**, moon* (half moon), moral**, moreover**, morning*, mortal, mother* (mom, mommy), motion**, motive, motor**, mount**, mountain*, mouse*, mouth*, move*, movie*, much*, mud**, multiple, murder, muscle**, museum**, mushroom**, music*, must*, mutual, mystery**, myth

N
 nail**, naive, naked, name*, narrate, narrow**, nasty, nation* (international), native**, nature*, navy**, near*, neat**, necessary**, neck*, need*, needle, negate (negative), neglect, negotiate, neighbor** / neighbour**, neither**, nephew, nerve** (nervous), nest**, net**, network, neutral, never*, nevertheless, new*, news*, newspaper*, next*, nice*, night*, nightmare, nine*, no* / nope* / nay*, noble, nod, noise**, nominate, none**, nonetheless, noon**, nor**, norm (normal), north*, nose*, not*, note* (notion), notebook*, nothing*, notice**, novel, now*, nowadays**, nowhere**, nuclear, number*, numerous, nurse*, nut**

O
 oak**, obey, object** (objective), oblige, observe**, obsess, obtain, obvious**, occasion**, occupy (occupation), occur** (occurrence), ocean**, odd**, of*, off*, offend, offer**, office* (official), officer**, often*, oil*, okay* / okey* / OK*, old*, on*, once**, one*, only*, open*, opera**, operate**, opinion**, opportune (opportunity), oppose**, opt (option), optimist, or*, oral, orange*, orbit, orchestra, order** (disorder), ordinary**, organ (organic, organize / organise), orient (orientation), origin (original), other**, otherwise**, ought**, out*, outcome, outline, output, outrage, outstanding, oven**, over*, overall**, overcome, overhead, overlap, overlook, overnight, oversea / overseas, overwhelm, owe, own**

P
 pace, pack**, pad, page*, pain**, paint*, pair**, palace**, pale, palm, pan**, panel, panic**, pants*, paper*, parade**, paragraph**, parallel, pardon**, parent*, park*, parliament, part*, participate, particle, particular** (particularly), partner*, party*, pass*, passage, passenger, passion, passport, past**, pat, patch, patent, path**, patient**, pattern**, pause**, pave, pay*, peace** (peaceful), peak, pear**, peasant, peel, peer, pen*, penalty, pencil*, people*, pepper**, per**, perceive (perception), perfect**, perform**, perhaps**, period**, permanent, permit, persist, person** (personality), perspective, persuade, pet**, phase, phenomenon, philosophy, photograph** / photo**, phrase, physical**, physics, piano*, pick*, picnic**, picture*, pie**, piece**, pig*, pile**, pill, pilot*, pin**, pinch, pine**, pink*, pioneer, pipe**, pitch**, pity**, pizza*, place* (displace), plain**, plan*, plane**, planet**, plant**, plastic*, plate**, platform, play*, please* (pleasant, pleasure), plenty**, plot, plus**, pocket**, poem**, poet**, point*, poison**, pole** (polar), police*, policy**, polish, polite**, politics**, poll, pollute**, pond, pool**, poor*, pop**, popular**, populate (population), pork**, port**, portion, portrait, pose (dispose), posit (position, positive), possess**, possible**, post** (poster), pot**, potato*, potential**, pour**, powder**, power*, practical**, practice** / practise**, praise, pray**, preach, precede (unprecedented), precise, predator, predict, prefer**, pregnant**, prejudice, premium, prepare**, prescribe, presence**, present*, preserve, preside (president), press**, presume, pretend**, pretty*, prevail, prevent**, previous**, prey, price**, pride**, priest, prime** (primary), primitive, prince*, principal, principle**, print*, prior, prison**, privacy**, private**, privilege, prize**, probable** (probably), problem*, proceed** (procedure), process**, produce**, profession**, professor, profile, profit**, profound, program* / programme* (programmatic), progress**, prohibit, project*, prominent, promise**, promote**, prompt, pronounce** (pronunciation), proof, proper**, property**, proportion, propose**, prospect, prosper, protect**, protein, protest**, proud**, prove**, provide**, province, provoke, psychology, pub**, public**, publish (publisher), pull**, pump**, punch**, punish**, pupil, puppy*, purchase**, pure**, purple**, purpose**, pursue, push*, put*, puzzle**

Q
 quality** (qualify), quantity, quarter**, queen*, question*, questionnaire, quick*, quiet*, quit**, quite**, quiz*, quote**

R
 rabbit*, race* (racial), radio*, rage, rail**, rain*, rainbow**, raise**, rally, random, range**, rank, rapid**, rare**, rat**, rate**, rather**, rational, raw, reach**, react**, read*, ready*, real** (realize / realise), rear, reason** (reasonable), rebel, receipt, receive** (reception), recent**, recipe**, recognize**, recommend**, record**, recover**, recreation*, recruit, red*, reduce**, refer**, refine, reflect**, reform, refrigerate (refrigerator), refuse**, regard**, region**, register**, regret, regular**, regulate, reinforce, reject, relate** (relative, relation, relationship), relax**, release**, relevant, relief**, relieve, religion, reluctant, rely**, remain**, remark**, remedy, remember*, remind**, remote, remove**, rent**, repair**, repeat**, replace**, reply**, report**, represent**, republic, reputation, request**, require**, rescue, research**, resemble, reserve**, reside (resident), resign, resist**, resolve, resort, resource**, respect** (respective), respond**, responsible**, rest*, restaurant*, restore, restrain, restrict, restroom*, result**, resume, retail, retain, retire**, retreat, return*, reveal, revenge, reverse, revise, revive, revolution, reward, rhythm, ribbon*, rice**, rich*, rid, ride**, ridicule (ridiculous), right*, ring*, riot, rise**, risk**, rival, river*, road*, roar, roast, rob**, robot*, rocket**, rod, role**, roll** (enroll / enrol), romantic, roof**, room*, root**, rope**, rose*, rot, rough**, round**, route**, routine, row**, royal**, rub** (rubber), rude**, ruin**, rule**, rumor / rumour, run*, rural, rush**

S
 sack, sacred, sacrifice, sad*, safe*, sail**, salad*, salary**, sale*, salt*, same*, sample**, sand*, sandwich*, satellite, satisfy**, sauce**, save*, say*, scale**, scan, scandal, scarce, scare**, scarf**, scatter, scene**, schedule**, scheme, scholar, school*, science*, scissors*, scope, score*, scramble, scratch**, scream**, screen**, screw, sculpt (sculpture), sea*, seal**, search**, season*, seat**, second* (secondary), secret**, secretary**, section**, sector, secure**, see*, seed**, seek**, seem**, seize, select**, self**, sell*, send*, senior**, sense** (sensation), sensible, sentence**, sentiment, separate**, sequence, series**, serious**, serve**, service*, session**, set*, settle**, seven*, several**, severe, sew**, sex**, shade**, shadow**, shake**, shall**, shallow, shame**, shape**, share**, sharp**, shave**, she*, sheep**, sheet**, shelf**, shell**, shelter**, shift**, shine**, ship*, shirt*, shock**, shoe*, shoot**, shop*, shore**, short*, should*, shoulder**, shout**, show*, shower**, shut**, shy*, sick*, side*, sigh, sight**, sign** (significant), silent, silly**, silver**, similar**, simulate, simultaneous, sin, since**, sing*, single**, sink**, sister*, sit*, site**, situate** (situation), six*, size*, skate*, ski*, skill**, skin*, skip, skirt*, sky*, slave**, sleep*, slice, slide**, slight**, slim, slip**, slope, slow*, small*, smart**, smash**, smell*, smile*, smoke**, smooth**, snack**, snake**, snap**, sneak, snow*, so*, soak, soap, soccer*, social**, society**, sociology, sock*, soft*, software*, soil**, soldier**, sole, solid**, solve**, some*, somewhat**, son*, song*, soon**, sophisticate, sore**, sorry*, sort**, soul**, sound*, soup*, sour**, source**, south*, space*, spaghetti*, span, spare**, spark, speak*, species** (special), specific**, spectacle, spectrum, speech**, speed*, spell**, spend**, sphere, spill, spin**, spirit**, spit, splash, split, spoil**, sponsor**, spoon*, sport*, spot**, spouse, spray**, spread**, spring*, spy**, square**, squeeze, stable**, stack, staff*, stage**, stain, stairs**, stamp**, stand*, standard**, star*, stare**, start*, starve, state**, station**, statistic, statue, status, stay*, steady**, steak*, steal**, steam**, steel**, steep, stem, step**, stick**, stiff, still**, stimulate, stir**, stitch, stock**, stomach**, stone*, stop*, store*, storm**, story*, stove, straight**, strain, strange**, strategy**, strawberry**, stream**, street*, stress**, stretch**, strict, strike**, string**, strip, stripe, stroke, strong*, structure**, struggle**, studio**, study* (student), stuff**, style*, subject** (subjective), submarine, submit (submission), subscribe, substance (substantial), substitute, subtle, suburb, subway*, succeed**, success**, such**, suck, sudden**, suffer**, suffice (sufficient), sugar*, suggest**, suicide, suit**, suite, sum** (summary), summer*, summit, sun*, super**, superb, superior, supervise, supper**, supplement, supply**, support**, suppose**, sure* (ensure), surface**, surgery, surprise**, surrender, surround**, survey**, survive**, suspect**, suspend, sustain, swallow**, swear, sweat, sweater**, sweep**, sweet**, swell, swift, swim*, swing**, switch**, symbol, sympathy, symphony, symptom, system**

T
 table*, tackle, tag, tail*, take* (mistake), tale**, talent, talk*, tall*, tank**, tap**, tape*, target**, task, taste*, tax**, taxi*, tea**, teach*, team*, tear**, tease, technique** / technic**, technology**, teenage**, telegraph, telephone* / phone*, television*, tell*, temperature**, temple, temporary, tempt, ten*, tenant, tend**, tender, tennis*, tense**, tent*, term**, terminal, terminate, terrace, terrible**, terrific, territory, terror (terrorist), test*, text**, textbook*, than*, thank*, that*, the*, theater** / theatre**, theme, then**, theory**, therapy, there*, therefore**, they*, thick**, thief**, thin**, thing*, think*, third*, thirst*, thirteen*, thirty*, this*, thorough, though**, thousand**, thread, threat**, three*, thrill, throat**, through**, throw**, thumb, thus**, tick, ticket*, tide** (tidy), tie**, tiger*, tight**, till**, timber, time*, tin**, tiny**, tip**, tire* (tired), tissue, title** (entitle), to*, toast**, today*, toe**, together*, toilet**, tomato*, tomorrow*, tone**, tongue**, tonight*, too*, tool**, tooth*, top*, topic**, torture, toss, total**, touch*, tough**, tour**, toward** / towards**, towel**, tower**, town*, toxic, toy*, trace**, track*, trade**, tradition**, traffic**, tragic, trail, train*, transact, transfer**, transform, transition, translate, transmit, transport** (transportation), trap**, travel*, tray**, treasure, treat**, treaty, tree*, tremendous, trend, triangle**, tribe, trick**, trigger, trim, trip*, triumph, troop, trouble**, truck*, true*, trunk**, trust**, truth**, try* (trial), tube, tune**, tunnel, turn*, turnover, twelve*, twenty*, twenty-first*, twenty-second*, twenty-third*, twice*, twin**, twist**, two*, type*

U
 ugly*, ultimate, umbrella*, uncle*, under*, undergo, underlie, undermine, understand*, undertake, uniform**, unify, unique, unit**, unite** (union), universe, university**, unless**, until**, up*, update, upon**, upper**, upset**, upward / upwards, urban, urge (urgent), use* (usual), utilize / utilise, utter

V
 vacate (vacation), vaccine, vacuum, vague, valid, valley**, value**, van**, vanish, various**, vary**, vast, vegetable*, vehicle**, venture, verb (verbal), verse, version**, versus, vertical, very*, vessel, veterinarian, via, vice, victim**, victory, video*, view** (interview, review), vigor (vigorous), villa**, village**, violent**, violin*, virgin, virtue (virtual), virus, visible, vision**, visit*, visual, vital, vivid, vocabulary, vocation, voice*, volume**, volunteer**, vote**

W
 wage**, wait*, wake*, walk*, wall*, wander, want*, war*, warehouse, warm*, warn**, warrant, wash*, waste**, watch*, water*, watermelon*, wave**, way*, we*, weak**, wealth, weapon**, wear*, weather*, weave, website*, wedding*, weed, week*, weekend*, weigh**, weight*, weird, welcome*, welfare, well*, west*, wet*, whale**, what*, wheat, wheel**, when*, where*, whereas, whether**, which**, while**, whip, whisper**, whistle**, white*, who*, whole**, why*, wicked, wide**, wife*, wild**, will*, win*, wind*, window*, wine*, wing**, winter*, wipe**, wire**, wise**, wish*, wit, with*, withdraw, within**, without**, witness, woman*, wonder**, wood*, wool**, word*, work*, world*, worry*, worship, worth**, would**, wound**, wrap**, wreck, write*, wrong*

Y
 year*, yell**, yellow*, yes* / yeah* / yep*, yesterday*, yet**, yield, you*, young*

Z
 zebra**, zero**, zone, zoo*
`;

// Helper map for meanings
const meaningDict = {
  'a': '하나의, 어떤', 'an': '하나의 (모음 앞)', 'abandon': '버리다, 포기하다', 'able': '~할 수 있는', 'disabled': '장애가 있는',
  'aboard': '탑승한', 'abort': '중단하다, 유산하다', 'abortion': '낙태, 중단', 'abound': '풍부하다', 'abundant': '풍부한',
  'about': '~에 대하여, 대략', 'above': '~위에, 위의', 'abroad': '해외로, 외국에', 'absent': '결석한, 부재한',
  'absolute': '절대적인, 완전한', 'absorb': '흡수하다, 몰두시키다', 'abstract': '추상적인, 요약', 'absurd': '터무니없는, 황당한',
  'abuse': '남용하다, 학대하다', 'academy': '학원, 한림원', 'accelerate': '가속하다, 촉진하다', 'accent': '억양, 강조',
  'accept': '받아들이다, 수락하다', 'access': '접근, 이용 권한', 'accident': '사고, 우연', 'accommodate': '수용하다, 편의를 도모하다',
  'accompany': '동행하다, 동반하다', 'accomplish': '성취하다, 완수하다', 'accord': '합의, 일치하다', 'account': '계좌, 설명, 고려하다',
  'accumulate': '축적하다, 모으다', 'accurate': '정확한, 정밀한', 'accuse': '고발하다, 비난하다', 'ache': '통증, 아프다',
  'headache': '두통', 'achieve': '달성하다, 성취하다', 'acid': '산성의, 산', 'acknowledge': '인정하다, 승인하다',
  'acquire': '습득하다, 얻다', 'acquisition': '습득, 인수', 'across': '건너서, 맞은편에', 'act': '행동하다, 법률',
  'actual': '실제의', 'interact': '상호작용하다', 'adapt': '적응하다, 각색하다', 'add': '더하다, 추가하다',
  'addict': '중독자, 중독시키다', 'address': '주소, 연설하다', 'adequate': '적절한, 충분한', 'adjust': '조정하다, 적응하다',
  'administer': '관리하다, 집행하다', 'administration': '행정, 경영', 'admire': '존경하다, 감탄하다', 'admit': '인정하다, 입장을 허가하다',
  'admission': '입학, 입장료', 'adolescent': '청소년, 청소년기의', 'adopt': '채택하다, 입양하다', 'adult': '성인, 어른',
  'advance': '진보하다, 전진', 'advantage': '유리한 점, 장점', 'disadvantage': '불리한 점, 단점', 'adventure': '모험',
  'adverse': '부정적인, 불리한', 'advertize': '광고하다', 'advertise': '광고하다', 'advice': '조언, 충고',
  'advise': '조언하다', 'advocate': '지지하다, 옹호자', 'aesthetic': '미학적인, 미의', 'affair': '일, 사건',
  'affect': '영향을 미치다', 'affection': '애정, 애착', 'afford': '~할 여유가 있다', 'afraid': '두려워하는',
  'after': '~후에', 'afternoon': '오후', 'again': '다시, 한 번 더', 'against': '~에 반대하여, ~에 맞서',
  'age': '나이, 시대', 'agency': '대리점, 기관', 'agenda': '의제, 안건', 'agent': '대리인, 에이전트',
  'aggress': '공격하다', 'aggressive': '공격적인, 적극적인', 'ago': '~전에', 'agree': '동의하다',
  'disagree': '반대하다', 'agriculture': '농업', 'ahead': '앞서, 미래에', 'aid': '원조, 도움',
  'aim': '목표, 겨냥하다', 'air': '공기, 대기', 'airline': '항공사', 'airplane': '비행기',
  'aeroplane': '비행기', 'airport': '공항', 'alarm': '경보, 경악케 하다', 'album': '앨범',
  'alcohol': '알코올, 술', 'alert': '경계하는, 알림', 'alien': '외계인, 외국인, 생소한', 'alike': '비슷한, 마찬가지로',
  'alive': '살아있는', 'all': '모든, 전부', 'allocate': '할당하다, 배분하다', 'allow': '허락하다, 가능하게 하다',
  'ally': '동맹국, 지지자', 'almost': '거의', 'alone': '혼자서, 외로이', 'along': '~을 따라',
  'alongside': '~와 함께, 옆에', 'aloud': '소리 내어', 'already': '이미, 벌써', 'alright': '괜찮은, 좋았어',
  'also': '또한, 역시', 'alter': '바꾸다, 변경하다', 'alternate': '교대하다, 대안의', 'alternative': '대안, 대체 가능한',
  'although': '비록 ~일지라도', 'altogether': '완전히, 대체로', 'always': '항상, 언제나', 'amaze': '놀라게 하다',
  'ambassador': '대사, 외교관', 'ambition': '야망, 포부', 'ambitious': '야심 찬', 'ambulance': '구급차',
  'among': '~사이에, ~중에', 'amount': '양, 총액', 'amuse': '즐겁게 하다', 'analysis': '분석',
  'analyze': '분석하다', 'analyse': '분석하다', 'anchor': '닻, 앵커, 고정시키다', 'ancient': '고대의, 아주 오래된',
  'and': '그리고, ~와', 'angel': '천사', 'anger': '분노, 화나게 하다', 'angle': '각도, 관점',
  'animal': '동물', 'anniversary': '기념일', 'announce': '발표하다, 알리다', 'annoy': '짜증나게 하다',
  'annual': '연례의, 해마다의', 'another': '또 다른 하나', 'answer': '대답하다, 정답', 'ant': '개미',
  'anticipate': '예상하다, 기대하다', 'anxiety': '불안, 염려', 'anxious': '불안해하는, 갈망하는', 'any': '어떤, 조금의',
  'apart': '떨어져, 별개로', 'apartment': '아파트', 'apology': '사과, 사죄', 'apparent': '명백한, 겉보기의',
  'appeal': '호소하다, 매력', 'appear': '나타나다, ~인 것 같다', 'disappear': '사라지다', 'apple': '사과',
  'apply': '적용하다, 지원하다', 'applicant': '지원자', 'appoint': '임명하다, 정하다', 'appreciate': '감사하다, 가치를 인정하다',
  'approach': '접근하다, 방안', 'appropriate': '적절한, 알맞은', 'approve': '승인하다, 찬성하다', 'approximate': '대략의, 근사한',
  'architect': '건축가', 'architecture': '건축학, 건축물', 'area': '지역, 면적, 분야', 'argue': '주장하다, 논쟁하다',
  'arise': '발생하다, 일어서다', 'arm': '팔, 무기', 'army': '군대, 육군', 'around': '주위에, 대략',
  'arrange': '정리하다, 정하다', 'arrest': '체포하다', 'arrive': '도착하다', 'arrow': '화살',
  'art': '예술, 미술', 'article': '기사, 물품, 조항', 'artifice': '책략, 계교', 'artificial': '인공의, 인위적인',
  'as': '~로서, ~처럼, ~할 때', 'aside': '옆에, 제쳐 두고', 'ask': '묻다, 요청하다', 'asleep': '잠든',
  'aspect': '측면, 양상', 'aspire': '열망하다, 염원하다', 'assault': '폭행, 습격하다', 'assemble': '조립하다, 모이다',
  'assert': '주장하다, 명확히 하다', 'assess': '평가하다, 산정하다', 'asset': '자산, 자산 가치', 'assign': '할당하다, 지정하다',
  'assignment': '과제, 임무', 'assist': '돕다, 보조하다', 'assistant': '보조자, 점원', 'associate': '연관짓다, 동료',
  'assume': '가정하다, (책임을) 맡다', 'assure': '보장하다, 확신시키다', 'astonish': '놀라게 하다', 'at': '~에서',
  'athlete': '운동선수', 'atmosphere': '대기, 분위기', 'atom': '원자', 'attach': '붙이다, 첨부하다',
  'attack': '공격하다', 'attempt': '시도하다, 시도', 'attend': '참석하다, 주의를 기울이다', 'attention': '주의, 관심',
  'attitude': '태도, 자세', 'attract': '끌어당기다, 매료시키다', 'attribute': '~의 탓으로 돌리다, 속성', 'auction': '경매',
  'audience': '청중, 관객', 'aunt': '이모, 고모, 숙모', 'authentic': '진짜의, 확실한', 'author': '작가, 저자',
  'automatic': '자동의', 'autumn': '가을', 'avail': '유용하다, 효력', 'available': '이용 가능한, 구수 있는',
  'average': '평균의', 'avoid': '피하다, 회피하다', 'await': '기다리다', 'awake': '깨어있는, 깨우다',
  'award': '상, 수여하다', 'aware': '알고 있는, 인식하는', 'unaware': '알지 못하는', 'away': '떨어져, 멀리',
  'awe': '경외감, 두려움', 'awful': '끔찍한, 지독한', 'awkward': '어색한, 서투른',

  // B
  'baby': '아기', 'back': '뒤로, 등, 돌아오다', 'background': '배경, 학력', 'bacon': '베이컨', 'bad': '나쁜, 나쁜 상태인',
  'badminton': '배드민턴', 'bag': '가방', 'bake': '빵을 굽다', 'balance': '균형, 잔액', 'ball': '공',
  'balloon': '풍선', 'ban': '금지하다, 금지', 'banana': '바나나', 'band': '밴드, 끈', 'bang': '쿵 소리, 쾅 닫다',
  'bank': '은행, 강둑', 'bankrupt': '파산한', 'bar': '막대기, 술집, 금지하다', 'bare': '벌거벗은, 단순한', 'bargain': '싸게 산 물건, 협상하다',
  'bark': '짓다, 나무 껍질', 'barrier': '장벽, 장애물', 'base': '기초, 토대', 'baseball': '야구', 'basis': '기초, 근거',
  'basket': '바구니', 'basketball': '농구', 'bat': '박쥐, 야구 방망이', 'bath': '목욕', 'battery': '건전지, 배터리',
  'battle': '전투, 싸움', 'bay': '만(해안)', 'be': '있다, 이다', 'beach': '해변', 'beam': '빛줄기, 기둥',
  'bean': '콩', 'bear': '곰, 견디다, 품다', 'beard': '턱수염', 'beast': '짐승, 야수', 'beat': '이기다, 두드리다',
  'beauty': '아름다움, 미인', 'because': '~때문에', 'become': '~이 되다', 'bed': '침대', 'bee': '벌',
  'beef': '쇠고기', 'beer': '맥주', 'before': '~전에', 'beg': '간청하다, 구걸하다', 'begin': '시작하다',
  'behalf': '위함, 대리', 'behave': '행동하다', 'behavior': '행동, 태도', 'behaviour': '행동', 'behind': '~뒤에',
  'belief': '신념, 믿음', 'believe': '믿다', 'bell': '종', 'belong': '~에 속하다', 'below': '~아래에',
  'belt': '벨트, 지대', 'bench': '벤치, 긴 의자', 'bend': '구부리다', 'beneath': '~아래에', 'benefit': '혜택, 이익',
  'beside': '~옆에', 'bet': '돈을 걸다, 확신하다', 'betray': '배신하다', 'between': '~사이에', 'beyond': '~너머에',
  'bias': '편견, 편향', 'big': '큰', 'bike': '자전거', 'bill': '청구서, 지폐, 법안', 'billion': '10억',
  'bin': '쓰레기통', 'bind': '묶다, 결합하다', 'biography': '전기, 일대기', 'biology': '생물학', 'bird': '새',
  'birth': '탄생, 출생', 'biscuit': '비스킷', 'bit': '조금, 조각', 'bite': '물다, 한 입', 'bitter': '쓴, 쓴맛의, 억울한',
  'black': '검은색', 'blame': '비난하다, 탓으로 돌리다', 'blank': '빈칸의, 공백', 'blanket': '담요', 'blast': '폭발, 신나는 시간',
  'blend': '섞다, 혼합', 'bless': '축복하다', 'blind': '눈이 먼', 'blink': '깜빡이다', 'block': '블록, 막다',
  'blonde': '금발의', 'blood': '피, 혈액', 'bloom': '꽃이 피다', 'blossom': '꽃', 'blow': '불다, 타격',
  'blue': '파란색, 우울한', 'board': '탑승하다, 이사회, 게시판', 'boat': '보트, 배', 'body': '신체, 몸체',
  'embody': '상징하다, 구현하다', 'boil': '끓다, 끓이다', 'bold': '대담한, 굵은 글씨의', 'bomb': '폭탄, 폭파하다',
  'bond': '유대, 채권', 'bone': '뼈', 'book': '책, 예약하다', 'boom': '붐, 급격한 호황', 'boost': '북돋우다, 제고',
  'boot': '부츠, 신발', 'border': '국경, 경계', 'bore': '지루하게 하다', 'borrow': '빌리다', 'boss': '상사, 사장',
  'both': '둘 다', 'bother': '괴롭히다, 신경 쓰이다', 'bottle': '병', 'bottom': '바닥, 아래', 'bounce': '튀기다',
  'boundary': '경계선', 'bow': '절하다, 활', 'bowl': '사발, 그릇', 'box': '상자', 'boy': '소년',
  'brain': '뇌, 두뇌', 'brake': '브레이크, 제동을 걸다', 'branch': '가지, 지점', 'brand': '상표, 브랜드',
  'brave': '용감한', 'bread': '빵', 'break': '부수다, 휴식', 'breakfast': '아침 식사', 'breast': '가슴',
  'breath': '숨, 호흡', 'breathe': '숨쉬다', 'breed': '번식하다, 품종', 'breeze': '산들바람', 'brick': '벽돌',
  'bridge': '다리, 교량', 'brief': '간결한, 짧은', 'bright': '밝은, 영리한', 'brilliant': '훌륭한, 뛰어난',
  'bring': '가져오다', 'broad': '넓은, 광범위한', 'broadcast': '방송하다, 방송', 'brother': '형제, 남동생, 형',
  'brown': '갈색', 'brush': '솔, 붓, 빗질하다', 'brute': '짐승, 잔혹한 사람', 'brutal': '잔혹한',
  'bubble': '거품', 'budget': '예산', 'bug': '벌레, 버그', 'build': '짓다, 건설하다', 'bulk': '대량, 규모',
  'bull': '황소', 'bully': '괴롭히다, 괴롭히는 자', 'bump': '부딪히다, 혹', 'bunch': '다발, 송이',
  'bundle': '묶음, 묶다', 'burden': '짐, 부담', 'burn': '타다, 태우다', 'burst': '터지다, 갑자기 ~하다',
  'bury': '묻다, 매장하다', 'bus': '버스', 'bush': '덤불, 관목', 'business': '사업, 업무', 'busy': '바쁜',
  'but': '그러나', 'butcher': '정육점 주인, 도살하다', 'butter': '버터', 'button': '단추, 버튼',
  'buy': '사다, 구매하다', 'buzz': '윙윙거리다, 소문', 'by': '~에 의해, ~옆에'
};

const lines = rawText.split('\n');
const parsedMap = new Map();

for (let line of lines) {
  line = line.trim();
  if (!line || /^[A-Z]$/.test(line)) continue;

  const tokens = line.split(/[,;\t]+/).map(s => s.trim()).filter(Boolean);
  for (let token of tokens) {
    if (!token) continue;

    let categoryId = 'high_sat';
    if (token.includes('**')) {
      categoryId = 'middle';
    } else if (token.includes('*')) {
      categoryId = 'elementary';
    }

    let cleanToken = token.replace(/\*/g, '').trim();

    const mainMatch = cleanToken.match(/^([a-zA-Z\s\-\/\']+)(?:\((.*)\))?$/);
    if (mainMatch) {
      const mainWord = mainMatch[1].trim();
      const parenthetical = mainMatch[2] ? mainMatch[2].trim() : '';

      const slashParts = mainWord.split('/').map(p => p.trim()).filter(Boolean);
      for (let w of slashParts) {
        if (!w || w.length < 1) continue;
        const lowerW = w.toLowerCase();
        if (!parsedMap.has(lowerW)) {
          let meaning = meaningDict[lowerW] || `${w} (교육부 필수 어휘)`;
          parsedMap.set(lowerW, {
            word: w.charAt(0).toUpperCase() + w.slice(1),
            ipa: `/${lowerW}/`,
            meaning: meaning,
            partOfSpeech: categoryId === 'elementary' ? '초등 필수' : categoryId === 'middle' ? '중학 필수' : '고등·수능 필수',
            sentence: `The word "${w}" is an essential vocabulary item in the English curriculum.`,
            sentenceMeaning: `"${meaning}"(은)는 대한민국 교육부 개정 교과서 및 수능 필수 어휘입니다.`,
            categoryId: categoryId,
            tip: categoryId === 'elementary' ? '2026 교육부 지정 초등 3~6학년 필수 기본 어휘' :
                 categoryId === 'middle' ? '2026 교육부 지정 중학 1~3학년 필수 기본 어휘' :
                 '2026 교육부 지정 고교 교과서 및 수능/EBS 핵심 어휘',
          });
        }
      }

      if (parenthetical) {
        const subParts = parenthetical.split(/[,/]+/).map(p => p.trim()).filter(Boolean);
        for (let subW of subParts) {
          if (!subW || subW.length < 1) continue;
          const lowerSub = subW.toLowerCase();
          if (!parsedMap.has(lowerSub)) {
            let meaning = meaningDict[lowerSub] || `${subW} (${mainWord}의 관련 어휘)`;
            parsedMap.set(lowerSub, {
              word: subW.charAt(0).toUpperCase() + subW.slice(1),
              ipa: `/${lowerSub}/`,
              meaning: meaning,
              partOfSpeech: '파생/연관어',
              sentence: `You can use "${subW}" alongside "${mainWord}" in formal English sentences.`,
              sentenceMeaning: `"${subW}"(은)는 "${mainWord}"에서 확장된 교육부 지정 파생 어휘입니다.`,
              categoryId: categoryId === 'elementary' ? 'middle' : categoryId,
              tip: `[교육부 파생 어휘] ${mainWord} 관련 핵심 표현`,
            });
          }
        }
      }
    }
  }
}

const allWords = Array.from(parsedMap.values());
console.log('Total unique words extracted:', allWords.length);
console.log('Elementary words count:', allWords.filter(w => w.categoryId === 'elementary').length);
console.log('Middle words count:', allWords.filter(w => w.categoryId === 'middle').length);
console.log('High SAT words count:', allWords.filter(w => w.categoryId === 'high_sat').length);

fs.writeFileSync(
  path.join(__dirname, '../src/data/officialCurriculum3000Data.json'),
  JSON.stringify(allWords, null, 2),
  'utf-8'
);

console.log('Successfully written officialCurriculum3000Data.json!');

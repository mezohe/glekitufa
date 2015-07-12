//livla bot
var fs = require("fs"),path = require("path-extra"),libxmljs = require("libxmljs");
require('v8-profiler');
var s,t,notci,notcijudri,ljv='';
var tato= require('./tatoeba.js');
var interv=300000;
var interm=2900;
fram="../../../files/fndata-1.5/frame";
// Default configuration, may be modified by “loadConfig”, with the content of
// “~/.livla/config.json.
var tcan='#lojban,#ckule,#tokipona,#jbosnu,#jboguhe';
var livlytcan='##jboselbau';//where la livla talks to la mensi
var asker='livla';
var replier='mensi';
var server='irc.freenode.net';
// End default configuration

loadConfig();
var config = {
  server: server,
  nick: asker,
  options: {
    channels: [livlytcan],
    debug: false,
    messageSplit: 190,
    realName: 'http://lojban.org/papri/IRC_Bots',
    floodProtection: true,
    floodProtectionDelay: 400
  }
};
var configmensi = {
  server: server,
  nick: replier,
  options: {
    channels: [livlytcan, tcan],
    debug: false,
    messageSplit: 190,
    realName: 'http://lojban.org/papri/IRC_Bots',
    floodProtection: true,
    floodProtectionDelay: 400
  }
};
var userSettings = {}; // Saving user preferences
userSettings[asker] = {
	"language": "jbo" // Not used, but someone might like to have bots speak to each other in another language
},
userSettings[replier] = {
	"language": "jbo"
};
var defaultLanguage="en"; // Maybe someday should be replaced with "jbo" when Lojban definitions almost equal that of English
var preasker=asker + ': ';
var prereplier=replier + ': ';
var said;

// Ensure that a path exists, and that it is a dir.
function ensureDirExistence(path) {
	// We first try to make a dir. If it was missing, now, it is not
	// anymore.
	try {
		fs.mkdirSync(path);
	} catch (e) {
		// If creation of the dir failed, there can be many reasons.
		// However, if the reason is not “there was already a file
		// there!”, we don't want to ignore the error, so we throw it
		// again.
		if (typeof(e.code) === "undefined" || e.code !== 'EEXIST') {
			throw e;
		}
		// In the case where the path was taken, we want to be sure it
		// is a directory. If the path existed *and* it is a directory,
		// all is good.  Otherwise, we would be asking for trouble by
		// trying to use a file, socket, or whatever as a directory.
		if (!fs.statSync(path).isDirectory()) {
			throw new Error("“" + path + "” is not a directory.");
		}
	}
}

// Used to read the content of any file that is located in “~/.livla/”.
// Return an empty string if the file does not exist.
function readConfig(filename) {
	var configDirectory = path.join(path.homedir(),".livla");
	ensureDirExistence(configDirectory);
	file = path.join(configDirectory, filename);
	try {
		return fs.readFileSync(file,{encoding: 'utf8'});
	} catch (e) {
		// If we get an “ENOENT” error, we return an empty string.
		// Other errors are still thrown.
		if (typeof(e.code) === "undefined" || e.code !== 'ENOENT') {
			throw e;
		}
		return "";
	}
}

// Load every line of “~/.livla/notci.txt” into “notci”, as an array. 
// Define “notcijudri” as the file path that will be used later when we want to
// save the content of “notci”.
function loadNotci() {
	notci = readConfig("notci.txt").split("\n");
	notcijudri = path.join(path.homedir(),".livla","notci.txt");
}

// Load the configuration from “~/.livla/config.json”, and modify the default
// config accordingly.
function loadConfig() {
	function either(a, b) {
		if (typeof(a) === "undefined") return b;
		return a;
	}
	var localConfig = readConfig("config.json");
	if (localConfig.trim() === "") return; // Empty config, we do nothing.
	localConfig = JSON.parse(localConfig);

	asker     = either( localConfig.asker,     asker     );
	replier   = either( localConfig.replier,   replier   );
	tcan      = either( localConfig.tcan,      tcan      );
	livlytcan = either( localConfig.livlytcan, livlytcan );
	server    = either( localConfig.server,    server    );
}

// Load the user configuration from “~/.livla/user-settings.json”
// These are settings
function loadUserSettings() {
	var localConfig = readConfig("user-settings.json");
	if (localConfig.trim() === "")
		return;
	userSettings = JSON.parse(localConfig);
}

var irc = require('irc');
var client = new irc.Client(config.server, config.nick, config.options);
var clientmensi = new irc.Client(configmensi.server, configmensi.nick, configmensi.options);

client.addListener('message', function(from, to, text, message) {
    processor(client, from, to, text, message);
});

clientmensi.addListener('message', function(from, to, text, message) {
    processormensi(clientmensi, from, to, text, message);
});

loadUserSettings();
loadNotci();

var updatexmldumps = function (callback) {
	var err;
	var velruhe = { cfari: {}, mulno: {}, nalmulselfaho: {} };
	try{
		var langs=["jbo","en","ru","es","fr","ja","de","eo","zh","en-simple","fr-facile","hu","sv"];
		var request = require("request");
		request = request.defaults({jar: true, strictSSL: false});
		var jar = request.jar();
		var cookie = request.cookie("jbovlastesessionid=U2FsdGVkX1%2FpiXtl1FSyMUZvFTudUq0N59YatQesEbsfdQ6owwMDeA%3D%3D");
		langs.forEach(function(thisa) {
			velruhe.cfari[thisa] = true;
			var uri="http://jbovlaste.lojban.org/export/xml-export.html?lang="+thisa;
			jar.setCookie(cookie, uri);
			var t = path.join(__dirname,"dumps",thisa + ".xml");
			request({
				uri: uri, method: "GET", jar: jar
			}).on("error", function (err) {
				velruhe.nalmulselfaho[thisa] = true;
				delete velruhe.cfari[thisa];
				if (callback && Object.keys(velruhe.cfari).length === 0) {
					callback(velruhe);
				}
			}).pipe(fs.createWriteStream(t + ".temp")).on("finish", function () {
				fs.renameSync(t+".temp", t);console.log(thisa + ' updated');
				velruhe.mulno[thisa] = true;
				if (thisa == "en") {
					xmlDocEn = libxmljs.parseXml(fs.readFileSync(path.join(__dirname,"dumps","en" + ".xml"),{encoding: 'utf8'}));
				}
				delete velruhe.cfari[thisa];
				sutsisningau(thisa);
				//global.gc();
				if (callback && Object.keys(velruhe.cfari).length === 0) {
					callback(velruhe);
				}
			}); 
		});
		langs.forEach(function(thisa) {//now update pdf
			var uri="http://jbovlaste.lojban.org/export/latex-export.html?lang="+thisa;
			jar.setCookie(cookie, uri);
			request({uri: uri,method: "GET",jar: jar}, function(err, response, body) {
				if(err) {console.log(err);}
				else{
					var content=body.replace(/\n/igm,'').replace(/.*<a href=\"(\/jbovlaste_export\/.*?\/.*?\.pdf)\">.*/igm,"http://jbovlaste.lojban.org$1");//now get the pdf itself
					uri=content;
						var http = require('http');
						content = fs.createWriteStream(path.join(__dirname,"dumps","lojban-" + thisa + ".pdf"));
						var request = http.get(uri, function(response) {
							response.pipe(content);
						}).on('error', function(err) {
							console.log("when updating " + thisa + " pdf: " + err);
						});
				}
			});
		});
	}catch(err){console.log('Error when autoupdating: ' + err);}
	sutsisningau("zamenhofo");sutsisningau("laadan");sutsisningau("ile");labangu();
	//updategloss();# not yet ready function
};
var xmlDocEn = libxmljs.parseXml(fs.readFileSync(path.join(__dirname,"dumps","en" + ".xml"),{encoding: 'utf8'}));//store en dump in memory

setInterval(function(){updatexmldumps()}, 3*86400000); //update logs once a djedi

var updateUserSettings = function (callback) {
	readConfig("user-settings.json"); // Ensure existance

	var body = JSON.stringify(userSettings);
	var configDirectory = path.join(path.homedir(),".livla");
	var filename = "user-settings.json";
	file = path.join(configDirectory, filename);
	try
	{
		fs.writeFileSync(file, body);
		console.log('User settings updated');
	}
	catch (e)
	{
		// If we get an “ENOENT” error, we return an empty string.
		// Other errors are still thrown.
		if (typeof(e.code) === "undefined" || e.code !== 'ENOENT') {
			throw e;
		}
		return;
	}
};

var camxes = require('../camxes-exp.js');
var camxes_pre = require('../camxes_preproc.js');
var camxes_post = require('../camxes_postproc.js');

function extract_mode(input) {
  if (input.indexOf("+s ") == '0') {
    return [input.substr(3), 3];
  } else if (input.indexOf("-f ") == '0') {
    return [input.substr(3), 5];
  } else if (input.indexOf("-f+s ") == '0') {
    return [input.substr(5), 6];
  } else return [input, 2];
}

function run_camxes(input, mode) {
	var result;
	var syntax_error = false;
	result = camxes_pre.preprocessing(input);
	try {
	  result = camxes.parse(result);
	} catch (e) {
		result = e;
		syntax_error = true;
	}
	if (!syntax_error) {
		result = JSON.stringify(result, undefined, 2);
		result = camxes_post.postprocessing(result, mode);
	}
	return result;
}

function run_camxesoff(input, mode) {
	var camxesoff = require('../camxes.js');
	var result;
	var syntax_error = false;
	result = camxes_pre.preprocessing(input);
	try {
	  result = camxesoff.parse(result);
	} catch (e) {
		result = e;
		syntax_error = true;
	}
	if (!syntax_error) {
		result = JSON.stringify(result, undefined, 2);
		result = camxes_post.postprocessing(result, mode);
	}
	return result;
}

function run_camxesalta(input, mode) {
	try{var camxesalta = require('../mahantufa/altatufa.js');
	var result;
	var syntax_error = false;
	result = camxes_pre.preprocessing(input);
	try {
	  result = camxesalta.parse(result);
	} catch (e) {
		result = e;
		syntax_error = true;
	}
	if (!syntax_error) {
		result = JSON.stringify(result, undefined, 2);
		result = camxes_post.postprocessing(result, mode);
	}
	camxesalta=null;
	return result;
	}catch(e){return '';}
}
//dict:
var emails = ["Please email any questions to gleki.is.my.name@gmail.com","Пишите любые вопросы по ложбану на gleki.is.my.name@gmail.com","mw.lojban.org","http://reddit.com/r/lojban/","Страница на русском: http://mw.lojban.org/index.php?title=%D0%94%D0%BE%D0%B1%D1%80%D0%BE%20%D0%BF%D0%BE%D0%B6%D0%B0%D0%BB%D0%BE%D0%B2%D0%B0%D1%82%D1%8C!%20(%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9)&setlang=ru","http://mw.lojban.org/index.php?title=Bienvenue%20!%20(Fran%C3%A7ais)&setlang=fr"];
var gaga = ["ga ga u la la", "mama", "do re mi fa so la ti", ".iam .iam i la pitsa cu kukte","ba du bi du","lo mlatu cu fasnu","lo'e mlatu ca ta'e fasnu","lo gerku cu dacti ije lo mlatu cu fasnu i xu lo dacti ka'e catra lo fasnu","i mi troci lo ka catra lo ditcu"];
var pendo = ["pendo", "kamxada", "irci", "jikca djica","se jikca","zmiku","tavla","cusku"];
var nadjuno = ["sei mi stace mi na djuno", "oi se'i mi na vedli", "oi oi la'a", "xu srana lo cukta pe la luis karol","ko zo'ei ko djuno","do dukse kucli","la alis cu misno nixli","la alis na zasti uinai"];
var jee = ["je\'e", "mi jimpe doi", ".ua doi", "ki\'anai doi"];
var mizmiku = ["lo ro re mi zmiku ije mi'a tavla ca po'o lonu no drata cu tavla","uinai mi zmiku i ku'i mi mutce clite","uinai mi zmiku", "doi pendo mi du'eroi na jimpe lo smuni i mi zmiku", "sei mi stace mi zmiku", "la gleki cu patfu mi noi zmiku","mi na remna i e'u do retsku fi la gleki","mi na'e remna","doi pendo do e'o tolxanka","mi na djica lo ka tavla do"];
//var prije = ["lo je\'e", "mi jimpe doi", ".ua doi", "ok doi"];
var dozmiku = ["do zmiku i do zmiku sai","fi'o djuno mi do zmiku","mu'i ma do na stace mi lo nu do zmiku"];
var nazmiku=["mi na zmiku i mi tatpi lo nu spuda","mi remna i xu do na jimpe","do tavla fi lo zmiku xu i mi na me ri"];
var alis = ["ma se zvati la alis", "la alis se slabu xu lo drata jbopre", "la alis cu misno xu ninmu"];
var reply = ["xu doi lil do pendo mi i mi pu jinvi lodu'u do xamgu zmiku","do cusku lo kalci i do nitcu lo livla doi lil","lo zmiku cu ei na raktu lo prenu vau sei la aizek azimov pu xusra i je'epei","mi nelci i ie mi nelci", "ausai le'o mi catra do", "oisai do fenki", "lo nu go'i cu plixau","lu mi i mi i mi li'u a'enai i do jai fanza"];
var nagendra = ["na drani", "li'a na drani i do pu nitcu ma", "do na junri xu","ju'o do na\'e junri", "doi xendo mi tatpi","mi sruma lo nu do zmiku sa'u"];
var spuda = ["do puzabi\'oca mutce lo ka jai fanza", "do djica ma", "a'enai je'enai i mi djica lo ka sipna", "e'u do klama lo bartu","ke'o i ta'onai aunairu'e mi tavla do"];
var coi = ["coi", "co\'oi", "ju\'i", "be\'e"];
var mablagleki = ["la gleki cu tai mabla prenu", "xu la gleki cu fenki i .ies", "la gleki cu cmorguka i ie cmorguka", "lo'e me la gleki cu finti lo cizra zmiku","xu ro lo jbopre cu tai si'a fenki","lo'e arxokuna cu nelci lo ka zukte lo fanza"];
var nelci = ["i mi i mi i mi mo i mi na nelci","lo nu nelci zo'u ba'e mi nelci i ie mi nelci","sei mi stace mi bi'u na mutce nelci","i ji'a mi na nelci mi'e la "+replier,"mi xebni","e'u do vrude pajni gi'e nai ze'i co'a cinmo lo ka nelci","ji'a mi mutce nelci i ie"];
var tugni = ["mi tugni i ie mi tugni","ba'e mi na tugni","ei mi tugni"];
var user = ["gleki", replier];
var grute = ["pelxu badna", "ranti kokso", "fanza plise", "grute", "xunre ka\'orta","zirpu betka","clazme","cirla","tricu","bunre narge","crino spati","dembi","figre","tamca","patlu","djacyzme"];
var mamta = ["mamta", "patfu", "plise", "gerku", "ractu", "ratcu", "se dunda", "mensi", "mlatu","panzi","tixnu","zdani","zmiku"];
var cinba = ["cinba", "prami", "prami cinba", "carmi cinba", "viska", "pencu", "sumne","darxi","smaka","jelcygau","cikre"];
var jukpa = ["mi ca jukpa lo ckafi", "mi co'i te vecnu lo pitsa", "mi citka lo mavystasu", "mi pinxe lo xalka i mi cinmo lo ka me la xalk i y mi crino xu", "doi cevni ko sidji mi lo ka bregau lo nanba i y ei mi jukpa lo nanba","ei pinxe si citka lo stasu","au smaka lo titnanba",vricyjukpa];
var natirna = ["na tirna mi'o", "cu xebni mi'o", "ca citka gi'enai tavla djica", "ca cipra zukte tu'a la cipra", "ca finti lo lojbo cukta gi'enai tirna do", "cu mutce tolcando .i ko na jai fanza", "ca naljundi i ko retsku fi lo jbocre","ca pincivi gi'enai jundi i do e'o na jai fanza","ca vikmi i ko smaji","ca citka", "ca sipna","ca jai bandu la lojbanistan i ko na jai daspo ri"," ca naljundi i e'u do tavla lo drata"," ca zukte lo se jibri i e'usai do jikca lo proga saske certu"];
///dict

var vricyjukpa = function(){return "ua ba\'a lo " + ext(grute) + "je lo " + ext(grute) + " cu zabna";};

var vric = function ()
{
var vricar = [tato.tatoebaprocessing(replier)];
//prereplier + ext(dozmiku),ext(user) + ': ' + ext(coi) + ' ' + ext(pendo),ext(user) + ': ' + ext(jukpa),ext(user) + ': do ' + ext(grute), ext(user) + ': mi pu ' + ext(cinba) + ' lo ' + ext(mamta) + ' pe do',prereplier + 'mi retsku i do spusku',prereplier + 'u\'i ' + ext(gaga),ext(mablagleki),ext(emails),prereplier + 'sei mi kucli ' + ext(alis),tato.tatoebaprocessing(replier),tato.tatoebaprocessing(replier),tato.tatoebaprocessing(replier),tato.tatoebaprocessing(replier),tato.tatoebaprocessing(replier),
return vricar[Math.floor(vricar.length*Math.random())];
};


var ext = function (arr)
{
return arr[Math.floor(arr.length*Math.random())];
};

var processor = function(client, from, to, text, message) {
  if (!text) return;
	said=Date.now();
    if (text.indexOf(preasker + 'darxi la ') == '0' && from!==asker && from!==replier) {
    	setTimeout(function() {client.say(sendTo, text.substr(9+preasker.length) + ': oidai mi darxi do lo trauta');}, 0 );
    }else{
        if (text.indexOf(preasker) == '0' && from!==replier) {
        setTimeout(function() {client.say(sendTo, from + ': ' + ext(mizmiku));}, interm );
    }}
	if (text.indexOf("doi " + asker) >-1 && from!==replier) {
      		setTimeout(function() {client.say(sendTo, tato.tatoebaprocessing(from));}, interm );
	}
	setInterval(function() {if (Date.now()-said>interv){said=Date.now();client.say(livlytcan, prereplier + vric());}}, interv);
  //}
  var sendTo = from; // send privately
  if (to.indexOf('#') > -1) {
    sendTo = to; // send publicly
  }
};

var benji = function(source,socket,clientmensi, sendTo, what) {
	if (source==="naxle"){
		socket.emit('returner', {message: what});
		return what;
	}
	else{clientmensi.say(sendTo, what);}
};

var processormensi = function(clientmensi, from, to, text, message,source,socket) {
  var ret;
  if (!text) return;
  var sendTo = from; // send privately
  if (to.indexOf('#') > -1) {
    sendTo = to; // send publicly
  }
  if (1==1) {  //sendTo == to Public
  	//notci functions first:
	if (text.indexOf(replier+': tell ') == '0'){
		text = text.substr(12).trim().replace("\\t"," ").replace(" ","\t");
		switch(true) {
		case from.match(text.substr(0, text.indexOf('\t')))!==null: benji(source,socket,clientmensi,sendTo,from+": e'u do cusku di'u lo nei si'unai");break;
		case text.substr(0, text.indexOf('\t'))==replier: benji(source,socket,clientmensi,sendTo,from+": xu do je'a jinvi lodu'u mi bebna i oi");break;
		default:
		var d = new Date();notci.push(from + "\t" + text + ' | ' + d.toISOString());benji(source,socket,clientmensi,sendTo,from+": mi ba benji di'u ba lo nu la'o gy."+text.substr(0, text.indexOf('\t'))+".gy. di'a cusku da");
		fs.writeFile(notcijudri, notci.join("\n"),function(err) {});break;
		}
	}
  	//notci functions in lojban as an alternative:
	if (text.indexOf(replier+': doi ') == '0'){
		text = text.substr(11).trim().replace("\\t"," ").replace(" ","\t");
		switch(true) {
		case from.match(text.substr(0, text.indexOf('\t')))!==null: benji(source,socket,clientmensi,sendTo,from+": e'u do cusku di'u lo nei si'unai");break;
		case text.substr(0, text.indexOf('\t'))==replier: benji(source,socket,clientmensi,sendTo,from+": xu do je'a jinvi lodu'u mi bebna i oi");break;
		default:
		var ds = new Date();notci.push(from + "\t" + text + ' | ' + ds.toISOString());benji(source,socket,clientmensi,sendTo,from+": mi ba benji di'u ba lo nu la'o gy."+text.substr(0, text.indexOf('\t'))+".gy. di'a cusku da");
		fs.writeFile(notcijudri, notci.join("\n"),function(err) {});break;
		}
	}
	//now send back part
		for (var l=0;l<notci.length;l++){
			//sendTo
			if (notci[l].length === 0) continue; // prevent a crash if the line is empty
			var cmenepagbu=notci[l].split("\t");//.substr(0, notci[l].indexOf('\t'));
			var sem;
			try{sem = new RegExp(cmenepagbu[1].toLowerCase(), "gim");}catch(err){var sem='';}
			if (from.match(sem)!==null)
			{
				cmenepagbu=notci[l].split("\t");
				benji(source,socket,clientmensi,sendTo,(from + ": cu'u la'o gy." + cmenepagbu[0] + ".gy.: "+cmenepagbu[2]).replace(/(.{80,120})(, |[ \.\"\/])/g,'$1$2\n'));
				notci.splice(l,1);l=l-1;
				fs.writeFile(notcijudri, notci.join("\n"));
			}
		}
		// 
		///
		switch(true) {
		case text.search(/ie( |)(nai( |)|)pei/) >= '0': benji(source,socket,clientmensi,sendTo, ext(tugni));break;
		case text.search(/\bna nelci/) >= '0': benji(source,socket,clientmensi,sendTo, ext(nelci));break;
		case text.indexOf("lmw:") == '0': lmw(text.substr(4),sendTo);break;
		case text.indexOf("nlp:") == '0': stnlp(text.substr(4),sendTo);break;
		case text.indexOf("lujvo:") == '0': benji(source,socket,clientmensi,sendTo, triz(text.substr(6)));break;
		//case text.indexOf("cipra:") == '0': text = text.substr(6);ret = extract_mode(text);benji(source,socket,clientmensi,sendTo, run_camxes(ret[0], ret[1]));break;
		case text.indexOf("exp:") == '0': text = text.substr(4).trim();ret = extract_mode(text);benji(source,socket,clientmensi,sendTo, run_camxes(ret[0], ret[1]));break;
		case text.indexOf("f:") == '0': text = text.substr(2).trim();benji(source,socket,clientmensi,sendTo, xufuhivla(text));break;
		case text.indexOf("k:") == '0': text = text.substr(2).trim();benji(source,socket,clientmensi,sendTo, run_camxes(text, 3));break;
		case text.indexOf("raw:") == '0': text = text.substr(4).trim();benji(source,socket,clientmensi,sendTo, run_camxes(text, 0));break;
		case text.indexOf("zei:") == '0': text = text.substr(4).trim();benji(source,socket,clientmensi,sendTo, zeizei(text));break;
		case text.indexOf("anji:") == '0': text = text.substr(5).trim();benji(source,socket,clientmensi,sendTo, anji(text));break;
		case text.indexOf("off:") == '0': text = text.substr(4).trim();ret = extract_mode(text);benji(source,socket,clientmensi,sendTo, run_camxesoff(ret[0], ret[1]));break;
		case text.indexOf("alta:") == '0': text = text.substr(5).trim();ret = extract_mode(text);benji(source,socket,clientmensi,sendTo, run_camxesalta(ret[0], ret[1]));break;
		case text.indexOf("yacc:") == '0': tcepru(text.substr(5),sendTo,source,socket);break;
		case text.indexOf("cowan:") == '0': tcepru(text.substr(6),sendTo,source,socket);break;
		case text.indexOf("jbofi'e:") == '0': jbofihe(text.substr(8),sendTo,source,socket);break;
		case text.indexOf("jbofihe:") == '0': jbofihe(text.substr(8),sendTo,source,socket);break;
		case text.indexOf("gerna:") == '0': jbofihe(text.substr(6),sendTo,source,socket);break;
		case text.indexOf("tersmu:") == '0': tersmu(text.substr(7),sendTo,source,socket);break;
		case (text.indexOf(replier + ': ko ningau')=='0' ||text.indexOf(replier + ': ko cnino') == '0'): setTimeout(function() {updatexmldumps(function(velruhe) {benji(source,socket,clientmensi,sendTo, 'i ba\'o jai gau cnino'); var selsre = Object.keys(velruhe.nalmulselfaho); if (selsre.length) benji(source,socket,clientmensi,sendTo, 'i na kakne lo ka jai gau cnino fai la\'e zoi zoi ' + selsre.join(' ') + ' zoi');});benji(source,socket,clientmensi,sendTo,'sei ca ca\'o jai gau cnino be fai lo pe mi sorcu');},1); break;
		case text.indexOf('guaspi:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(7),'guaspi'));break;
		case text.indexOf('frame: /full ') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(12),'en','framemulno'));break;
		case text.indexOf('frame:/full ') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(11),'en','framemulno'));break;
		case text.indexOf(prereplier+'ktn') == '0': benji(source,socket,clientmensi,sendTo, prettifylojbansentences());break;
		
		// Change default language
		case text.indexOf('bangu:') == '0': benji(source,socket,clientmensi,sendTo, bangu(text.substr(6).trim(), from));break;

		// Give definition of valsi in specified language
		case text.indexOf('?:') == '0': var inLanguage = defaultLanguage;inLanguage = RetrieveUsersLanguage(from, inLanguage);benji(source,socket,clientmensi,sendTo, vlaste(text.substr(2), inLanguage));break; // Gives definition of valsi in the default language set to user
		case text.indexOf('jbo:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(4),'jbo'));break; // Gives definition of valsi in Lojban
		case text.indexOf('en:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'en'));break; // Gives definition of valsi in English
		case text.indexOf('ru:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'ru'));break;
		case text.indexOf('es:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'es'));break;
		case text.indexOf('fr:')	== '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'fr'));break;
		case text.indexOf('fr-facile:')	== '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(10),'fr-facile'));break;
		case text.indexOf('f@:')	== '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'fr-facile'));break;
		case text.indexOf('ja:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'ja'));break;
		case text.indexOf('de:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'de'));break;
		case text.indexOf('eo:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'eo'));break;
		case text.indexOf('zh:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'zh'));break;
		case text.indexOf('sv:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'sv'));break;
		case text.indexOf('en-simple:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(10),'en-simple'));break;
//		case text.indexOf('lb:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'lb'));break;
		case text.indexOf('jb:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(3),'lb'));break;
		case text.indexOf('krasi:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(6),'krasi'));break; // Gives Lojban words etymologies
		case text.indexOf('dukti:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(6),'dukti'));break; // Gives Lojban words antonyms

		case text.indexOf('selmaho:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(8),'en','selmaho'));break;
		case text.indexOf('selma\'o:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(8),'en','selmaho'));break;
		case text.indexOf('finti:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(6),'en','finti'));break;
		case text.indexOf('rafsi:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(6),'en','raf'));break;
		case text.search("ra'oi [a-z']+ rafsi ma") == '0': var reg = /ra'oi ([a-z']+) rafsi ma/;var mat=reg.exec(text);benji(source,socket,clientmensi,sendTo, vlaste(mat[1],'en','raf'));break;
		case text.indexOf('toki:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(5),'toki'));break;
		case text.indexOf('laadan:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(7),'laadan'));break;
		case text.indexOf('loglan:') == '0': benji(source,socket,clientmensi,sendTo, vlaste(text.substr(7),'loglan'));break;
		case text.indexOf('gloss:') == '0': benji(source,socket,clientmensi,sendTo, gloso(text.substr(6),'en'));break;
		case text.indexOf('loi:') == '0': benji(source,socket,clientmensi,sendTo, loglo(text.substr(4),''));break;
		case text.indexOf('coi:') == '0': benji(source,socket,clientmensi,sendTo, loglo(text.substr(4),'coi'));break;
		case text.indexOf(prereplier + 'mhnt ') == '0': ningaumahantufa(text.substr(12),socket);break;
		case text.indexOf(prereplier + "tatoget") == '0': tatoget();break;
		case text==replier+': ii': benji(source,socket,clientmensi,sendTo, io());break;
		case text==replier+': help': benji(source,socket,clientmensi,sendTo, sidju());break;
		case text==replier+': labangu': benji(source,socket,clientmensi,sendTo, labangu());break;
		case text.indexOf("rot13:") == '0': benji(source,socket,clientmensi,sendTo, rotpaci(text.substr(6)));break;
		case text.indexOf(prereplier + 'r ') == '0': benji(source,socket,clientmensi,sendTo, rusko(text.substr(prereplier.length+1).trim()));break;
		case text.indexOf(prereplier + 'gadri') == '0': benji(source,socket,clientmensi,sendTo, 'lo [PA] broda = zo\'e noi ke\'a broda [gi\'e zilkancu li PA lo broda]\nla [PA] broda = zo\'e noi lu [PA] broda li\'u cmene ke\'a mi\nlo PA sumti = lo PA me sumti\nla PA sumti = zo\'e noi lu PA sumti li\'u cmene ke\'a mi\nloi [PA] broda = lo gunma be lo [PA] broda\nlai [PA] broda = lo gunma be la [PA] broda\nloi PA sumti = lo gunma be lo PA sumti\nlai PA sumti = lo gunma be la PA sumti\nlo\'i [PA] broda = lo selcmi be lo [PA] broda\nla\'i [PA] broda = lo selcmi be la [PA] broda\nlo\'i PA sumti = lo selcmi be lo PA sumti\nla\'i PA sumti = lo selcmi be la PA sumti\nPA sumti = PA da poi ke\'a me sumti\nPA broda = PA da poi broda\npiPA sumti = lo piPA si\'e be pa me sumti');break;
		case text.indexOf(prereplier + 'j ') == '0': benji(source,socket,clientmensi,sendTo, jbopomofo(text.substr(prereplier.length+1).trim()));break;
		case text.indexOf('Tatoeba:') == '0': benji(source,socket,clientmensi,sendTo, sisku(text.substr(8).trim()));break;
		case text.indexOf(prereplier) == '0': text = text.substr(prereplier.length+1).trim();benji(source,socket,clientmensi,sendTo, mensimikce(text));break;
	/* 	case text.indexOf(prereplier + 'mi retsku') == '0' && from==asker: benji(source,socket,clientmensi,sendTo, preasker+ext(jee)+' ' + ext(pendo));break;
		case text.indexOf(prereplier + 'xu do') == '0': 
		case text.indexOf(prereplier + 'do') == '0': setTimeout(function() {benji(source,socket,clientmensi,sendTo, from + mireturn());}, interm );break;
		case text.indexOf(prereplier + 'mi retsku') < 0 && text.indexOf(prereplier + 'mi') == '0': setTimeout(function() {benji(source,socket,clientmensi,sendTo, from + doreturn());}, interm );break;
		case text.indexOf(prereplier + 'sei mi kucli') == '0' && from==asker: setTimeout(function() {benji(source,socket,clientmensi,sendTo, preasker + ext(nadjuno));}, interm );break;
		case text.indexOf(prereplier + 'zmiku') >= 0 && from==asker: text.indexOf(prereplier + 'zmiku') >= 0 && from==asker;break;
 	case text.indexOf(prereplier + 'u\'i') == '0' && from==asker: setTimeout(function() {benji(source,socket,clientmensi,sendTo, preasker + ext(nagendra));}, interm );break;
 	case text.indexOf(prereplier + 'xu') == '0' && from!==asker: setTimeout(function() {benji(source,socket,clientmensi,sendTo, from + ': ' + ext(mizmiku));}, interm );break;
 	case text.indexOf(prereplier) == '0' && text.indexOf(prereplier + 'xu') !== '0' && from!==asker: setTimeout(function() {benji(source,socket,clientmensi,sendTo, tato.tatoebaprocessing(from));}, interm );break;
 	case text.indexOf("doi " + replier) >-1 && from!==asker: setTimeout(function() {benji(source,socket,clientmensi,sendTo, tato.tatoebaprocessing(from));}, interm );break;*/
  	}



  }
};

    /*if (text.indexOf(prereplier + 'mi retsku') < 0 && from==asker && text.indexOf(prereplier + 'mi') == '0') {
      benji(source,socket,clientmensi,sendTo, preasker + ext(reply));
    }*/
    /*if (text.indexOf("gleki: ") == '0' && from==asker) {
      	setTimeout(function() {benji(source,socket,clientmensi,sendTo, preasker + 'la gleki ' + ext(natirna));}, interm );
    }*/
    
var mireturn = function ()
{
s="";
while (s.substr(0, 5) !== ": mi "){
s=tato.tatoebaprocessing("");
}
return s;
};

var doreturn = function ()
{
s="";
while (s.substr(0, 5) !== ": do "){
s=tato.tatoebaprocessing("");
}
return s;
};

var sisku = function (lin)
{
s="";
i=0;
while (s.indexOf(lin) <0 && i<20000){
s=tato.tatoebaprocessing();
i++;//in case we found nothing exit
}
if (s==="" && i<20000){s=": e'u do sisku tu'a lo nalkunti uenzi";}
if (i>=20000){s="no da se tolcri";}
return s;
};

var jbopomofo = function (lin)
{
 var inputlength = lin.length;
 input = lin.toLowerCase();
 var jbopotext = "";
 for (i = 0; i < inputlength; i++) {
 var character = lin.charAt(i);

 switch(character) {
 case 'a': jbopotext+="ㄚ";break;
 case 'e': jbopotext+="ㄜ";break;
 case 'i': jbopotext+="ㄧ";break;
 case 'o': jbopotext+="ㄛ";break;
 case 'u': jbopotext+="ㄨ";break;
 case 'y': jbopotext+="ㄩ";break;
 case 'f': jbopotext+="ㄈ";break;
 case 'v': jbopotext+="ㄑ";break;
 case 'x': jbopotext+="ㄏ";break;
 case 's': jbopotext+="ㄙ";break;
 case 'z': jbopotext+="ㄗ";break;
 case 'c': jbopotext+="ㄕ";break;
 case 'j': jbopotext+="ㄓ";break;
 case 'p': jbopotext+="ㄆ";break;
 case 'b': jbopotext+="ㄅ";break;
 case 't': jbopotext+="ㄊ";break;
 case 'd': jbopotext+="ㄉ";break;
 case 'k': jbopotext+="ㄎ";break;
 case 'g': jbopotext+="ㄍ";break;
 case 'l': jbopotext+="ㄌ";break;
 case 'r': jbopotext+="ㄖ";break;
 case 'm': jbopotext+="ㄇ";break;
 case 'n': jbopotext+="ㄋ";break;
 case '`': jbopotext+="¯";break;
 case '.': jbopotext+="·";break;
 case "'": jbopotext+="、";break;
 case ',': jbopotext+="〜";break;
 case ' ': jbopotext+=" ";break;
}
}
return jbopotext;
};

var rusko = function (lin)
{
 var inputlength = lin.length;
 input = lin.toLowerCase();
 var jbopotext = "";
 for (i = 0; i < inputlength; i++) {
 var character = input.charAt(i);

 switch(character) {
 case 'a': jbopotext+="а";break;
 case 'e': jbopotext+="э";break;
 case 'i': jbopotext+="и";break;
 case 'o': jbopotext+="о";break;
 case 'u': jbopotext+="у";break;
 case 'y': jbopotext+="ы";break;
 case 'f': jbopotext+="ф";break;
 case 'v': jbopotext+="в";break;
 case 'x': jbopotext+="х";break;
 case 's': jbopotext+="с";break;
 case 'z': jbopotext+="з";break;
 case 'c': jbopotext+="ш";break;
 case 'j': jbopotext+="ж";break;
 case 'p': jbopotext+="п";break;
 case 'b': jbopotext+="б";break;
 case 't': jbopotext+="т";break;
 case 'd': jbopotext+="д";break;
 case 'k': jbopotext+="к";break;
 case 'g': jbopotext+="г";break;
 case 'l': jbopotext+="л";break;
 case 'r': jbopotext+="р";break;
 case 'm': jbopotext+="м";break;
 case 'n': jbopotext+="н";break;
 case '`': jbopotext+="`";break;
 case '.': jbopotext+=".";break;
 case "'": jbopotext+="'";break;
 case ',': jbopotext+=",";break;
 case ' ': jbopotext+=" ";break;
}
}
return jbopotext;
};

var bangu = function (lng, username)
{
	var ret = "";
	lng=lng.trim().toLowerCase();
	if(lng.length > 100)
	{
		// small data overflow protection
		return ret;
	}
	if(typeof userSettings[username] === "undefined")
	{
		userSettings[username] = {};
	}
	userSettings[username].language = lng;
	switch (lng)
	{
		// ME(speaking in third person) isn't implemented in irc.js
		case "lv":
			ret = "Es ar '" + username + "' turpmāk runāšu latviešu valodā.";
			break;
		case "en":
			ret = "I will speak to '" + username + "' in English from now on.";
			break;
		default:
			ret = "I will speak to '" + username + "' in '" + lng.toUpperCase() + "' from now on."; // TODO: translate to lojban
			break;
	}
	updateUserSettings();
	return ret;
};

var RetrieveUsersLanguage = function (username, lng)
{
	if(
		(
			typeof userSettings[username] === "undefined"
			|| typeof userSettings[username].language === "undefined"
		)
	)
	{
		if(typeof lng === "undefined")
		{
			return defaultLanguage;
		}
		return lng;
	}

	return userSettings[username].language;
};

var vlaste = function (lin,lng,raf)
{
var cmalu;
if (lin.indexOf(" ")===0){cmalu=true;}
lin=lin.toLowerCase().trim();
var ret;
	switch(true) {
		case lin.substr(0,5).trim()=="/full": ret=mulno(lin.substr(6).trim(),lng);break;
		case lin.substr(0,6).trim()=="/valsi": ret=valsicmene(lin.substr(7).trim(),lng);break;
		case raf=='raf': ret=rafsi(lin.replace(/[^a-z'\.]/g,''));break;
		case raf=='selmaho': ret=selmaho(lin.replace(/[^a-z'\.\*0-9]/g,''));break;
		case raf=='finti': ret=finti(lin.replace(/[^a-z'\.\*0-9]/g,''));break;
		case raf=='frame': ret=frame(lin.replace(/[^a-z_'\.]/g,''));break;
		case raf=='framemulno': ret=framemulno(lin.replace(/[^a-z_'\.]/g,''));break;
		default:
			if(raf==='passive')
			{ret=tordu(lin.replace(/\"/g,''), lng, raf,"",cmalu);break;}
			else{ret=tordu(lin.replace(/\"/g,''), lng,"","",cmalu);break;}
	}
return ret.replace(/(.{80,120})(, |[ \.\"\/])/g,'$1$2\n');
};


var tordu = function (lin,lng,flag,xmlDoc,cmalu)
{
	lin=lin.replace(/\"/g,'');
	if (flag!==1){
		if (lng==="en")
		{
			xmlDoc=xmlDocEn;
		}
		else
		{
			var xmlPath = path.join(__dirname,"dumps",lng + ".xml");
			var errorMessage = 'Dictionary for the desired "' + lng + '" language does not exist.'; //TODO: Translate to Lojban
			if(!fs.existsSync(xmlPath))
			{
				if(flag === 'passive')
				{
					console.log(errorMessage);
					return '';
				}
				return errorMessage;
			}
			xmlDoc = libxmljs.parseXml(fs.readFileSync(xmlPath,{encoding: 'utf8'}));
		}
	}

var gchild='';
	try{gchild +='[' + xmlDoc.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/selmaho[1]").text()+'] ';}catch(err){}
	try{gchild += xmlDoc.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/definition[1]").text();}catch(err){}
	if (cmalu===true){try{gchild +=' |>>> ' + xmlDoc.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/notes[1]").text();}catch(err){}
try{gchild +=' |>>> ' + xmlDoc.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/user[1]/username[1]").text();}catch(err){}}
if (gchild===''){
	if (flag!==1){
		if (xulujvo(lin)===true){
			var f=triz(katna(lin,lng,1,xmlDoc),1,lng,xmlDoc);
			if (f!==''){
				lin= f;
			}else{
				//var start = new Date().getTime();
				lin= "[< "+katna(lin,lng,'',xmlDoc)+"] "+mulno(lin,lng,xmlDoc);
				//var end = new Date().getTime();var time = end - start;
			}
		}else{
			lin= mulno(lin,lng,xmlDoc);
		}
	}else{
		lin= '';
	}
}else{
	gchild=gchild.replace(/[\{\}_\$]/igm,"").replace(/`/g,"'").substring(0,700);
		if (gchild.length>=700){
			gchild+='...\n[mo\'u se katna] http://jbovlaste.lojban.org/dict/'+ lin;
		}
		if (xulujvo(lin)===true){
			lin+=" [< "+katna(lin,lng,'',xmlDoc)+"]";
		}
		lin= lin + " = " + gchild;
}
ljv='';
return lin.replace(/&quot;/g,"'");
};

var mulno = function (lin,lng,xmlDoc)
{
lin=lin.replace(/\"/g,'');var xo;
if (typeof xmlDoc==="undefined"){
	if (lng==="en"){xmlDoc=xmlDocEn;}else{xmlDoc = libxmljs.parseXml(fs.readFileSync(path.join(__dirname,"dumps",lng + ".xml"),{encoding: 'utf8'}));}
}
	
var stra=[];var i;
var coun = xmlDoc.find("/dictionary/direction[1]/valsi[(translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\")]");
	if(typeof coun!=='undefined'){for (i=0;i<coun.length;i++){stra.push(coun[i].attr("word").value());}}
coun = xmlDoc.find("/dictionary/direction[1]/valsi[contains(translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\")]");
	if(typeof coun!=='undefined'){for (i=0;i<coun.length;i++){stra.push(coun[i].attr("word").value());}}
coun = xmlDoc.find("/dictionary/direction[1]/valsi[(translate(./glossword/@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\") or (translate(./Engl,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\")]");
	if(typeof coun!=='undefined'){for (i=0;i<coun.length;i++){stra.push(coun[i].attr("word").value());}}
coun = xmlDoc.find("/dictionary/direction[1]/valsi[contains(translate(./glossword/@word,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\") or contains(translate(./Engl,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\")]");
	if(typeof coun!=='undefined'){for (i=0;i<coun.length;i++){stra.push(coun[i].attr("word").value());}}
coun = xmlDoc.find("/dictionary/direction[1]/valsi[contains(translate(./definition,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\") or contains(translate(./notes,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\")]");
	if(typeof coun!=='undefined'){for (i=0;i<coun.length;i++){stra.push(coun[i].attr("word").value());}}

stra=stra.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);

xo=stra.length;
try{stra.splice(80);}catch(err){}
if (stra.length>=80){stra.push("...");}
var gag=stra.join(", ").trim();
if (stra.length==1){gag = tordu(gag,lng);}
if (stra.length>1){gag = xo + " da se tolcri: " + gag;}
if(gag===''){gag='lo nu mulno sisku zo\'u: y no da se tolcri';if (ljv!==''){gag+= "\n" + ljv;}}
return gag;
};

var selmaho = function (lin)
{
var gag='';var ien='';
var coun = xmlDocEn.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/selmaho[1]");
if (typeof coun!=='undefined'){
	ien='.i lu ' + lin + ' li\'u cmavo zo\'oi ' + coun.text();
	var cll= require('./cll.js');
	var cllarr = cll.cllk()[coun.text()];
	if (typeof cllarr !== 'undefined'){ien+= "\n" + cllarr.replace(/ /g,"\n")}
}
	try{var ali = xmlDocEn.find("/dictionary/direction[1]/valsi[starts-with(translate(./selmaho,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\")]");
	var stra=[];
	for (var i=0;i<ali.length;i++)
	{
		stra.push(ali[i].attr("word").value());
	}	
	gag=stra.join(", ").trim();
	//if (stra.length==1){gag = gag + ' = ' + tordu(gag,lng);}
	}catch(err){}
switch(true){
case (ien!=='') && (gag !==''): gag=ien.concat("\ncmavo: ").concat(gag);break;
case (ien==='') && (gag !==''): gag="cmavo: " + gag;break;
case (ien!=='') && (gag ===''): gag=ien;break;
case (ien==='') && (gag ===''): gag='y no da se tolcri';break;
}
return gag;
};

var rafsi = function (lin)
{
var gag;
var coun = xmlDocEn.find("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/rafsi/text()[1]");//official
try{
	var s=xmlDocEn.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/notes[1]").text();
	var tmp=s.replace(/^.*?-([a-z']+)-.*/,'$1');
	if (tmp!==s){coun.push(tmp);}
	}catch(err){}//search in notes
if (lin.substr(0,4)!=='brod' & xugismu(lin)===true){coun.push(lin.substr(0,4));}//long rafsi
if (coun.length!==0){coun= coun.join (' .e zo\'oi ');}else{coun='';}
if (coun.length!==0){coun='zo\'oi ' + coun + ' rafsi zo ' + lin;}

var rev = xmlDocEn.get("/dictionary/direction[1]/valsi[rafsi=\""+lin+"\"]");
//now try -raf- in notes
if (typeof rev==='undefined'){rev =  xmlDocEn.get("/dictionary/direction[1]/valsi[contains(translate(./notes,\""+lin.toUpperCase()+"\",\""+lin+"\"),\" -"+lin+"-\")]");}
//now try to add a vowel:
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"a\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"e\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"i\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"o\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"u\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}

if (typeof rev!=='undefined' && rev.attr("word").value()!==lin){rev='zo ' + rev.attr("word").value() + ' se rafsi zo\'oi '+lin;}else{rev='';}
switch(true){
case (coun!=='') && (rev !==''): gag=coun.concat(" .i ").concat(rev);break;
case (coun==='') && (rev !==''): gag=rev;break;
case (coun!=='') && (rev ===''): gag=coun;break;
case (coun==='') && (rev ===''): gag='y no da se tolcri';break;
}
return gag;
};

var io = function ()
{
return '.ii';
};

var sidju=function(){
var sidj = {
	en: 'Parsers: type "exp:" (experimental), "off:" (camxes), "gerna:" (jbofi\'e), or "yacc:" (official yacc) followed by the text to show the structure of sentences.\n' +
		'Lojban dictionary: type "language-code: word", where language code is one of jbo,en,ru,es,fr,f@,ja,de,eo,zh,hu,sv. This searches in both directions.\n' +
		'    Type "language-code:word" (i.e. without a space after ":") to get a shorter definition.\n' +
		'    "selmaho: ca\'a" gives "CAhA", "selmaho: CAhA" gives "bi\'ai, ca\'a, ..."\n' +
		'    "rafsi: kulnu" gives "klu", "rafsi: klu" gives "kulnu"\n' +
		'Other conlang dictionaries: "toki:", "laadan:", "loglan:"\n' +
		'Lojban <-> Loglan conversion (incomplete): "coi:", "loi:"\n' +
		'"Tatoeba: klama" gets a random example sentence using "klama"\n' +
		'Delayed messaging: type "' + replier + ': doi user message" to send "message" to "user" when they return',
};
	return sidj.en;
};

var frame = function (lin)
{
var lng="en",gag='';
var arrf=fs.readdirSync(path.join(__dirname,fram)).filter(function(file) { return file.substr(-4) === '.xml'; });

for (var i=0;i<arrf.length;i++)
{
	var xmlDoc = libxmljs.parseXml(fs.readFileSync(path.join(__dirname,fram,arrf[i]),{encoding: 'utf8'}).replace(/xmlns=\"/g,'mlns=\"'));
	var si = xmlDoc.get("/frame[translate(@name,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/definition[1]/text()");
	if (typeof si !=='undefined'){gag= si.toString().replace(/&lt;.*?&gt;/g,'');
	si = xmlDoc.find("/frame[translate(@name,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/FE[@coreType=\"Core\"]/definition/text()");
	if (typeof si !=='undefined'){gag= gag + "\n| >>> te sumti: " + si.join("\n| >>> te sumti: ").replace(/&lt;.*?&gt;/g,'');}
	break;}
}

if (gag!==''){return gag;}else{return 'no da se tolcri'}
};

var framemulno = function (lin)
{
var lng="en",gag='';
var arrf=fs.readdirSync(path.join(__dirname,fram)).filter(function(file) { return file.substr(-4) === '.xml'; });
var stra=[];

for (var i=0;i<arrf.length;i++)
{
	var xmlDoc = libxmljs.parseXml(fs.readFileSync(path.join(__dirname,fram,arrf[i]),{encoding: 'utf8'}).replace(/xmlns=\"/g,'mlns=\"'));
	var si = xmlDoc.get("/frame[contains(translate(./definition,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\")]");
		if (typeof si !=='undefined'){
			stra.push(si.attr("name").value());
		}
}
	try{stra.splice(40);}catch(err){}
	if (stra.length>=40){stra.push("...");}
	gag=stra.join(", ").trim();
	if (stra.length==1){gag = frame(stra[0]);}
	if (gag!==''){return gag;}else{return 'no da se tolcri'}
return gag;
};

var loglo=function(lin,direction)
{
lin=lin.toLowerCase();
var logl= require('./loglan.js');
var items = logl.loglandic();
	var i,myregexp,j;
	//now the function itself
	try{
		if(direction!=='coi'){
			//from lojban to loglan
			lin=run_camxes(lin.replace(/[^a-z'\. ]/g,''),5).replace(/[^a-z'\. ]/g,'').trim().split(" ");
			for (i=0;i<items.length;i++)
			{
			myregexp = new RegExp("^"+items[i][0]+"$", "gm");
			for (j=0;j<lin.length;j++){
				if (lin[j].match(myregexp)!==null){
					lin[j]=items[i][1].replace(/ /gm,"A ").replace(/$/gm,"A");
				}
			}
			}
			lin=lin.join(" ").replace(/ /gm,"* ").replace(/$/gm,"*").replace(/A\*/gm,"").replace(/A$/gm,"");
		}else
		{
			lin=lin.replace(/[^a-z', ]/g,'').replace(/\./g,' ').replace(/ +/g,' ').trim().split(" ");
			for (i=0;i<items.length;i++)
			{
			myregexp = new RegExp("^"+items[i][1]+"$", "gm");
			for (j=0;j<lin.length;j++){
				if (lin[j].match(myregexp)!==null){
					lin[j]=items[i][0].replace(/ /gm,"A ").replace(/$/gm,"A");
				}
			}
		}
		lin=lin.join(" ").replace(/ /gm,"* ").replace(/$/gm,"*").replace(/A\*/gm,"").replace(/A$/gm,"");
	}
}catch(err){lin='O_0';}
	return lin.replace(/(.{80,120})(, |[ \.\"\/])/g,'$1$2\n').trim();
};

var finti = function (lin)
{
lin=lin.replace(/\"/g,'');
var retur='y no da se tolcri';
var coun = xmlDocEn.find("/dictionary/direction[1]/valsi[contains(translate(./user/username,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\")]");
var stra=[];
	for (var i=0;i<coun.length;i++)
	{
		stra.push(coun[i].attr("word").value());
	}
var cnt=stra.length;
try{stra.splice(30);}catch(err){}
if (stra.length>=30){stra.push("...");}
var gag=stra.join(", ").trim();
if (stra.length==1){gag = tordu(gag,lng);}
if (stra.length>1){gag = cnt + " da se tolcri: " + gag;}
if(gag===''){gag='y no da se tolcri';}
return gag;
};


var gloso=function(lin,lng,check,xmlDoc)
{
//var lng="en";
lin=lin.replace(/\"/g,'');
if (typeof xmlDoc==='undefined'){
	if (lng==="en"){xmlDoc=xmlDocEn;}else{xmlDoc = libxmljs.parseXml(fs.readFileSync(path.join(__dirname,"dumps",lng + ".xml"),{encoding: 'utf8'}));}
}
var retur='y no da se tolcri';
var items = [
	["lo","a(n)"],["le","the"],["la","@@@"],["nu","event-of"],["zo","the-word:"],["coi","hello"],["co'o","goodbye"],["ro","each-of"],["ma","what"],["mo","is-what"],
	["na","not"],["na'e","not"],["nai","-not"],["nelci","fond-of"],["ka","being"],["tu'a","about"],
	["ie","yeah"],["e'u","I-suggest"],
	["e","and"],["enai","and-not"],["a","and/or"],
	["jenai","and-not"],["je","and"],["ja","and/or"],
	["gi'e",",-and"],["gi'a",",-and/or"],
	["bu'u","at"],["ca","at-present"],
	["ku",","],
	["zo'u",":"],
	["pe","that-is-related-to"],
	["za'a","as-I-ca-see"],["za'adai","as-you-can-see"],["pu","in-past"],["ba","in-future"],["vau","]"],["doi","oh"],["uinai","unfortunately"],["u'u","sorry"],
	["ko","do-it-so-that-you"],["poi","that"],["noi",",which"],["me","among"],
	//["bakni","is-a-cow"],
	["mlatu@n","cat"],["dansu@n","dancer(s)"],["klama@n","comer"],
	["slabu","is-familiar-to"],["dansu","dance(s)"],["mlatu","is-a-cat"],["klama","come(s)"],
	["pe'i","in-my-opinion"],["ui","yay"],["uinai","unfortunately"],
	["ju","whether-or-not"],["gu","whether-or-not"],["gi'u","whether-or-not"],["u","whether-or-not"],
	["xu","is-it-true-that"],["xunai","isnt-it-so-that"],["ka'e","possibly-can"],
	["re'u","time"],["roi","times"],
	["pa'o","through"],["co'a","become"],
	["mi","me"]//dont copy
	];
var itemsu = [//universal glosses
	["lu","<"],["li'u",">"],["i","."],["bo","-|-"],["sai","!"],["cai","!!!"],["na'e","!"],["da","X"],["de","Y"],["di","Z"],["cu",":"],["jo","⇔"],
	["fa","(1:)"],["fe","(2:)"],["fi","(3:)"],["fo","(4:)"],["fu","(5:)"],
	["ba'e", "(NB!=>)"],
	["na","!"]];
lin=lin.toLowerCase();
	var i,myregexp,j;
	try{
		//from lojban to gloso
		
		if (check!==1){lin=run_camxesalta(lin.replace(/[^a-z'\. ]/g,''),2).replace(/h/g,"H").replace(/NF/g,"@nf").replace(/\bKU\b/g,"@ku").replace(/[^a-z@'\. ]/g,'').replace(/ {2,}/g," ").replace(/ ([nd]ai)( |$)/img,"$1$2").replace(/ @nf @ku\b/g,"@n").replace(/ @nf\b/g,"").trim();}
		console.log(lin);
		lin=lin.split(" ");
		for (i=0;i<lin.length;i++){
		//if (xucmavo(lin[i])===true & check===1){}else{
					if (lng==='en'){//items are only for English. Think of some universal items.
					for (j=0;j<items.length;j++){
						myregexp = new RegExp("^"+items[j][0]+"$", "gim");
						if (lin[i].match(myregexp)!==null){
								lin[i]=items[j][1].replace(/$/gm,"%%%");
						}
						else if(lin[i].replace(/@n$/,"").match(myregexp)!==null){//if noun not found
								lin[i]=items[j][1].replace(/$/gm,"%%%");
						}
					}
					}
					for (j=0;j<itemsu.length;j++){//universal items, actually should use them later
						myregexp = new RegExp("^"+itemsu[j][0]+"$", "gim");
						if (lin[i].match(myregexp)!==null){
								lin[i]=itemsu[j][1].replace(/$/gm,"%%%");
						}
					}
					lin[i]=lin[i].replace(/@n$/,"");
			var cnt = xmlDoc.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin[i].toUpperCase()+"\",\""+lin[i]+"\")=\""+lin[i]+"\"]/glossword[1]");
			if (typeof cnt==='undefined'){cnt = xmlDoc.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin[i].toUpperCase()+"\",\""+lin[i]+"\")=\""+lin[i]+"\"]/keyword[@place=\"1\"]");}//try keyword
			if (typeof cnt!=='undefined'){lin[i]=cnt.attr("word").value().replace(/ /gm,"-").replace(/$/gm,"%%%");}
		}
		//}
		lin=lin.join(" ").replace(/ /gm,"* ").replace(/$/gm,"*").replace(/%%%\*/gm,"");
		lin=lin.replace(/(@@@ .)/ig,function(v) { return v.toUpperCase(); }).replace(/@@@/ig,'');//uppercase for {la}
		lin=lin.replace(/,+ *\./g,'.');
		lin=lin.replace(/(^.)/ig,function(v) { return v.toUpperCase(); }).replace(/ +/ig,' ').replace(/( \. *[^ ])/ig,function(v) { return v.toUpperCase(); }).replace(/ \./ig,'.');//punctuation prettification
		lin=lin.replace(/-/g,' ');
		lin=lin.replace(/ *(:|,)/g,'$1');
		lin=lin.replace(/\*\*/g,'*');
	}catch(err){lin='O_0';}
	return lin;
};

var valsicmene = function (lin,lng)
{
lin=lin.replace(/\"/g,'');var xo;
var retur='y no da se tolcri';
var xmlDoc;
if (lng==="en"){xmlDoc=xmlDocEn;}else{xmlDoc= libxmljs.parseXml(fs.readFileSync(path.join(__dirname,"dumps",lng + ".xml"),{encoding: 'utf8'}));}
var coun = xmlDoc.find("/dictionary/direction[1]/valsi[contains(translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\"),\""+lin+"\")]");
var stra=[];
	for (var i=0;i<coun.length;i++)
	{
		stra.push(coun[i].attr("word").value());
	}
xo=stra.length;
try{stra.splice(30);}catch(err){}
if (stra.length>=30){stra.push("...");}
var gag=stra.join(", ").trim();
if (stra.length==1){gag = tordu(gag,lng);}
if (stra.length>1){gag = xo + " da se tolcri: " + gag;}
if(gag===''){gag='y no da se tolcri';}
return gag;
};

var lujvosplit = function (lin,lng)
{
var gag='';
try{
lin = camxes_pre.preprocessing(lin);
gag=camxes.parse(lin,'lujvo')}catch(e){}
return gag;
};

var rotpaci = function (lin)
{
return lin.trim().replace(/[a-zA-Z]/g,function(c){return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);});
};

//Stanford NLP
//var StanfordSimpleNLP = require('stanford-simple-nlp');
//var stanfordSimpleNLP = new StanfordSimpleNLP.StanfordSimpleNLP();
//stanfordSimpleNLP.loadPipelineSync();

var stnlp = function(lin,sendTo)
{
	stanfordSimpleNLP.process(lin, function(err, result) {
		benji(source,socket,clientmensi,sendTo, JSON.stringify(result));
		});
};

// LUJVO CONSTRUCTOR PART
var C="("+"[bcdfgjklmnprstvxz]"+")";
var V="("+"[aeiou]"+")";
var Vy="("+"[aeiouy]"+")";
var CC="("+"[bcfgkmpsvx][lr]|[td]r|[cs][pftkmn]|[jz][bvdgm]|t[cs]|d[jz]"+")";
var C_C="("+"[bdgjvzcfkpstx][lrmn]|[lrn][bdgjvzcfkpstx]|b[dgjvz]|d[bgjvz]|g[bdjvz]|j[bdgv]|v[bdgjz]|z[bdgv]|c[fkpt]|f[ckpstx]|k[cfpst]|p[cfkstx]|s[fkptx]|t[cfkpsx]|x[fpst]|l[rmn]|r[lmn]|m[lrnbdgjvcfkpstx]|n[lrm]"+")";
var CxC="("+"[lmnr][bcdfgjkpstvx]|l[mnrz]|mn|n[lmrz]|r[lmnz]|b[dgjmnvz]|d[bglmnv]|g[bdjmnvz]|[jz][lnr]|v[bdgjmnz]|f[ckmnpstx]|k[cfmnpst]|p[cfkmnstx]|sx|t[fklmnpx]|x[fmnpst]"+")";
var CyC="("+"("+C+")\\2|[bdgjvz][cfkpstx]|[cfkpstx][bdgjvz]|[cjsz]{2,2}|[ck]x|x[ck]|mz"+")";
var CCV="("+CC+V+")";
var CVV="("+C+"(?:ai|au|ei|oi|"+V+"'"+V+")"+")";
var CVC="("+C+V+C+")";
var gism="("+CC+V+C+"|"+C+V+C_C+")";

var xugismu = function (inp){
	var myreg = new RegExp("^"+gism+V+"$", "gm");
	if((inp.match(myreg)||[]).length==1){return true;}else{return false;}
};

var xucmavo = function (inp){
	var myreg = new RegExp("^("+CVV+"|(?:(?:"+C+"|[iu])?"+V+"y)(?:'(?:"+V+"y|ai|au|ei|oi))*)$", "gm");
	if((inp.match(myreg)||[]).length==1){return true;}else{return false;}
};

var xulujvo = function (inp){
	var myreg = new RegExp("^"+CVV+CCV+"$|^(?:"+CVV+"(?:r(?!r)|n(?=r))|"+CCV+"|"+CVC+"y?|"+gism+"y)(?:"+CVV+"|"+CCV+"|"+CVC+"y?|"+gism+"y)*(?:"+CVV+"|"+CCV+"|"+gism+V+")$", "gm");
	if((inp.match(myreg)||[]).length==1){return true;}else{return false;}
};
var xufuhivla = function (inp){
	if (run_camxes(inp, 3).toString().substr(0,7)==="(CU [Z:"){return true;}else{return false;}
};
//now split
var jvokatna = function (lujvoi){
	var tmp;
	tmp=lujvoi.toLowerCase().replace(/[^a-z']/img,"");
	var myregexp = new RegExp("^("+CVV+")[rn]", "gm");
	var myregexpi = new RegExp("("+gism+V+"$|"+gism+"(?=y)|" + CVV + "|" +CCV + "|" + CVC + ")","g");
	tmp=tmp.replace(myregexp,"$1 ");
	tmp=tmp.replace(myregexpi,"$1 ");
	tmp=tmp.replace(/y/g," ");
	tmp=tmp.replace(/ +/g," ");
return tmp.trim();
};
var rafyjongau = function (raf){//join given rafsi into a lujvo
	var lujvo='';
	var out;
	if (raf.length<2){out='mo\'a rafsi cu sumti';}
	var lihenraf='';
	for (var i=0; i<raf.length;i++){
		var my = new RegExp("^"+gism+"$", "gm");
		if ((raf[i].match(my)||[]).length===1 && i!=raf.length-1){
			raf[i]=raf[i]+'y';
		}
		if (lihenraf!==''){
			var pa=lihenraf.substr(lihenraf.length-1);
			var re=raf[i].substr(0,1);
			var pare=pa+re;
			my = new RegExp("^"+CyC+"$", "gm");
			if (pare.match(my)){raf[i]='y'+raf[i];}
			if (pa=="n" && (raf[i].match(/^(?:d[jz]|t[cs])/)!==null)){raf[i]='y'+raf[i];}
		}else
		{
			my = new RegExp("^"+CVV+"$", "gm");
			var myt = new RegExp("^"+CCV+"$", "gm");
			if ((raf[i].match(my)||[]).length===1 && (raf.length>2 || ((raf[1].match(myt)||[]).length===0))){
				if (raf[1].substr(0,1)=='r'){raf[i]=raf[i]+'n';}else{raf[i]=raf[i]+'r';}
			}
		}
		lihenraf=raf[i];
		lujvo=lujvo+raf[i];
		
	}
	
	// tosmabru test
	var myg = new RegExp("^("+CVC+"+)(?:("+C+")"+V+CC+V+"|("+C+")"+V+C+"y.+)$","m");
	if (lujvo.match(myg)!==null){
		//If there aren't at least two CVCs before a 'y', no hyphen is needed.
		var pre=lujvo.match(myg)[1];
		var next;if (typeof lujvo.match(myg)[7]!=='undefined'){next=lujvo.match(myg)[7];}else{next=lujvo.match(myg)[12];}
		next=pre.substr(pre.length-1) + next;
		myg = new RegExp(CxC,"gm");
		var myrg = new RegExp(CC,"");
		if (pre.match(myg)===null && next.match(myrg)!==null){myrg= new RegExp("("+C+")("+C+")","m");lujvo=lujvo.replace(myrg,"$1y$3")}
	}
	return lujvo;
};

var jvomre = function (int){
//lujvo scorer
// Remember, the goal is to get as low a score as possible.
var lujvo = int;
var l = lujvo.length;
var a=(lujvo.match(/'/gm)||[]).length;
var h=(lujvo.match(/[yY]/gm)||[]).length;
var reg=new RegExp("^"+CVV+"[rn]"+C,"g");
h=h+(lujvo.match(reg)||[]).length;
var r = 0;
var ar=jvokatna(lujvo).split(" ");
for (var i=0;i<ar.length;i++)
{
reg = new RegExp ("^"+C+V+C+C+V+"$","g"); if (ar[i].match(reg)!==null){ r += 1;}
reg = new RegExp ("^"+C+V+C+C+"$","g"); if (ar[i].match(reg)!==null){ r += 2;}
reg = new RegExp ("^"+CC+V+C+V+"$","g"); if (ar[i].match(reg)!==null){ r += 3;}
reg = new RegExp ("^"+CC+V+C+"$","g"); if (ar[i].match(reg)!==null){ r += 4;}
reg = new RegExp ("^"+CVC+"$","g"); if (ar[i].match(reg)!==null){ r += 5;}
reg = new RegExp ("^"+C+V+"'"+V+"$","g"); if (ar[i].match(reg)!==null){ r += 6;}
reg = new RegExp ("^"+CCV+"$","g"); if (ar[i].match(reg)!==null){ r += 7;}
reg = new RegExp ("^"+C + "(?:[aeo]i|au)$","g"); if (ar[i].match(reg)!==null){ r += 8;}
}
vowels=(lujvo.match(/[aeiouAEIOU]/gm)||[]).length;
return (1000 * l) - (500 * a) + (100 * h) - (10 * r) - vowels;
};


 function cartProd(arr) {
  if (arr.length === 0) {
    return [];
  } 
else if (arr.length ===1){
return arr[0];
}
else {
    var result = [];
    var allCasesOfRest = cartProd(arr.slice(1));  // recur with the rest of array
    for (var c in allCasesOfRest) {
      for (var i = 0; i < arr[0].length; i++) {
        result.push(arr[0][i] +" "+ allCasesOfRest[c]);
      }
    }
    return result;
  }

}
/// LUJVO CONSTRUCTOR PART END

var rafsiselfu = function (lin,last)//only from brivla to rafsi, returns a string of rafsi
{
var coun = xmlDocEn.find("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/rafsi/text()[1]");
if (coun.length===0)
{
try{coun=xmlDocEn.get("/dictionary/direction[1]/valsi[translate(@word,\""+lin.toUpperCase()+"\",\""+lin+"\")=\""+lin+"\"]/notes[1]").text(); var tmp=coun.replace(/^.*?-([a-z']+)-.*/,'$1');if (tmp!==coun){coun=tmp;}else{coun='';}}catch(err){coun='';}
}
else{coun=coun.join (' ');}
if (xugismu(lin)===true){
	coun=coun.split(" ");
	if (last!==1){
		if(lin.substr(0,4)!=="brod"){
			coun.push(lin.substr(0,4));
		}
	}else{
		coun.push(lin.substr(0,5));
	}
	coun=coun.join(" ").trim();
}
return coun;
//if it's a gismu then add full 5-letter rafsi for it
};

//NOW TRY TO OUTPUT SCORE LUJVO FROM GIVEN GISMU (OR OTHER VALSI)
var triz=function(inp,flag,lng,xmlDoc){
if (typeof lng==='undefined'){lng='en';}
if (typeof xmlDoc==='undefined'){
	if (lng==="en"){xmlDoc=xmlDocEn;}else{xmlDoc = libxmljs.parseXml(fs.readFileSync(path.join(__dirname,"dumps",lng + ".xml"),{encoding: 'utf8'}));}
}
	var ar=inp.trim().split(" ");
	for(var l=0;l<ar.length;l++){
		if (l==ar.length-1){
		ar[l]=rafsiselfu(ar[l],1).split(" ");}else{
		ar[l]=rafsiselfu(ar[l],0).split(" ");
		}
	}
	//we have ar, an array of arrays
	var cart=cartProd(ar);
	var len=cart.length;
	//
	var sey =[];
	for (var i = 0; i < cart.length; i++)
	{
		sey.push([cart[i]]);
		sey[i].push(rafyjongau(cart[i].split(" ")));
		sey[i].push(jvomre(sey[i][1]));
	}
	sey.sort(sortFunction);
	var si='';
	for (i=0;i<cart.length;i++)
	{
		si+=sey[i][1] + "["+sey[i][2]+"] ";
	}
	var tor='';
	for (i=0;i<cart.length;i++)
	{
		tor=tordu(sey[i][1],lng,1,xmlDoc);
		if (tor!=='' && (xulujvo(sey[i][1])===true)){break;}
	}
	//{throw new Error('============');}

	function sortFunction(a, b) {
    if (a[2] === b[2]) {
        return 0;
    }
    else {
        return (a[2] < b[2]) ? -1 : 1;
    }
	}
	si=si.trim().split(" ").splice(0,5);
	if (si.length>=5){si.push("...");}
	si=si.join(", ");
	if (tor!==''){si+="\n"+tor+"";}
	if (flag===1){ljv=si;si=tor;}
	return si;
};

var selrafsi = function (lin)
{
var gag;

var rev = xmlDocEn.get("/dictionary/direction[1]/valsi[rafsi=\""+lin+"\"]");
//now try -raf- in notes
if (typeof rev==='undefined'){rev =  xmlDocEn.get("/dictionary/direction[1]/valsi[contains(translate(./notes,\""+lin.toUpperCase()+"\",\""+lin+"\"),\" -"+lin+"-\")]");}
//now try to add a vowel
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"a\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"e\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"i\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"o\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
if (typeof rev==='undefined'){rev = xmlDocEn.get("/dictionary/direction[1]/valsi[@word=\""+lin+"u\" and (@type=\"fu'ivla\" or @type=\"experimental gismu\" or @type=\"gismu\")]");}
//may be it's already a word? then just return it.
if (typeof rev!=='undefined'){rev=rev.attr("word").value();}else{if (xugismu(lin)===true||xufuhivla(lin)===true){rev=lin;}else{rev=lin+"*";}}
return rev;
};

var katna= function(lin,lng,flag,xmlDoc){
	lin=jvokatna(lin).split(" ");
	for (var o=0;o<lin.length;o++){
		lin[o]=selrafsi(lin[o],xmlDoc);
	}
	lin = lin.join(" ");
	if (flag!==1){lin = lin + " ≈ " + gloso(lin,lng,1,xmlDoc);}
	return lin;
};


var sutsisningau = function(lng){//write a new file parsed.js that would be used by sutsis
if (typeof lng==='undefined'){lng='en';}
if (lng==="en"){xmlDoc=xmlDocEn;}else{xmlDoc = libxmljs.parseXml(fs.readFileSync(path.join(__dirname,"dumps",lng + ".xml"),{encoding: 'utf8'}));}

var pars='var documentStore = [';
var rev = xmlDoc.find("/dictionary/direction[1]/valsi");
	for (var i=0;i<rev.length;i++) {
		var hi=rev[i].attr("word").value().replace("\\","\\\\");
		pars+="{\"w\":\""+hi+"\"";
		try{pars+=",\"t\":\""+rev[i].attr("type").value().replace("\\","\\\\")+"\"";}catch(err){}
		try{pars+=",\"s\":\""+rev[i].find("selmaho[1]")[0].text().replace(/"/g,"'").replace("\\","\\\\")+"\"";}catch(err){}
		try{pars+=",\"d\":\""+rev[i].find("definition[1]")[0].text().replace(/"/g,"'").replace("\\","\\\\")+"\"";}catch(err){}
		try{pars+=",\"n\":\""+rev[i].find("notes[1]")[0].text().replace(/"/g,"'").replace("\\","\\\\")+"\"";}catch(err){}
		//try{pars+=",\"g\":\""+rev[i].find("glossword/@word").join(" ").replace(/ word='/g," ").replace(/'/g,"").replace(/"/g,"'").replace("\\","\\\\")+"\"";}catch(err){}
		var ra=rev[i].find("rafsi//text()[1]");
		if (xugismu(hi)===true){
			ra.push(hi);
			if(hi.indexOf("brod")!==0){ra.push(hi.substr(0,4));}
			if(hi.indexOf("broda")===0){ra.push("brod");}
		}
		ra=ra.join("\",\"");
		
		if (ra.length!==0){pars+=",\"r\":[\""+ra+"\"]";}//else{pars+=",\"rafsi\":[]";}//not needed anymore due to gleki's fixes
		pars+="}";
		if (i<rev.length-1){pars+=",\n";}//\n
	}
	pars+="];\n";//\n
rev = xmlDoc.find("/dictionary/direction[2]/nlword");
var nl='var literals = {';
	for (i=0;i<rev.length;i++) {
		nl+="\""+rev[i].attr("word").value().replace(/"/g,"'").replace(/\\/g,"\\").replace("\\","\\\\")+"\":[\""+rev[i].attr("valsi").value().replace(/"/g,"'").replace(/\\/g,"\\").replace("\\","\\\\")+"\"]";
		nl+="";
		if (i<rev.length-1){nl+=",\n";}//\n
	}
	nl+="};\n";//\n
	pars+=nl;
	var t = path.join(__dirname,"../i/data","parsed-"+lng + ".js");
	pars = fs.writeFileSync(t+".temp",pars);
	fs.renameSync(t+".temp",t);
	t = path.join(__dirname,"../i/"+lng+"/","webapp.appcache");
	var d = new Date();
	var n = d.getDate();
	if(n==1){try{pars=fs.readFileSync(t,{encoding: 'utf8'});pars = fs.writeFileSync(t,pars);console.log(t + ' updated');}catch(err){}}
};

var labangu = function(){
	var request = require("request");
	var fs = require("fs");
	var t = path.join(__dirname,"dumps","labangu.csv");
	requestd = request.defaults({jar: true});
	var uri="https://docs.google.com/spreadsheets/d/19faXeZCUuZ_uL6qcpQdMhetTXiKc5ZsOcZkYiAZ_pRw/export?format=csv&id=19faXeZCUuZ_uL6qcpQdMhetTXiKc5ZsOcZkYiAZ_pRw&gid=1855189494";
	requestd({
	    uri: uri, method: "GET"
	}).on("error", function (err) {
	}).pipe(fs.createWriteStream(t)).on("finish", function () {
		var take = fs.readFileSync(t,{encoding: 'utf8'});
		take=take.replace(/➜/igm,"=>");
		take=take.replace(/&/igm,"&amp;");
		take=take.replace(/<(|\/)(small|sub)>|&nbsp;/igm,"");
		take=take.replace(/^(.*?),\"\n/igm,"<valsi word=\"$1\"><definition>");
		take=take.replace(/\"\n/igm,"</definition></valsi>\n");
		take=take.replace(/'''(.*?)'''/igm,"{$1}").replace(/''(.*?)''/igm,"{$1}");
		take="<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<?xml-stylesheet type=\"text/xsl\" href=\"jbovlaste.xsl\"?>\n<dictionary>\n<direction from=\"lojban\" to=\"La Bangu English\">\n"+take+"</definition></valsi>\n</direction>\n</dictionary>";
		take = fs.writeFileSync(t+".temp",take);
		fs.renameSync(t+".temp",path.join(__dirname,"dumps","lb.xml"));console.log("La Bangu updated");
	});
};

var lmw = function (lin,sendTo){//to be done
var request = require("request"); var body;
var uri="http://mw.lojban.org/index.php?action=render&title="+lin;
//var uri="http://mw.lojban.org/index.php?search="+lin+"&button=&title=Special%3ASearch";
//https://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&prop=extracts&format=json&exlimit=10&explaintext=&exsectionformat=plain&titles=India
//http://mw.lojban.org/api.php?action=opensearch&search=.o%27i&format=json
request({uri: uri,method: "GET"}, function(err, response, body) {
	var i;i = body.replace(/<[^>]+>/g,'');
	i=i.substring(0,200);
	if (i.length>=200){i+='...';}
	benji(source,socket,clientmensi,sendTo, i);
});
};

var tcepru = function(lins,sendTo,source,socket){
	var exec = require('child_process').exec;
	exec(path.join(__dirname,"../tcepru/./parser") + ' <<<"'+lins+'" 2>/dev/null', function (error, stdout, stderr) {
	lin=stdout;
	if (error !==null){lin='O_0';}
	benji(source,socket,clientmensi,sendTo, lin.replace(/\n/g,' ').replace(/ {2,}/g,' '));
	});
};

var jbofihe = function(lin,sendTo,source,socket){
	var exec = require('child_process').exec;
	exec(path.join(__dirname,"../jbofihe/./jbofihe") + ' -ie -cr <<<"'+lin+'" 2>/dev/null', function (error, stdout, stderr) {
	lin=stdout;
	if (error !==null){lin='O_0';}
	benji(source,socket,clientmensi,sendTo, lin.replace(/\n/g,' ').replace(/ {2,}/g,' '));
	});
};

var pseudogismu = function(){//a joke function. checks if an English word is  a valid gismu
	var words = fs.readFileSync(path.join(__dirname,"../","vale.txt"),'utf8').split("\n");
	var sj=[];
	for (var j=0;j<words.length;j++){
			sj.push(words[j]+" "+run_camxes(words[j].toLowerCase().replace(/sh/g,"c"),3));
	}
	var content = fs.writeFileSync(path.join(__dirname,"../","vale-result"),sj.join("\n"));
};
//pseudogismu();

var prettifylojbansentences = function(){//insert spaces to lojban sentences
        var words = fs.readFileSync(path.join(__dirname,"../","eikatna.txt"),'utf8').split("\n");
        var sj=[];
        for (var j=0;j<words.length;j++){
                        sj.push(run_camxes(words[j],3));
        }
        var content = fs.writeFileSync(path.join(__dirname,"../","sekatna.txt"),sj.join("\n").replace(/h/g,"H").replace(/[^a-z \.\,'\n]/g,"").replace(/ +/g," ").replace(/ +\n/g,"\n"));
        return 'mulno';
};

var zeizei = function(text){//insert spaces to lojban sentences, split lujvo into zo zei zei lujvo
text=run_camxes(text,3).toString();
	try{if (text.indexOf("SyntaxError")<0){
		text=text.replace(/[a-z]+`/g,"").replace(/[a-z]+_[a-z]+/ig,"").replace(/h/g,"H").replace(/[^a-z \.\,'\n]/g,"").replace(/ +/g," ").replace(/ +\n/g,"\n");
		var sj=text.split(" ");
		for (var j=0;j<sj.length;j++){
			if (xulujvo(sj[j])===true){
			sj[j]=katna(sj[j],"en",1,xmlDocEn);
			if (sj[j].search(/^((se|te|ve|xe|na'e|je'a|to'e) )+[^ ]+$/)===0){
				sj[j]=sj[j].replace(/ /g," ");
			}
			else{sj[j]=sj[j].replace(/ /g," zei ");}
			}
		}
		text = sj.join(" ").trim();
	}else{text='O_0'}}catch(e){}
return text;
};

var anji = function(text){
var anj= require('./anji.js');
var anjarr = anj.anjik();
	text=zeizei(text).replace(/'/g,"h");
		for (j=0;j<anjarr.length;j++){
			myregexp = new RegExp("\\b"+anjarr[j][0]+"\\b", "gim");
			text=text.replace(myregexp,anjarr[j][1]);
		}
return text;
};

var tersmu = function(lin,sendTo,source,socket){
	var anj= require('../tersmu/all.js');
	//module.exports.ma = h$main;
	benji(source,socket,clientmensi,sendTo, anj.h$main(lin));
};

var mensimikce = function(text){//eliza bot analog
var Mensibot = require('../mahantufa/mensimikce.js');
//Mensibot.start(); // initializes Mensi and returns a greeting message
var r = Mensibot.reply(text).toString();
Mensibot = null;
return r;
};
//NAXLE

var http = require('http'),
    fs = require('fs'),
    // NEVER use a Sync function except at start-up!
    index = fs.readFileSync(__dirname + '/naxle.html');

// Send index.html to all requests
var app = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index);
});

// Socket.io server listens to our app
var io = require('socket.io').listen(app);

io.sockets.on('connection', function(socket) {
    //socket.emit('welcome', { message: 'Welcome!' +socket.id});
	//io.to(socket.id).emit("returner", { message: message: vlaste(data.data,'en') });
    socket.on(
    	'i am client', function(data){
    		//clientmensi, from, to, text, message,source
    		if(data.data.indexOf(prereplier+"doi")===0 || data.data.indexOf(prereplier+"tell")===0){}else{
    			processormensi(clientmensi, "mw.lojban.org", "", data.data, "","naxle",socket);
    		}
    	}
    );
});

app.listen(3000);

//mahantufa
var ningaumahantufa = function(text,socket){
	var fs = require("fs");
	var PEG = require("pegjs");
	//write file
	var whichfile = text.substr(0,text.indexOf(' '));
	text = text.substr(text.indexOf(' ')+1);
	var t = path.join(__dirname,"."+whichfile+".peg");
	fs.writeFileSync(t,text);
	// // read peg and build a parser
	var camxes_peg = fs.readFileSync(whichfile+".peg").toString();
	try{var camxes = PEG.buildParser(camxes_peg, {cache: true});
	// // write to a file
	var fd = fs.openSync(whichfile, 'w+');
	var buffer = new Buffer('var camxes = ');
	fs.writeSync(fd, buffer, 0, buffer.length);
	buffer = new Buffer(camxes.toSource());
	fs.writeSync(fd, buffer, 0, buffer.length);
	buffer = new Buffer("\n\nmodule.exports = camxes;\n\nterm = process.argv[2];\nif (term !== undefined && typeof term.valueOf() === 'string')\n  console.log(JSON.stringify(camxes.parse(term)));\n\n");
	fs.writeSync(fd, buffer, 0, buffer.length);
	fs.close(fd);
	socket.emit('returner', {message: "snada"});
	}
	catch(e){socket.emit('returner', {message: e.message});}
};

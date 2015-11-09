// JavaScript Document
// This script generates .html files for la sutysisku of every localization except la muplis
// the template is taken from template.html file

//config
var langs = ["en","ru","eo","es","fr-facile","ile","ithkuil","ja","jbo","laadan","ldp","ru","zamenhofo","toki","jb","en-pt-BR","muplis","muplis-eng-pol"];

///script
var fs = require("fs"),path = require("path-extra");
var templ = fs.readFileSync(path.join(__dirname,"../i/test","template.html"),{encoding: 'utf8'});var bng;var b;
langs.forEach(function(thisa){
	var file = fs.readFileSync(path.join(__dirname,"../i",thisa,"bangu.js"),{encoding: 'utf8'});
	var m = file.match(/window\.bangudesc *= *[\"'](.*?)[\"'];(\n|\r)/)[1].replace(/\\\"/g,"\"");
	b = templ.replace("%bangudesc%",m);
	
	m = file.match(/window\.bangulo *= *[\"'](.*?)[\"'];(\n|\r)/)[1].replace(/\\\"/g,"\"");
	b = b.replace("%bangulo%",m);
	
	m = file.match(/window\.bangusisku *= *[\"'](.*?)[\"'];(\n|\r)/)[1].replace(/\\\"/g,"\"");
	b = b.replace("%2%",m);
	
	m = file.match(/opdescr *= *[\"'](.*?)[\"'];(\n|\r)/)[1].replace(/\\\"/g,"\"");
	b = b.replace("%1%",m);

	b = b.replace("%ogurl%","https://mw.lojban.org/extensions/ilmentufa/i/"+thisa+"/index.html");
	b = b.replace("%searchurl%","/extensions/ilmentufa/i/"+thisa+"/sisku.xml");
	b = b.replace("%searchtitle%",thisa+"-sutysisku");
	var upper;
	try{upper = file.match(/upperdir *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1].replace(/\\\"/g,"\"");}catch(err){upper="../";}
	try{m = file.match(/titlelogo *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1].replace(/\\\"/g,"\"").replace(/%upper%/g,upper);}catch(err){m="<span id='plise' style='display: none;'><a id='st' href=\""+upper+"\"><img src=\"../sutysisku.png\" height='16' width='16'><span class='site-title'><font color=\"#fff\">la sutysisku</font></span></a></span>";}b = b.replace(/%titlelogo%/g,m);
	try{m=file.match(/mupliskari1 *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1];}catch(err){m="56,136,233";}b = b.replace(/%mupliskari1%/g,m);
	try{m=file.match(/mupliskari2 *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1];}catch(err){m="34,87,213";}b = b.replace(/%mupliskari2%/g,m);
	try{m=file.match(/mupliskari3 *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1];}catch(err){m="38,99,224";}b = b.replace(/%mupliskari3%/g,m);
	try{m=file.match(/mupliskari4 *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1];}catch(err){m="25,65,165";}b = b.replace(/%mupliskari4%/g,m);
	try{m=file.match(/grad_pos1 *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1];}catch(err){m="0%";}b = b.replace(/%grad_pos1%/g,m);
	try{m=file.match(/grad_pos2 *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1];}catch(err){m="13%";}b = b.replace(/%grad_pos2%/g,m);
	try{m=file.match(/grad_pos3 *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1];}catch(err){m="88%";}b = b.replace(/%grad_pos3%/g,m);
	try{m=file.match(/grad_pos4 *= *[\"'](.*?)[\"'];*([\n\r]+|$)/)[1];}catch(err){m="100%";}b = b.replace(/%grad_pos4%/g,m);
	fs.writeFileSync(path.join(__dirname,"../i",thisa,"index.html"), b);
});

templ = fs.readFileSync(path.join(__dirname,"../i/test","sisku.xml"),{encoding: 'utf8'});var bng;var b;
langs.forEach(function(thisa){
	var file = fs.readFileSync(path.join(__dirname,"../i",thisa,"bangu.js"),{encoding: 'utf8'});
	//var m = file.match(/window\.bangudesc *= *[\"'](.*?)[\"'];(\n|\r)/)[1].replace(/\\\"/g,"\"");
	b = templ.replace("%1%","https://mw.lojban.org/extensions/ilmentufa/i/"+thisa+"/index.html#sisku/{searchTerms}");
	b = b.replace("%2%",thisa+"-sutysisku");
	m = file.match(/siskudescr *= *[\"'](.*?)[\"'];(\n|\r)/)[1].replace(/\\\"/g,"\"");
	b = b.replace("%3%",m);
	fs.writeFileSync(path.join(__dirname,"../i",thisa,"sisku.xml"), b);
});
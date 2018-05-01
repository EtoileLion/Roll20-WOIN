"use strict";
function decodehtmlentities(str) {
	return str.replace(/&#(\d+);/g, function(match, dec) {
		return String.fromCharCode(dec);
	});
}

function rolllookups(options,charattrs,who) {  
			//Get values for relevant abilities...
			var attrnames = {"Strength" : "str_pool","Agility" : "agi_pool","Endurance" : "end_pool","Intelligence" : "int_pool","Logic" : "log_pool","Willpower" : "wil_pool","Charisma" : "cha_pool","Luck" : "luc_pool","Reputation" : "rep_pool","Magic" : "special_pool","???" : "special_pool","Psionic" : "special_pool", "Special" : "special_pool"};			
			options.dielimit = parseInt(charattrs.filter((x)=>x.get("name") === "max_diepool")[0].get("current"));
			var sheettype = charattrs.filter((x)=>x.get("name") === "sheet_type");
			if(sheettype.length === 0) { 
				sendChat("WOIN Dice Roller","/w "+who.replace(" (GM)","")+" Sheet has no Type defined. Please open the sheet before attempting a roll.");                  
				return;  
			}
			options.type = sheettype[0].get("current");
			if(options.attrname === "Special") { options.attrname = (options.type === "new") ? "Psionic" : (options.type === "now") ? "???" : "Magic"; }
			var attrid = charattrs.filter((x)=>x.get("name") === attrnames[options.attrname]);
			if(attrid.length === 0) {
				log("DEBUG: No attr value found.");
				options.attrvalue = 0;
				} else {
				options.attrvalue = parseInt(attrid[0].get("current"));
			}
			var skillid = charattrs.filter((x)=>x.get("current") === options.skillname && x.get("name").slice(-9) === "skillname");
			if(skillid.length === 0) {
				log("DEBUG: No skill value found.");          
				options.skillvalue = 0;
				} else {
				var skillset = charattrs.filter((x)=>x.get("name") === "repeating_skills_"+(skillid[0].get("name").split("_")[2])+"_skillpool");
				options.skillvalue = (skillset.length === 0) ? 0 : parseInt(skillset[0].get("current"));
			}			
			var equipid = charattrs.filter((x)=>x.get("current") === options.equipname);
			if(equipid.length === 0) {
					log("DEBUG: No equip value found.");          
					options.equipvalue = 0;
			} else {
					options.equipvalue = Math.min(parseInt(charattrs.filter((x)=>x.get("name") === "repeating_equip_"+(equipid[0].get("name").split("_")[2])+"_quality")),options.skillvalue);
			}			
			return options;
		}		

on("chat:message", function(msg) {		
	if(msg.type === "api" && msg.content.indexOf("!woin") !== -1) {
		var options;
		var i = 0;
		var msgcmd = msg.content.slice(0,msg.content.indexOf(" "));
		var msgtext = decodehtmlentities(msg.content.slice(msg.content.indexOf(" ")+1)).trim();
		//Garbage Var Dump for Linting		
		var dieresults;
		var rolled;
		var total;
		var dievalue;
		var output;
		var explodetype;
		var atkpool;
		var dmgpool;
		var critcheck;
		var attacktotal;
		var attackdieresults;
		var dmgdieresults;
		var dmgtotal;
		var campaign;
		var turnorder;
		var tokens;
		var token;
		var playerpage;
		
		log("DEBUG: Input: " + msgtext);
		if(msgtext[0] !== "{" || msgtext.slice(-1) !== "}") { 
			sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. Expected JSON(1), received "+msgtext+" EL Check: \""+msgtext[0]+"\" \""+msgtext.slice(-1)+"\"");
			return;
		}
		try {
			options = JSON.parse(decodehtmlentities(decodehtmlentities(msgtext)));
		}
		catch(err) {
			sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. Expected JSON(2), received "+msgtext+" "+err +" Please report this error to EtoileLion.");
			return;
		}
		if(!options.hasOwnProperty("name")) { sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. Expected Character Name, received "+msgtext+" Please report this error to EtoileLion."); return; }
		var achar = findObjs({ type: "character", name: options.name});
		if(achar.length === 0) { sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. No character found with name  "+options.name+" Please report this error to EtoileLion."); return; }
		var charid = achar[0].id;
		
		//Value sanitization
		options.modvalue = parseInt(options.modifier) || 0;
		options.attrname = options.attrname || "Undefined";
		options.skillname = options.skillname || "Undefined";
		options.equipname = options.equipname || "Undefined";    
		options.posmod = parseInt(options.posmod) || 0;
		options.damdice = Math.max(options.damdice,0) || 0;
		options.damage_base = parseInt(options.damage_base) || 0;
		options.damage_mod = parseInt(options.damage_mod) || 0;
		options.weapon = options.weapon || "Undefined";
		options.notes = options.notes || "";
		options.dmgpool = parseInt(options.dmgpool) || 0;	  
		options.damage_mod = parseInt(options.damage_mod) || 0;
		options.luckvalue = parseInt(options.luck) || 0;		
		
		log("DEBUG (options):"+JSON.stringify(options));
		var charattrs = findObjs({type:"attribute", characterid: charid});
		log("DEBUG: charattrs: "+JSON.stringify(charattrs));		
		var sheettype;
		var attrnames = {"Strength" : "str_pool","Agility" : "agi_pool","Endurance" : "end_pool","Intelligence" : "int_pool","Logic" : "log_pool","Willpower" : "wil_pool","Charisma" : "cha_pool","Luck" : "luc_pool","Reputation" : "rep_pool","Magic" : "special_pool","???" : "special_pool","Psionic" : "special_pool", "Special" : "special_pool"};		
		log("DEBUG: msgcmd: '"+msgcmd+"'");
		switch(msgcmd) {
		    case "!woin_roll":
				log("DEBUG: roll start");
				options = rolllookups(options,charattrs,msg.who);
				dieresults = [];
				rolled = 0;
				total = 0;
				dievalue = 0;
				log("DEBUG (A,S,E): "+options.attrvalue+" "+options.skillvalue+" "+options.equipvalue);
				output = "<div class=\"sheet-rollresult-"+options.type+"\"><div class=\"sheet-rollresult-namerow\">"+options.name+"</div><div class=\"sheet-rollresult-byline\">";
				output += "("+options.attrname+((options.skillvalue !== 0) ? "+"+options.skillname : "")+((options.equipvalue !== 0) ? "+"+options.equipname : "")+((options.modvalue !== 0) ? "+Modifier" : "")+")";
				output += "</div><div class=\"sheet-rollresult-dieline\">";
				explodetype = {"attr":false,"skill": false, "equip": false,"mod":false,"luck":true,"explode":true};				
				["attr","skill","equip","mod","luck","explode"].forEach(function(dietype) {
					rolled = 0;
					while(rolled < options[dietype+"value"] && (options.dielimit > 0 || dietype === "luck" || dietype === "explode" )) {
						dievalue = randomInteger(6);
						total += dievalue;
						options.dielimit -= 1;
						if(dievalue === 6 && explodetype[dietype]) { options.explodevalue += 1; }
						rolled += 1;
						dieresults.push("<span class=\"sheet-"+dietype+"die"+((dievalue === 6) ? " sheet-critdie" : "")+((dievalue === 1) ? " sheet-cfaildie" : "")+"\">"+dievalue+"</span>");
					}
				});
				output += dieresults.join(" + ")+"</div><div class=\"sheet-rollresult-total\">"+total+"</div></div>";
				sendChat(options.name,output);				
			break;
			case "!woin_attack":
				options = rolllookups(options,charattrs,msg.who);
				log("DEBUG (options):"+JSON.stringify(options));
				atkpool = Math.min(options.attrvalue+options.skillvalue+options.equipvalue,options.dielimit)+options.posmod;
				if(options.damdice*2 >= atkpool && options.damdice > 0) { sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. You cannot spend more attack dice than are in the pool. Tried to spend "+(options.damdice * 2)+" out of "+atkpool); return; }
				options.attackvalue = atkpool - (options.damdice * 2);
				options.explodevalue = 0;
				dmgpool = options.damdice + options.damage_base;
				log("DEBUG (A,D): "+atkpool+","+dmgpool);
				critcheck = 0;
				attacktotal = 0;
				attackdieresults = [];
				explodetype = {"attack":false,"mod":false,"luck":true,"explode":true};
				["attack","mod","luck","explode"].forEach(function (dietype) {
				    i = 0;
					while(i < options[dietype+"value"]) {
						dievalue = randomInteger(6);
						if(dievalue === 6) { critcheck += 1; if(explodetype[dietype]) { options.explodevalue += 1; } }
						attacktotal += dievalue;
						attackdieresults.push("<span class=\"sheet-"+dietype+"die"+((dievalue === 6) ? " sheet-critdie" : "")+((dievalue === 1) ? " sheet-cfaildie" : "")+"\">"+dievalue+"</span>");
						i += 1;
					}				
				});
				output = "/direct <div class=\"sheet-rollresult-"+options.type+"\"><div class=\"sheet-rollresult-namerow\">"+options.name+"</div><div class=\"sheet-rollresult-byline\">";
				output += "<a href='!woin_damage &#123; &#34;name&#34;&#58; &#34;"+options.name.replace("'","'")+"&#34;&#44; &#34;type&#34; &#58; &#34;"+options.type.replace("'","'")+"&#34;&#44; &#34;damagevalue&#34;&#58; "+dmgpool+"&#44; &#34;luck&#34;&#58; ?{How many luck die to use for damage|0}&#44; &#34;damage_mod&#34;&#58; "+options.damage_mod+"&#44; &#34;dmgtype&#34;&#58; &#34;"+options.damagetype.replace("'","'")+"&#34;&#125;'>"+options.weapon+"</a>";
				output += "</div><div class='sheet-rollresult-dieline'>"+attackdieresults.join(" + ")+"</div><div class=\"sheet-rollresult-total\">"+attacktotal+"</div>"+((critcheck >= 3) ? "<div class=\"sheet-rollresult-critcheck\">CRITICAL</div>" : "")+"<div class=\"sheet-rollresult-notes\">"+options.notes+"</div>";
				log("DEBUG (output): "+output);
				sendChat(options.name,output);				
			break;
			case "!woin_damage":
				dmgdieresults = [];
				log("DEBUG (options,damage): "+JSON.stringify(options));
				options.explodevalue = 0;
				dmgtotal = options.damage_mod;
				explodetype = {"damage": false,"luck": true, "explode": true};
				["damage","luck","explode"].forEach(function (dietype) {
					i = 0;
					while(i < options[dietype+"value"]) {
						dievalue = randomInteger(6);
						dmgtotal += dievalue;
						if(dievalue === 6 && explodetype[dietype]) { options.explodevalue += 1; }
						dmgdieresults.push("<span class=\"sheet-"+dietype+"die"+((dievalue === 6) ? " sheet-critdie" : "")+((dievalue === 1) ? " sheet-cfaildie" : "")+"\">"+dievalue+"</span>");
						i += 1;
					}
				});
				if(options.damage_mod !== 0) { dmgdieresults.push("<span class=\"sheet-flatmod\">"+options.damage_mod+"</span>"); }
				output = "<div class=\"sheet-rollresult-"+options.type+"\"><div class='sheet-rollresult-dieline'>"+dmgdieresults.join(" + ")+"</div><div class=\"sheet-rollresult-total\">"+dmgtotal+"</div><div class=\"sheet-rollresult-dmgtype\">"+options.dmgtype+"</div>";
				sendChat(options.name,output);  				
			break;
			case "!woin_init":
				options = rolllookups(options,charattrs,msg.who);
				dieresults = [];
				total = 0;
				explodetype = {"attr":false,"skill":false,"mod":false,"luck":true,"explode":true};
				output = "<div class=\"sheet-rollresult-"+options.type+"\"><div class=\"sheet-rollresult-namerow\">"+options.name+"</div><div class=\"sheet-rollresult-byline\">";
				output += "("+options.attrname+((options.skillvalue !== 0) ? "+"+options.skillname : "")+((options.modvalue !== 0) ? "+Modifier" : "")+")</div><div class=\"sheet-rollresult-dieline\">";
			    ["attr","skill","mod","luck","explode"].forEach(function (dietype) {
					dievalue = randomInteger(6);
					total += dievalue;
					if(dievalue === 6 && explodetype[dietype]) { options.explodevalue += 1; }
					dieresults.push("<span class=\"sheet-"+dietype+"die"+((dievalue === 6) ? " sheet-critdie" : "")+((dievalue === 1) ? " sheet-cfaildie" : "")+"\">"+dievalue+"</span>");					
				});
				output += dieresults.join(" + ")+"</div><div class=\"sheet-rollresult-total\">"+total+"</div>";				
				//Hunt for Token.
				campaign = Campaign();
				playerpage = (campaign.get("playerspecificpages") === false) ? campaign.get("playerpageid") : campaign.get("playerspecificpages").get(charid);
	            turnorder = (campaign.get("turnorder") == "") ? [] : JSON.parse(campaign.get("turnorder"));
				log(turnorder);
				if(campaign.get("initiativepage") == false) {
					sendChat("WOIN Roller","/w "+msg.who.replace(" (GM)","")+" There doesn't appear to be a Turn Order active.");
					return;
				}
				log("DEBUG: TokenSearch: "+JSON.stringify({"_type": "graphic","_subtype": "token", "represents": charid, "_pageid": playerpage }));
				log("DEBUG: Broad Tokens: "+JSON.stringify(findObjs({type: "graphic",subtype: "token"})));
				tokens = findObjs({type: "graphic",subtype: "token", represents: charid, pageid: playerpage });
				log("DEBUG: (tokens) : "+JSON.stringify(tokens));
				if(tokens.length === 0) { output += "<div class=\"sheet-rollresult-alert\">No Token Found</div>"; }
				else {
					token = tokens[0];
					//Add to Tracker.
					i = turnorder.findIndex((x)=>x.id === token.get("id"));
					if (i === -1) { turnorder.push({"id":token.get("id"),"pr":total, "custom":""}); }
					else { turnorder[i].pr = total; }
					campaign.set("turnorder", JSON.stringify(turnorder));
				}
				output += "</div>";
				sendChat(options.name,output); 								
			break;					
		}
	}
	
});


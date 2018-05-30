"use strict";
function dlog(msg) {
	//Edit this to send Debug messages to the API window.
	var debuglog = false;
	if(debuglog) { log(msg); }
}
function rolllookups(options,charattrs,who) {  
			//Get values for relevant abilities...
			var attrnames = {"Strength" : "str_pool","Agility" : "agi_pool","Endurance" : "end_pool","Intuition" : "int_pool","Logic" : "log_pool","Willpower" : "wil_pool","Charisma" : "cha_pool","Luck" : "luc_pool","Reputation" : "rep_pool","Magic" : "special_pool","Chi" : "special_pool","Psionic" : "special_pool", "Special" : "special_pool", "Size" : "nat_dmg"};			
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
				dlog("DEBUG: No attr value found for "+attrnames[options.attrname]);
				options.attrvalue = 0;
				} else {
				options.attrvalue = parseInt(attrid[0].get("current"));
			}
			var skillid = charattrs.filter((x)=>x.get("current") === options.skillname && x.get("name").slice(-9) === "skillname");
			if(skillid.length === 0) {
				dlog("DEBUG: No skill value found.");          
				options.skillvalue = 0;
				} else {
				var skillset = charattrs.filter((x)=>x.get("name") === "repeating_skills_"+(skillid[0].get("name").split("_")[2])+"_skillpool");
				options.skillvalue = (skillset.length === 0) ? 0 : parseInt(skillset[0].get("current"));
			}			
			var equipid = charattrs.filter((x)=>x.get("current") === options.equipname);
			if(equipid.length === 0) {
					dlog("DEBUG: No equip value found.");          
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
		var msgtext = msg.content.slice(msg.content.indexOf(" ")+1).trim().replace(/\^\^\^/g,"\"").replace(/REPLACE_C/g,":");
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
		
		dlog("DEBUG: Input: " + msgtext);
		if(msgtext[0] !== "{" || msgtext.slice(-1) !== "}") { 
			sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. Expected JSON(1), received "+msgtext+" EL Check: \""+msgtext[0]+"\" \""+msgtext.slice(-1)+"\"");
			return;
		}
		try {
			options = JSON.parse(decodeURIComponent(msgtext));
		}
		catch(err) {
			sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. Expected JSON(2), received "+msgtext+" "+err);
			return;
		}
		if(!options.hasOwnProperty("id")) { sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. Expected Character ID, received "+msgtext); return; }
		var achar = findObjs({ type: "character", id: options.id});
		if(achar.length === 0) { sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. No character found with ID  "+options.id); return; }
		options.name = achar[0].get('name');
		
		//Value sanitization
		options.modvalue = parseInt(options.modifier) || 0;
		options.attrname = options.attrname || "Undefined";
		options.skillname = options.skillname || "Undefined";
		options.equipname = options.equipname || "Undefined";    
		options.posmod = parseInt(options.posmod) || 0;
		options.damdice = Math.max(options.damdice,0) || 0;
		options.damage_base = parseInt(options.damage_base) || 0;
		options.damage_mod = parseInt(options.damage_mod) || 0;
		options.weapon_id = options.weapon_id || "Undefined";
		options.notes = options.notes || "";
		options.dmgpool = parseInt(options.dmgpool) || 0;	  
		options.damage_mod = parseInt(options.damage_mod) || 0;
		options.luckvalue = parseInt(options.luck) || 0;
        options.flatmod = parseInt(options.flatmod) || 0;
		options.explodevalue = 0;
		
		dlog("DEBUG (options):"+JSON.stringify(options));
		var charattrs = findObjs({type:"attribute", characterid: options.id});
		dlog("DEBUG: charattrs: "+JSON.stringify(charattrs));		
		var sheettype;
		var attrnames = {"Strength" : "str_pool","Agility" : "agi_pool","Endurance" : "end_pool","Intelligence" : "int_pool","Logic" : "log_pool","Willpower" : "wil_pool","Charisma" : "cha_pool","Luck" : "luc_pool","Reputation" : "rep_pool","Magic" : "special_pool","???" : "special_pool","Psionic" : "special_pool", "Special" : "special_pool"};		
		dlog("DEBUG: msgcmd: '"+msgcmd+"'");
		switch(msgcmd) {
		    case "!woin_roll":
				dlog("DEBUG: roll start");
				options = rolllookups(options,charattrs,msg.who);
				dieresults = [];
				rolled = 0;
				total = options.flatmod||0;
				dievalue = 0;
				dlog("DEBUG (A,S,E): "+options.attrvalue+" "+options.skillvalue+" "+options.equipvalue);
		output = "&{template:woinroll} {{"+options.type+"=1}} {{name="+options.name+"}} ";
				explodetype = {"attr":false,"skill": false, "equip": false,"mod":false,"luck":true,"explode":true};				
				if(options.modvalue < 0 ) {
				    var toremove = -1*options.modvalue;
					["equip","skill","attr"].forEach(function(dietype) {
						options[dietype+"value"] -= toremove;
						toremove = Math.max(0,-1*options[dietype+"value"]);					
						options[dietype+"value"] = Math.max(0,options[dietype+"value"]);
					});
				}				
				["attr","skill","equip","mod","luck","explode"].forEach(function(dietype) {
					rolled = 0;
					while(rolled < options[dietype+"value"] && (options.dielimit > 0 || explodetype[dietype] )) {
						dievalue = randomInteger(6);
						total += dievalue;
						options.dielimit -= 1;
						if(dievalue === 6 && explodetype[dietype]) { options.explodevalue += 1; }
						rolled += 1;
						dieresults.push("<span class=\"sheet-"+dietype+"die"+((dievalue === 6) ? " sheet-critdie" : "")+((dievalue === 1) ? " sheet-cfaildie" : "")+"\">"+dievalue+"</span>");
					}
				});
		if(options.flatmod !== 0) { dieresults.push("<span class=\"sheet-flatmod\">"+options.flatmod+"</span>"); }				
		output += "{{rollcomponents=<span class='sheet-attrdie'>"+options.attrname+"</span>"+((options.skillvalue !== 0) ? "+<span class='sheet-skilldie'>"+options.skillname+"</span>" : "")+((options.equipvalue !== 0) ? "+<span class='sheet-equipdie'>"+options.equipname+"</span>" : "")+((options.modvalue > 0) ? "+<span class='sheet-moddie'>Modifier</span>" : "")+((options.luckvalue !== 0) ? "+<span class='sheet-luckdie'>Luck</span>" : "")+((options.explodevalue !== 0) ? "+<span class='sheet-explodedie'>Explosions</span>" : "")+((options.flatmod !== 0) ? "+<span class='sheet-flatmod'>Flat-Modifier</span>" : "")+"}} ";				
				output += "{{dieresults="+dieresults.join(" + ")+"}} {{total="+total+"}}";
				dlog("DEBUG: Output: "+output);
				sendChat(options.name,output);				
			break;
			case "!woin_attack":
				var wepid = charattrs.filter((x)=>x.get("name").toLowerCase() === "repeating_attacks_"+options.weapon_id+"_attackname");
				if(wepid.length === 0) {
					dlog("DEBUG: No weapon name found for ID "+options.weapon_id);
					options.weapon = "Unnamed Weapon";
				} else {
					options.weapon = wepid[0].get("current");
				}
				//DmgType
				var wepid = charattrs.filter((x)=>x.get("name").toLowerCase() === "repeating_attacks_"+options.weapon_id+"_attack_type");
				if(wepid.length === 0) {
					dlog("DEBUG: No damage type found for ID "+options.weapon_id);
					options.damagetype = "Unspecified";
				} else {
					options.damagetype = wepid[0].get("current");
				}
				//Skillname
				var wepid = charattrs.filter((x)=>x.get("name").toLowerCase() === "repeating_attacks_"+options.weapon_id+"_attackskill");
				if(wepid.length === 0) {
					dlog("DEBUG: No attack skill found for ID "+options.weapon_id);
					options.skillname = "Undefined";
				} else {
					options.skillname = wepid[0].get("current");
				}				
				//Notes
				var wepid = charattrs.filter((x)=>x.get("name").toLowerCase() === "repeating_attacks_"+options.weapon_id+"_notes");
				if(wepid.length === 0) {
					dlog("DEBUG: No notes found for ID "+options.weapon_id);
					options.notes = "";
				} else {
					options.notes = wepid[0].get("current");
				}				
				options = rolllookups(options,charattrs,msg.who);
				dlog("DEBUG (options):"+JSON.stringify(options));
				atkpool = Math.min(options.attrvalue+options.skillvalue+options.equipvalue,options.dielimit)+options.posmod;
				if(options.damdice*2 >= atkpool && options.damdice > 0) { sendChat("WOIN Dice Roller","/w "+msg.who.replace(" (GM)","")+" Dice Roll Error. You cannot spend more attack dice than are in the pool. Tried to spend "+(options.damdice * 2)+" out of "+atkpool); return; }
				options.equipvalue = parseInt(options.atkequipvalue) || 0;
				options.attackvalue = atkpool - (options.damdice * 2);
				options.explodevalue = 0;
				dmgpool = options.damdice + options.damage_base;
				dlog("DEBUG (A,D): "+atkpool+","+dmgpool);
				critcheck = 0;
				attacktotal = 0;
				attackdieresults = [];
				limittype = {"attr":false,"skill":false,"equip":false,"mod":true,"luck":true,"explode":true};				
				explodetype = {"attr":false,"skill":false,"equip":false,"mod":false,"luck":true,"explode":true};
				if(options.modvalue < 0 ) {
				    var toremove = -1*options.modvalue;
					["equip","skill","attr"].forEach(function(dietype) {
						options[dietype+"value"] -= toremove;
						toremove = Math.max(0,-1*options[dietype+"value"]);					
						options[dietype+"value"] = Math.max(0,options[dietype+"value"]);
					});
				}				
				["attr","skill","equip","mod","luck","explode"].forEach(function (dietype) {
					dlog(dietype+":"+options[dietype+"value"]);
				    i = 0;
					while(i < options[dietype+"value"] && (options.dielimit > 0 || limittype[dietype] )) {
						dievalue = randomInteger(6);
						if(dievalue === 6) { critcheck += 1; if(explodetype[dietype]) { options.explodevalue += 1; } }
						options.dielimit -= 1;
						attacktotal += dievalue;						
						attackdieresults.push("<span class=\"sheet-"+dietype+"die"+((dievalue === 6) ? " sheet-critdie" : "")+((dievalue === 1) ? " sheet-cfaildie" : "")+"\">"+dievalue+"</span>");
						i += 1;
					}				
				});
		output = "&{template:woinroll} {{"+options.type+"=1}} {{type="+options.type+"}}{{id="+options.id+"}}{{name="+options.name+"}}";
				output += "{{rollcomponents=<span class='sheet-attrdie'>"+options.attrname+"</span>"+((options.skillvalue !== 0) ? "+<span class='sheet-skilldie'>"+options.skillname+"</span>" : "")+((options.equipvalue !== 0) ? "+<span class='sheet-equipdie'>Quality</span>" : "")+((options.modvalue > 0) ? "+<span class='sheet-moddie'>Modifier</span>" : "")+((options.luckvalue !== 0) ? "+<span class='sheet-luckdie'>Luck</span>" : "")+((options.explodevalue !== 0) ? "+<span class='sheet-explodedie'>Explosions</span>" : "")+"}} ";								
		output += "{{damagevalue="+dmgpool+"}} {{damage_mod="+options.damage_mod+"}} {{dmgtype="+(options.damagetype.replace(/\"/g,"^^^").replace(/\}/g,"&rcb;"))+"}} {{weapon_name="+options.weapon.replace(/\}/g,"&rcb;").replace(/\]/g,"&rbrack;").replace(/\"/g,"&quot;")+"}}";
				output += "{{dieresults="+attackdieresults.join(" + ")+"}} {{total="+attacktotal+"}} {{notes="+options.notes+"}}";
				if(critcheck >= 3) { output+= woin_critical_lookup(options.damagetype) }
				dlog("DEBUG (output): "+output);
				sendChat(options.name,output);				
			break;
			case "!woin_damage":
				dmgdieresults = [];
				dlog("DEBUG (options,damage): "+JSON.stringify(options));
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
		output = "&{template:woindmg} {{"+options.type+"=1}} {{name="+options.name+"}} {{dieresults="+dmgdieresults.join(" + ")+"}} {{total="+dmgtotal+"}} {{dmgtype="+options.dmgtype.replace(/\"/g,"&quot;").replace(/\}/g,"&rcb;")+"}}";
				dlog("DEBUG: Output: "+output);
				sendChat(options.name,output);  				
			break;
			case "!woin_init":
				options = rolllookups(options,charattrs,msg.who);
				dieresults = [];
				total = 0;
				explodetype = {"attr":false,"skill":false,"mod":false,"luck":true,"explode":true};
				output = "&{template:woinroll} {{"+options.type+"=1}} {{name="+options.name+" (Init)}} ";
				if(options.modvalue < 0 ) {
				    var toremove = -1*options.modvalue;
					["skill","attr"].forEach(function(dietype) {
						options[dietype+"value"] -= toremove;
						toremove = Math.max(0,-1*options[dietype+"value"]);					
					options[dietype+"value"] = Math.max(0,options[dietype+"value"]);
					});
				}
			    ["attr","skill","mod","luck","explode"].forEach(function (dietype) {
					rolled = 0;
					dlog("DEBUG (Dietype "+dietype+"): "+options[dietype+"value"]); 
					while(rolled < options[dietype+"value"] && (options.dielimit > 0 || explodetype[dietype] )) {
					dievalue = randomInteger(6);
					total += dievalue;
					options.dielimit -= 1;
					rolled += 1;
					if(dievalue === 6 && explodetype[dietype]) { options.explodevalue += 1; }
					dieresults.push("<span class=\"sheet-"+dietype+"die"+((dievalue === 6) ? " sheet-critdie" : "")+((dievalue === 1) ? " sheet-cfaildie" : "")+"\">"+dievalue+"</span>");					
					}
				});
				output += "{{rollcomponents=<span class='sheet-attrdie'>"+options.attrname+"</span>"+((options.skillvalue !== 0) ? "+<span class='sheet-skilldie'>"+options.skillname+"</span>" : "")+((options.equipvalue !== 0) ? "+<span class='sheet-equipdie'>"+options.equipname+"</span>" : "")+((options.modvalue > 0) ? "+<span class='sheet-moddie'>Modifier</span>" : "")+((options.luckvalue !== 0) ? "+<span class='sheet-luckdie'>Luck</span>" : "")+((options.explodevalue !== 0) ? "+<span class='sheet-explodedie'>Explosions</span>" : "")+"}} ";				
				output += "{{dieresults="+dieresults.join(" + ")+"}} {{total="+total+"}}";

				//Hunt for Token.
				campaign = Campaign();
				playerpage = (campaign.get("playerspecificpages") === false) ? campaign.get("playerpageid") : campaign.get("playerspecificpages").get(options.id);
	            turnorder = (campaign.get("turnorder") == "") ? [] : JSON.parse(campaign.get("turnorder"));
				dlog(turnorder);
				if(campaign.get("initiativepage") !== false) {
					dlog("DEBUG: TokenSearch: "+JSON.stringify({"_type": "graphic","_subtype": "token", "represents": options.id, "_pageid": playerpage }));
				dlog("DEBUG: Broad Tokens: "+JSON.stringify(findObjs({type: "graphic",subtype: "token"})));
				tokens = findObjs({type: "graphic",subtype: "token", represents: options.id, pageid: playerpage });
				dlog("DEBUG: (tokens) : "+JSON.stringify(tokens));
				if(tokens.length === 0) { output += "{{alert=No Token Found}}"; }
				else {
					token = tokens[0];
					//Add to Tracker.
					i = turnorder.findIndex((x)=>x.id === token.get("id"));
					if (i === -1) { turnorder.push({"id":token.get("id"),"pr":total, "custom":""}); }
					else { turnorder[i].pr = total; }
					campaign.set("turnorder", JSON.stringify(turnorder));
				}
				}
				sendChat(options.name,output); 								
			break;					
		}
	}	
});

function woin_critical_lookup(dmgtype) {
	//Attempt Type Sanitization.
	var storedmg = dmgtype;
	dmgtype = dmgtype.trim().toLowerCase().split(/[,\/\\\s]/);
	dmgtype = [...new Set(dmgtype.map((x) => {
	if(x === "sonic" || x === "sound" )  { x = "sonic/sound"; }
	if(x === "heat" || x === "fire" )  { x = "heat/fire"; }	
	if(x === "psionic" || x === "psychic" )  { x = "psionic/psychic"; }
    if(x === "force") { x = "blunt"; }
    if(x === "plasma") { x = "heat/fire"; }
	return x;
	}))];
	var table = {"acid":["Pain","Pain","Pain","Burning","Burning","Burning"],
						"ballistic":["Bleeding","Bleeding","Pain","Pain","Downed","Slowed"],
						"blunt":["Dazed","Dazed","Deaf","Sleeping","Drunk","Drunk"],
						"cold":["Slowed","Slowed","Slowed","Slowed","Sleeping","Restrained"],
                        "crushing": ["Pain","Pain","Pain","Restrained","Restrained","Bleeding"],
						"electricity":["Dazed","Dazed","Dazed","Pain","Pain","Burning"],
						"heat/fire":["Burning","Burning","Pain","Pain","Disarmored","Disarmed"],
						"holy":["Blind","Blind","Blind","Afraid","Afraid","Afraid"],
						"ion":["Fatigued","Fatigued","Fatigued","Fatigued","Fatigued","Fatigued"],
						"light":["Blind","Blind","Blind","Blind","Disarmed","Disarmed"],
						"necrotic":["Fatigued","Fatigued","Fatigued","Fatigued","Downed","Downed"],
						"piercing":["Bleeding","Bleeding","Bleeding","Pain","Pain","Disarmed"],
						"poison":["Poisoned","Poisoned","Sleeping","Drunk","Sick","Sick"],
						"psionic/psychic":["Dazed","Dazed","Dazed","Dazed","Dazed","Confused"],
						"radiation":["Sick","Sick","Sick","Sick","Sick","Sick"],
						"slashing":["Bleeding","Bleeding","Blind","Disarmed","Slowed","Slowed"],
						"sonic/sound":["Deaf","Deaf","Deaf","Deaf","Drunk","Drunk"],
						"unholy":["Sick","Sick","Cursed","Cursed","Angry","Angry"]
    };
	let outputcondition = []
	dmgtype.forEach((type) => {
		let die = randomInteger(6)-1;
		outputcondition.push((table.hasOwnProperty(type)) ? table[type][die]+" ("+(die+1)+")" : "Unknown Damage Type ("+(die+1)+")");
	});
	return "{{alert=Critical Result<br>"+outputcondition.join("<br>")+"}}";
}

log("What's Old Is N.E.W. Dice Roller Version 1.04 Loaded")
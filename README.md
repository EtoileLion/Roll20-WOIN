## Synopsis

A revamped version of the What's Old Is N.E.W. character sheet for Roll20, with an aim to alleviate certain foibles of the original.

## Note

This version of the sheet requires a Pro level account with Roll20, in order to utilize custom character sheets and the API script contained within.

## Installation

**_Before beginning any installation on an existing game, [BACK UP THE GAME](https://wiki.roll20.net/Game_Management#Copy_Game). I am not responsible for any loss of data._**

*The Conversion script from the original version of the WOIN character sheet to this one has been **delayed to a future version** due to... quirks in certain fields.*

1. Create a game.    
2. In the [Game Settings](https://wiki.roll20.net/Game_Management#Game_Settings) page for the game, set the Character Sheet Template to Custom. *(This step may be completed during game creation.)*    
3. In the [Game Settings](https://wiki.roll20.net/Game_Management#Game_Settings) page for the game, select the HTML Layout tab.    
  * Copy the contents of [woin.html](./blob/master/woin.html) and paste them into the text box.    
4. In the [Game Settings](https://wiki.roll20.net/Game_Management#Game_Settings) page for the game, select the CSS Styling tab.    
  * Copy the contents of [woin.css](./blob/master/woin.css) and paste them into the text box.    
5. Return to the game lobby, and navigate to the [API Scripts](https://wiki.roll20.net/Game_Management#API_Scripts) for the game.    
6. Click on the New Script tab. You can give the script any name you like.    
  * Copy the contents of [woin.js](./blob/master/woin.js) and paste them into the upper text box.    
  * Click the Save Script button below the textbox.    
  * In the lower text box, you should see "What's Old Is N.E.W. Dice Roller Version X.X Loaded", with X.X being the current script's version.    
7. *(Optional)* For the benefit of viewing, additional fonts are available in the /fonts directory. Fonts cannot be force-loaded via roll20.    

## API Function Reference

Defined Functions:

*decodehtmlentities(String str)* : Renders a single layer of decoding for HTML entities coded in &Hexadecimal; form. Returns String.

*dlog(String msg)*: Wrapper function to allow debug messaging to be sent to the API log window. Returns nothing.    
* This function can be enabled or disabled by setting the value of the debuglog flag on line 9.

*rolllookups(Object options,Array charattrs,String who)* : Looks up attribute skill and equipment values for making a roll. Not designed to be externally invoked.

Defined Chat Hooks:

*!woin_roll* : Rolls a set of dice based on the JSON object following the invoking call.    
*!woin_attack* : Rolls an attack based on the JSON object following the invoking call.    
*!woin_damage* : Rolls a Damage roll based on the JSON object following the invoking call.    
*!woin_init* : Rolls an Initiative roll based on the JSON object following the invoking call. Attempts to locate a valid token for the character automatically and inserts the result into the tracker.

## License

Released under the Open Gaming License as a derivitive work of the What's Old Is N.E.W. system.

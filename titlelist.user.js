//{
// Common functions for working on lists of titles, loading them, highlighting
// titles based on these lists.
//
// Copyright (c) 2019, Guido Villa
// Most of the code is taken from IMDb 'My Movies' enhancer:
// Copyright (c) 2008-2018, Ricardo Mendonça Ferreira (ric@mpcnet.com.br)
// Released under the GPL license - http://www.gnu.org/copyleft/gpl.html
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name          TitleList
// @description   Common functions for working on lists of titles
// @namespace     https://greasyfork.org/en/scripts/390248-titlelist
// @updateURL     about:blank
// @homepageURL   https://greasyfork.org/en/scripts/390248-titlelist
// @copyright     2019, Guido Villa
// @license       GPL-3.0-or-later
// @oujs:author   Guido
// @date          18.09.2019
// @version       0.1
// ==/UserScript==
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [H] Everything: extract functions from Netflix Hide Titles script and insert them below
//
// History:
// --------
// 2019.09.18  [0.1] First test version, private use only
//
//}

/*jshint esversion: 6 */

const TITLELIST_Version = '0.1';

// FUNCTIONS *************************************************************************************************************	

function TL() {
    'use strict';
    /* XXX var myPrivateVar;

    var private_stuff = function() {  // Only visible inside Restaurant()
        myPrivateVar = "I can set this here!";
    }*/

    this.getLoggedUser = function(ctx) {
        //
        // Return name of user currently logged on <ctx> site
        // Return last saved value and log error if no user is found
        //
        var user = ctx.getUser();

        if (!user) {
            console.error(ctx.name + ": user not logged in (or couldn't get user info) on URL " + document.URL);
            user = GM_getValue(ctx.name + '-lastUser', '');
            console.error("Using last user: " + user);
        }
        GM_setValue(ctx.name + '-lastUser', user);
        ctx.user = user;
        return user;
    };


    function loadSavedList(listName) {
        //
        // Load a single saved lists
        //
        var list;
        var userData = GM_getValue(listName, null);
        if (userData) {
            try {
                list = JSON.parse(userData);
            } catch(err) {
                alert("Error loading saved list named '" + listName + "'!\n" + err.message);
            }
        }
        return list;
    }


    this.loadSavedLists = function(ctx) {
        //
        // Load lists saved for the current user
        //
        var lists = {};

        var listNames = loadSavedList('TitleLists-' + ctx.user);
        if (!listNames) return lists;

        for (var listName in listNames) {
            lists[listName] = loadSavedList('TitleList-' + ctx.user + '-' + listName);
        }
        return lists;
    };


    this.saveList = function(ctx, list, name) {
        //
        // Save single list for the current user
        //
        var listNames = loadSavedList('TitleLists-' + ctx.user);
        if (!listNames) listNames = {};

        listNames[name] = 1;
        var userData = JSON.stringify(listNames);
        GM_setValue('TitleLists-' + ctx.user, userData);

        userData = JSON.stringify(list);
        GM_setValue('TitleList-' + ctx.user + '-' + name, userData);
    };


    this.checkPage = function(ctx) {
        var we_are_in_a_title_page = ctx.isTitlePage(document);

        if (we_are_in_a_title_page) {
            // find current logged in user, or quit script
            if (!getLoggedUser(ctx)) return;

            // Load lists data for this user from local storage
            ctx.allLists = loadSavedLists(dest);
            myLocalList = allLists['localHide']; // XXX

            // start the title processing function
            if (ctx.allLists.length) {
                processTitles(ctx);
                if (ctx.interval >= 100) {
                    ctx.timer = setInterval(function() {processTitles(ctx);}, ctx.interval);
                }
            }
        }
    };


    this.inLists = function(ctx, tt, entry) {
        //
        // Receives a title (and corresponding entry) and finds all lists title is in.
        // Argument "entry" is for "virtual" lists determined by attributes in the DOM
        //
        var lists = ( ctx.getListsFromEntry && ctx.getListsFromEntry(tt, entry) || {} );

        for (var list in ctx.allLists) {
            if (ctx.allLists[list][tt.id]) lists[list] = true;
        }

        return lists;
    };


    function processTitles(ctx) {
        //
        // Process all title cards in current page
        //

        var entry, tt, lists, processingType;
        var entries = ctx.getTitleEntries(document);

        for (var i = 0; i < entries.length; i++) {
            entry = entries[i];

            // if entry has already been previously processed, skip it
            if (entry.TLProcessed) continue;

            tt = ctx.getIdFromEntry(entry);
            if (!tt) continue;

            ctx.modifyEntry(entry);
            lists = inLists(tt, entry);

            processingType = ctx.determineType(lists, tt, entry);

            if (processingType) ctx.processItem(entry, tt, processingType);

            entry.TLProcessed = true; // set to "true" after processing (so we skip it on next pass)
        } // end for on all entries
    }


}
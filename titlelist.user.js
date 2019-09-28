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
//   - [M] Move string literals
//   - [M] correct public/private
//   - [M] main context as default context
//   - [H] Make it work! Understand "this", etc.
//   - [H] what is the correct way of exporting the library?
//   - [H] move scripts to github or similar
//   - [H] do we need that the library is not cached? if so, how?
//   - [H] See if ok that old versions are public
//   - [M] Reorder functions
//   - [H] Extend library to work on all the scripts
//   - [M] Automatically handle case with only one list
//   - [M] Add indication of URL to use to @require library itself
//   - [M] correct @namespace and @homepageURL
//   - [M] Auto-update
//   - [L] Make public
//
// History:
// --------
// 2019.09.18  [0.1] First test version, private use only
//
//}

/*jshint esversion: 6 */

const TITLELIST_Version = '0.1';

// FUNCTIONS *************************************************************************************************************	

var TL = (function() {
    'use strict';

    var mainContext;


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


    this.manageTitlePage = function(ctx) {
        //TODO forse qualcosa da cambiare, salvare la variabile nel contesto? Le operazioni sono sempre le stesse o qualcuno deve fare qualcosa di specifico?
        //le dure righe sotto possono diventare una?
        var we_are_in_a_title_page = ( !ctx.isTitlePage || ctx.isTitlePage(document) );
        if (!we_are_in_a_title_page) return;

        // find current logged in user, or quit script
        if (!this.getLoggedUser(ctx)) return;

        mainContext = ctx;

        // Load lists data for this user from local storage
        ctx.allLists = this.loadSavedLists(ctx);

        // start the title processing function
        this.processTitles(ctx);
        if (ctx.interval >= 100) {
            ctx.timer = setInterval(function() {processTitles(ctx);}, ctx.interval);
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


    this.processTitles = function(ctx) {
        //
        // Process all title cards in current page
        //
        var entries = ctx.getTitleEntries(document);
        if (!entries) return;

        var entry, tt, lists, processingType;
        for (var i = 0; i < entries.length; i++) {
            entry = entries[i];

            // if entry has already been previously processed, skip it
            if (entry.TLProcessed) continue;

            tt = ctx.getIdFromEntry(entry);
            if (!tt) continue;

            if (ctx.modifyEntry) ctx.modifyEntry(entry);
            lists = this.inLists(ctx, tt, entry);

            processingType = ctx.determineType(lists, tt, entry);

            if (processingType) {
                ctx.processItem(entry, tt, processingType);
                entry.TLProcessingType = processingType;
            }

            entry.TLProcessed = true; // set to "true" after processing (so we skip it on next pass)
        }
    };


    this.toggleTitle = function(evt) {
        var data = evt.target.dataset;

        // get title entry
        var entry = evt.target;
        if (Number.isInteger(Number(data.howToFindEntry))) {
            for (var i = 0; i < Number(data.howToFindEntry); i++) entry = entry.parentNode;
        } else {
            entry = entry.closest(data.howToFindEntry);
        }

        var tt = mainContext.getIdFromEntry(entry);
        if (!tt) return;

        // check if item is in list
        var list = mainContext.allLists[data.toggleList];
        if (list[tt.id]) {
            delete list[tt.id];
            mainContext.unProcessItem(entry, tt, data.toggleType);
            entry.TLProcessingType = "-" + data.toggleType;
        } else {
            list[tt.id] = tt.title;
            mainContext.processItem(entry, tt, data.toggleType);
            entry.TLProcessingType = data.toggleType;
        }
        this.saveList(mainContext, list, data.toggleList);
    };



    this.addToggleEventOnClick = function(button, toggleType, toggleList, howToFindEntry) {
        button.dataset.toggleType     = toggleType;
        button.dataset.toggleList     = toggleList;
        button.dataset.howToFindEntry = howToFindEntry;
        button.addEventListener('click', this.toggleTitle, false);
    };


}());
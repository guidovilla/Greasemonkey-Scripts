//{
// Common functions for modifying/hiding/etc. entries in page, based on
// entry features or presence in one or more lists.
// For instance: hide all YouTube videos that have been watched and highlight
// the ones that have been started but not finished, highlight Netflix movies
// based on IMDb lists, etc.
//
// Copyright (c) 2019, Guido Villa
// Original idea and some of the code is taken from IMDb 'My Movies' enhancer:
// Copyright (c) 2008-2018, Ricardo Mendonça Ferreira (ric@mpcnet.com.br)
// Released under the GPL license - http://www.gnu.org/copyleft/gpl.html
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name          EntryList
// @description   Common functions for working on lists of entries
// @homepageURL   https://greasyfork.org/scripts/390248-entrylist
// @namespace     https://greasyfork.org/users/373199-guido-villa
// @version       1.3
// @installURL    https://greasyfork.org/scripts/390248-entrylist/code/EntryList.user.js
// @updateURL     https://greasyfork.org/scripts/390248-entrylist/code/EntryList.meta.js
// @copyright     2019, Guido Villa
// @license       GPL-3.0-or-later
// @author        Guido
// @date          30.09.2019
// ==/UserScript==
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [H] Extend library to work on all the scripts
//   - [M] Make private members actually private and not only undocumented
//         (only after understanding which ones really can be private)
//   - [M] main context as default context
//   - [M] do we need that the library is not cached? if so, how?
//   - [M] changes to a list aren't reflected in page till reload. Change?
//   - [M] Automatically handle case with only one list
//   - [M] Add indication of URL to use to @require library itself
//
// History:
// --------
// 2019.09.30  [1.3] Correct @namespace and other headers (for public use)
// 2019.09.27  [1.2] Refactoring and name changing: TitleList -> EntryList
// 2019.09.27  [1.1] Code cleanup (string literals, reorder functions)
//                   Check for validity of the context object
//                   Add usage documentation
// 2019.09.21  [1.0] First version
// 2019.09.18  [0.1] First test version, private use only
//
//}

/* jshint esversion: 6, supernew: true */
/* exported EL, Library_Version_ENTRYLIST */

const Library_Version_ENTRYLIST = '1.3';

/* How to use the library

This library instantitates an EL object with a startup method.

Call EL.startup(ctx), passing a "context" object that is specific to the
website you are working on.

Other functions and variables:
- mainContext: the context saved with EL.startup

- addToggleEventOnClick(button, howToFindEntry, toggleType, toggleList):
  mainly used in ctx.modifyEntry(), adds an event listener that implements
  a toggle function:
  - button: the DOM object to attach the event listener to
  - howToFindEntry: how to go from evt.target to the entry object. It can be:
    - a number: # of node.parentNode to hop to get from evt.target to to entry
    - a CSS selector: used with evt.target.closest to get to entry
  - toggleType: the processing type that is toggle by the press of the button
  - toggleList: the list where the entry is toggled when the button is pressed


Mandatory callback functions and variables in context:

- name: identifier of the site

- getPageEntries():
  return (usually with querySelectorAll) an array of entries to be treated
- determineType(lists, tt, entry):
  determine the processing type for an entry given the lists it appears in,
  the tt and entry objects may be as well used for the decision
  "lists" is an object with a true property for each list the entry appears in
- processItem(entry, tt, processingType):
  process the entry based on the processing type or other features of the entry


Conditionally mandatory callback functions and variables in context:

- getUser(): retrieve and return the username used on the website
  mandatory if data are to be stored on a per-user basis
- getIdFromEntry(entry): return a tt: { id, name } object from the entry
  mandatory if you want to save entries to lists
- unProcessItem(entry, tt, processingType):
  like processItem, but it should reverse the action
  mandatory for entries that have a toggle action added with
  EL.addToggleEventOnClick()


Optional callback functions and variables in context:

- interval: interval (in ms) to re-scan links in the DOM
            won't re-scan if < MIN_INTERVAL
            dafault: DEFAULT_INTERVAL

- isEntryPage():
  returns false if page must not be scanned for entries
  default is always true (all pages contain entries)
- isValidEntry(entry):
  return false if entry must be skipped
  default is always true (all entries returned by "getPageEntries" are valid)
- modifyEntry(entry):
  optionally modify entry when scanned for the first time (e.g. add a button)
  see also EL.addToggleEventOnClick() above

*/


var EL = new (function() {
    'use strict';
    const STORAGE_SEP      = '-';
    const FAKE_USER        = '_';
    const MIN_INTERVAL     = 100;
    const DEFAULT_INTERVAL = 1000;

    var self = this;

    this.mainContext = null;


    /* PRIVATE members */

    // Check if "object" has "property" of "type"
    function checkProperty(object, property, type, optional) {
        if (typeof object[property] !== type && (!optional || typeof object[property] !== 'undefined')) {
            console.error((optional ? 'Optionally, c' : 'C') + 'ontext must have a "' + property + '" property of type "' + type + '"');
            return false;
        }
        else return true;
    }

    function isValidTargetContext(ctx) {
        var valid = true;

        valid &= checkProperty(ctx, 'name',           'string');
        valid &= checkProperty(ctx, 'getPageEntries', 'function');
        valid &= checkProperty(ctx, 'determineType',  'function');
        valid &= checkProperty(ctx, 'processItem',    'function');
        valid &= checkProperty(ctx, 'interval',       'number',   true);
        valid &= checkProperty(ctx, 'isEntryPage',    'function', true);
        valid &= checkProperty(ctx, 'isValidEntry',   'function', true);
        valid &= checkProperty(ctx, 'modifyEntry',    'function', true);
        valid &= checkProperty(ctx, 'getUser',        'function', true);
        valid &= checkProperty(ctx, 'getIdFromEntry', 'function', true);
        valid &= checkProperty(ctx, 'unProcessItem',  'function', true);

        return !!valid;
    }

    // Load a single saved lists
    function loadSavedList(listName) {
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

    var storName = {
        'lastUser':    function(ctx)           { return ctx.name    + STORAGE_SEP + 'lastUser'; },
        'listOfLists': function(ctx)           { return'EntryLists' + STORAGE_SEP + ctx.user; },
        'listName':    function(ctx, listName) { return'EntryList'  + STORAGE_SEP + ctx.user + STORAGE_SEP + listName; },
    };


    // Return name of user currently logged on <ctx> site
    // Return last saved value and log error if no user is found
    this.getLoggedUser = function(ctx) {
        if (!ctx.getUser) return FAKE_USER;

        var user = ctx.getUser();
        if (!user) {
            console.error(ctx.name + ": user not logged in (or couldn't get user info) on URL " + document.URL);
            user = GM_getValue(storName.lastUser(ctx), '');
            console.error('Using last user: ' + user);
        }
        GM_setValue(storName.lastUser(ctx), user);
        ctx.user = user;
        return user;
    };


    // Load lists saved for the current user
    this.loadSavedLists = function(ctx) {
        var lists = {};

        var listNames = loadSavedList(storName.listOfLists(ctx));
        if (!listNames) return lists;

        for (var listName in listNames) {
            lists[listName] = loadSavedList(storName.listName(ctx, listName));
        }
        return lists;
    };


    // Save single list for the current user
    this.saveList = function(ctx, list, name) {
        var listNames = ( loadSavedList(storName.listOfLists(ctx)) || {} );

        listNames[name] = 1;
        var userData = JSON.stringify(listNames);
        GM_setValue(storName.listOfLists(ctx), userData);

        userData = JSON.stringify(list);
        GM_setValue(storName.listName(ctx, name), userData);
    };


    // Receives an entry tt and finds all lists where tt.id appears
    this.inLists = function(ctx, tt) {
        var lists = {};

        for (var list in ctx.allLists) {
            if (ctx.allLists[list][tt.id]) lists[list] = true;
        }

        return lists;
    };


    // Process all entries in current page
    this.processEntries = function(ctx) {
        var entries = ctx.getPageEntries();
        if (!entries) return;

        var entry, tt, lists, processingType;
        for (var i = 0; i < entries.length; i++) {
            entry = entries[i];

            // if entry has already been previously processed, skip it
            if (entry.ELProcessed) continue;

            // see if entry is valid
            if (ctx.isValidEntry && !ctx.isValidEntry(entry)) continue;

            tt = null;
            if (ctx.getIdFromEntry) {
                tt = ctx.getIdFromEntry(entry);
                if (!tt) continue;
            }

            if (ctx.modifyEntry) ctx.modifyEntry(entry);
            lists = ( tt ? self.inLists(ctx, tt) : {} );

            processingType = ctx.determineType(lists, tt, entry);

            if (processingType) {
                ctx.processItem(entry, tt, processingType);
                entry.ELProcessingType = processingType;
            }

            entry.ELProcessed = true; // set to "true" after processing (so we skip it on next pass)
        }
    };


    this.toggleEntry = function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var data = evt.target.dataset;
        var ctx = self.mainContext;

        // get corresponding entry
        var entry = evt.target;
        if (Number.isInteger(Number(data.howToFindEntry))) {
            for (var i = 0; i < Number(data.howToFindEntry); i++) entry = entry.parentNode;
        } else {
            entry = entry.closest(data.howToFindEntry);
        }

        var tt = ctx.getIdFromEntry(entry);
        if (!tt) return;

        // check if item is in list
        var list = ctx.allLists[data.toggleList];
        if (!list) list = ctx.allLists[data.toggleList] = {};
        if (list[tt.id]) {
            delete list[tt.id];
            ctx.unProcessItem(entry, tt, data.toggleType);
            entry.ELProcessingType = '-' + data.toggleType;
        } else {
            list[tt.id] = tt.name;
            ctx.processItem(entry, tt, data.toggleType);
            entry.ELProcessingType = data.toggleType;
        }
        self.saveList(ctx, list, data.toggleList);
    };



    /* PUBLIC members */

    // startup function
    this.startup = function(ctx) {
        // check that passed context is good
        if (!isValidTargetContext(ctx)) {
            console.log('Invalid context, aborting');
            return;
        }

        self.mainContext = ctx;

        //TODO forse salvare una variabile we_are_in_an_entry_page nel contesto?
        //TODO per altri casi lo startup deve fare anche altro
        if (!( !ctx.isEntryPage || ctx.isEntryPage() )) return;

        // find current logged in user, or quit script
        if (!self.getLoggedUser(ctx)) {
            console.log('No user is defined, aborting');
            return;
        }

        // Load list data for this user from local storage
        ctx.allLists = self.loadSavedLists(ctx);

        // start the entry processing function
        self.processEntries(ctx);
        if (typeof ctx.interval === 'undefined' || ctx.interval >= MIN_INTERVAL) {
            // TODO we might consider using MutationObserver in the future, instead
            ctx.timer = setInterval(function() {self.processEntries(ctx);}, ctx.interval || DEFAULT_INTERVAL);
        }
    };


    this.addToggleEventOnClick = function(button, toggleType, toggleList, howToFindEntry) {
        button.dataset.toggleType     = toggleType;
        button.dataset.toggleList     = toggleList;
        button.dataset.howToFindEntry = howToFindEntry;
        button.addEventListener('click', self.toggleEntry, false);
    };


})();

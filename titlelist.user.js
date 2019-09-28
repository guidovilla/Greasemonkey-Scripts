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

function getLoggedUser(ctx) {
   //
   // Return name of user currently logged on site (log on console if failed)
   // Return last saved value if no user is found
   //
   var user = ctx.getUser();

   if (!user) {
      console.error(ctx.name + ": user not logged in (or couldn't get user info) on URL " + document.URL);
      user = GM_getValue(ctx.name + '-lastUser', '');
      console.error("Using last user: " + user);
   }
   GM_setValue(ctx.name + '-lastUser', user);
   return user;
}
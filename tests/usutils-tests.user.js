// ==UserScript==
// @name            Test - US_Utils
// @description     Test the US_Utils library - internal use only
// @version         1.0
// @author          guidovilla
// @copyright       2019, Guido Villa (https://greasyfork.org/users/373199-guido-villa)
// @license         GPL-3.0-or-later
// @homepageURL     https://gitlab.com/gv-browser/userscripts
// @supportURL      https://gitlab.com/gv-browser/userscripts/issues
//
// @namespace       https://greasyfork.org/users/373199-guido-villa
//
// @match           https://www.google.com/*
// @connect         google.com
// @connect         nonexistant.domain.dont
//
// @require         https://greasyfork.org/scripts/391648-us-utils/code/US_Utils.js
// @grant           GM_xmlhttpRequest
// ==/UserScript==

/* jshint esversion: 6, laxbreak: true, -W008 */
/* global UU: readonly */

(function() {
    'use strict';

    var tst = (function() {
        var tstNo = 0;
        return function(test, expected, ...result) {
            console.log(++tstNo, 'Test: ' + test, 'Expected:', expected, 'Result:', ...result);
        };
    }());


    tst('me', 'script name', UU.me);

    var undefined_var;
    var defined_var = false;
    tst('isUndef', 'true, false', UU.isUndef(undefined_var), UU.isUndef(defined_var));

    tst('le','log error line "[script name] An error occurred"');
    UU.le('An error occurred');
    tst('lw','log warning line "[script name] A warning occurred"');
    UU.lw('A warning occurred');
    tst('li','log info line "[script name] Some information"');
    UU.li('Some information');
    tst('ld','log debug line "[script name] Debug data with multiple arguments" false 3 { "p1": 3, "p2": "p" }');
    UU.ld('Debug data','with','multiple','arguments',false,3,{ 'p1': 3, 'p2': 'p' });

    var i = 0;
    var obj = { 'prop1': 2, 'prop2': function() { /**/ } };
    tst('checkProperty ' + ++i, true, UU.checkProperty(obj, 'prop1', 'number'));
    tst('checkProperty ' + ++i, true, UU.checkProperty(obj, 'prop2', 'function'));
    tst('checkProperty ' + ++i, true, UU.checkProperty(obj, 'prop3', 'string', true));
    tst('checkProperty ' + ++i, 'false, missing prop3', UU.checkProperty(obj, 'prop3', 'string'));
    tst('checkProperty ' + ++i, 'false, prop1 must be string', UU.checkProperty(obj, 'prop1', 'string'));
    tst('checkProperty ' + ++i, 'false, prop2 must be object', UU.checkProperty(obj, 'prop2', 'object'));

    var csv = 'a,"b","c\nc"\n"d,d","e""",4';
    tst('parseCSV', '2x3 array with: a b c<newline>c  d,d e" 4', UU.parseCSV(csv));

    tst('wait','wait 10 seconds, then log info "10 seconds have passed"', UU.wait(10000, '10 seconds have passed').then(UU.li));
    tst('thenWait','log info "start", wait 15 second, log info "15 seconds have passed"');
    UU.li('start');
    Promise.resolve('15 seconds have passed').then(UU.thenWait(15000)).then(UU.li);

    i = 0;
    tst('GM_xhR ' + ++i,'log info downloaded www.google.com page');
    UU.GM_xhR('GET', 'http://www.google.com', 'test dnd ' + i).then(UU.li).catch(UU.le);
    tst('GM_xhR ' + ++i,'2x log error server not found');
    UU.GM_xhR('GET', 'http://nonexistant.domain.dont', 'test dnd ' + i).then(UU.li).catch(UU.le);
    tst('GM_xhR ' + ++i,'2x log error 404 error');
    UU.GM_xhR('GET', 'http://google.com/ssdytrfddd', 'test dnd ' + i).then(UU.li).catch(UU.le);
    tst('GM_xhR ' + ++i,'log info downloaded www.google.com page, parsed document in responseXML2');
    UU.GM_xhR('GET', 'http://www.google.com', 'test dnd ' + i, { 'responseType': 'document' }).then(function(resp){UU.li(resp.context,'\n',resp.responseXML2.querySelector('body').innerHTML);}).catch(UU.le);

}());

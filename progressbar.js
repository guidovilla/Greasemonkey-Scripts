// Copyright (C) 2019, Guido Villa
//
// Original core of the script is taken from IMDb 'My Movies' enhancer:
// Copyright (C) 2008-2018, Ricardo Mendonça Ferreira (ric@mpcnet.com.br)
// Released under the GPL license - http://www.gnu.org/copyleft/gpl.html

// TODO:
// - headers and such => make a library
// - width must be an integer multiple of background-size, otherwise animation will skip => address
// - speed of the animation depends on width => fix
// - speed of transition is not constant (time is constant, regardless of the "space" to be travelled) => can it be fixed?
// - user documentation
// - wrap in order to hide global variables

    // Create a simple progress bar, parameters:
    // - finish: maximum value to be reached for 100% (default is 100)
    // - msg: message to write in the bar, some characters are substituted:
    //        - {#}: current progress number
    //        - {$}: value specified by finish
    //        - {%}: completion percentage (integer)
    //        default is "Loading #/$..."
    // - options: an object that may contain:
    //   - start: initial progress status (default is 0, i.e. the beginning)
    //   - container: positioned element where the bar will be centered
    //              null (the default): center on the screen
    //   - width: width in pixels of the progress bar (default is 200)
    //   - height: height in pixels of the progress bar (default is 30)
    // A progress value of -1 enables "generic loading mode".
    var progress_bar_style_has_been_loaded = false;
    var progress_bar_index = 0;
    // eslint-disable-next-line max-statements
    function ProgressBar(finish = 100, msg = 'Loading {#}/{$}...', options) {
        // style definition
        var STYLE = '.pb-progress-bar-box{border:2px solid black;background-color:white;}'
                  + '.pb-progress-bar-bar{background-color:green;height:100%;transition:width 300ms linear;}'
                  + '.pb-progress-bar-txtcont{position:absolute;top:0;left:0;width:100%;height:100%;display:table;}'
                  + '.pb-progress-bar-txt{display:table-cell;text-align:center;vertical-align:middle;font:16px verdana,sans-serif;color:black;}'
                  + '.pb-progress-bar-box.pb-generic{background:repeating-linear-gradient(-45deg,#F0F0F0 0 20px,#ccc 20px 40px);background-size:56.56854px;animation:2s linear infinite loading;}'
                  + '.pb-progress-bar-box.pb-generic .pb-progress-bar-bar{background-color:transparent;transition:none}'
                  + '@keyframes loading{from{background-position-x:0%;} to{background-position-x:100%;}}';
        if (!progress_bar_style_has_been_loaded) {
            GM_addStyle(STYLE);
            progress_bar_style_has_been_loaded = true;
        }

        var self = this;

        // basic configuration
        this.id       = 'pb-progress-bar-' + ++progress_bar_index; // 'id' is public
        var start     = 0;
        var container = null;
        var width     = 226.27417;
        var height    = 30;
        var message   = msg;

        var current;  // completion status of the progress bar

        var pbBox, pb, pbTxtCont, pbTxt;  // elements of the progress bar

        // helper function to create the elements
        function createElement(father, elementType, className, id) {
            var elem = document.createElement(elementType);
            if (typeof id !== 'undefined') elem.id = id;
            elem.className = className;
            father.appendChild(elem);
            return elem;
        }

        // initialization function
        function init() {
            // check for options in the call
            if (options && typeof options === 'object') {
                if (typeof options.id        !== 'undefined') self.id   = options.id;
                if (typeof options.start     !== 'undefined') start     = options.start;
                if (typeof options.container !== 'undefined') container = options.container;
                if (typeof options.width     !== 'undefined') width     = options.width;
                if (typeof options.height    !== 'undefined') height    = options.height;
            }

            // calculate positioning
            var containerWidth, containerHeight,
                cntElem,
                positioningStyle;

            function setPositioningVars(cnt, pos, w, h) {
                containerWidth  = w;
                containerHeight = h;
                cntElem = cnt;
                positioningStyle = pos;
            }

            if (container) {
                var rect = container.getBoundingClientRect();
                setPositioningVars(container, 'absolute', rect.width, rect.height);
            } else {
                setPositioningVars(document.body, 'fixed', window.innerWidth, window.innerHeight);
            }
            var top  = containerHeight / 2 - height / 2;
            var left = containerWidth  / 2 - width  / 2;

            // create the elements
            pbBox = createElement(cntElem, 'div', 'pb-progress-bar-box', self.id);
            pbBox.style.cssText = 'position:' + positioningStyle
                                + '; height:' + height + 'px;width:' + width
                                + 'px;top:'   + top    + 'px;left:'  + left + 'px;';

            pb        = createElement(pbBox,     'div', 'pb-progress-bar-bar');
            pbTxtCont = createElement(pbBox,     'div', 'pb-progress-bar-txtcont');
            pbTxt     = createElement(pbTxtCont, 'div', 'pb-progress-bar-txt');

            // set the initial progress
            self.update(start);
        }


        /* PUBLIC members */

        // update the progress to "currentVal" and optionally change the message
        // default: go back to zero
        this.update = function(currentVal = 0, newMsg) {
            if (newMsg) message = newMsg;
            var newVal = (currentVal > finish ? finish : currentVal);

            if (newVal < 0) {
                // setting the width to zero is not really needed, but ensures a
                // more consistent behaviour in cases where the delay (see
                // below) is not enough.
                pb.style.width = '0';
                // try to make the message more appealing in "generic" case
                pbTxt.textContent = message
                                    .replace(/ *{#}.*{\$} */g, '')
                                    .replace(/ *{#} */g,       '')
                                    .replace(/ *{\$} */g,      '')
                                    .replace(/ *{%} *%? */g,   '');
                pbBox.classList.add('pb-generic');
            } else {
                pb.style.width = (100*newVal/finish) + '%';
                if (current < 0) {
                    // if exiting from "generic" mode a small delay is needed,
                    // otherwise the class may be removed when changing the
                    // width, and the width transition takes place anyway
                    setTimeout(function() {
                        pbBox.classList.remove('pb-generic');
                    }, 33);
                } else {
                    pbBox.classList.remove('pb-generic');
                }
                // replace placeholders with actual numbers
                pbTxt.textContent = message
                                    .replace(/{#}/g, newVal)
                                    .replace(/{\$}/g, finish)
                                    .replace(/{%}/g, Math.round(100*newVal/finish));
            }
            current = newVal;
        };


        // advance the progress by "value" and optionally change the message
        // default: advance of 1
        this.advance = function(value = 1, newMsg) {
            self.update(current + value, newMsg);
        };


        // close/remove the progress bar
        this.close = function() {
            pbBox.parentNode.removeChild(pbBox);
        };


        /* INITIALIZATION */
        init();
    }

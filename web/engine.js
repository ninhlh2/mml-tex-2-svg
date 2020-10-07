
window.engine = (function() {

    var Q = MathJax.Hub.queue;
    var in_formats = ["latex", "mml"];
    var types = {};
    var current_type;
    var buffer = [];
	var mmlFromLatex;
	var debug="";

    // Initialize the engine. This is pushed onto the MathJax queue to make sure
    // it is called after MathJax initialization is done.
    var _init = function() {
        Q.Push(function () {
            in_formats.forEach(function(format) {
                var id = "math-" + format;
                var div = document.getElementById(id);
                var jax = MathJax.Hub.getAllJax(id)[0];
                types[format] = {
                    div: div,
                    jax: jax,
                    script_elem: document.getElementById(jax.inputID),
                    error_message: ''
                }
            });
			
            // Capture all error signals
            MathJax.Hub.signal.Interest(function(message) {
                var m = message[0];
                if (m.match("^TeX Jax") || m.match("^MathML Jax")) {
                    current_type.error_message = message[0] + ": " + message[1];
                }
            });

            _process_buffered();
        });
    };
	
	var toMathML = function (jax,callback) {
		var mml;
		try {
			mml = jax.root.toMathML("");
		} catch(err) {
			if (!err.restart) {throw err} // an actual error
				return MathJax.Callback.After([toMathML,jax,callback],err.restart);
		}
		MathJax.Callback(callback)(mml);
	}

    // If someone calls process() before init is complete, that call will be stored into 
    // a buffer. After the init is complete, all buffered stuff will get resolved.
    var _process_buffered = function() {
        for (var i = 0; i < buffer.length; ++i) {
            process(buffer[i][0], buffer[i][1]);
        }
        buffer = [];
    };


    // Serialize an (svg) element
    var _serialize = function(svg) {
        var tmpDiv = document.createElement('div');
        tmpDiv.appendChild(svg);
        return tmpDiv.innerHTML;
    };
	
	
	var _getSize = function(svgString){
		var first = svgString.indexOf('height="');
		var last = svgString.indexOf('ex"', first + 8, svgString.length);
		var height = svgString.substring(first + 8, last);

		first = svgString.indexOf('width="');
		last = svgString.indexOf('ex"', first + 7, svgString.length);
		var width = svgString.substring(first + 7, last);

		first = svgString.indexOf('vertical-align: -');
		last = svgString.indexOf('ex;', first + 17, svgString.length);
		var baseline = svgString.substring(first + 17, last);
		
		return [height, width, baseline];
	};

    // MathJax keeps parts of SVG symbols in one hidden svg at
    // the begining of the DOM, this function should take two
    // SVGs and return one stand-alone svg.
    var _merge_svgs = function(svg) {
        var origDefs = document.getElementById('MathJax_SVG_Hidden')
            .nextSibling.childNodes[0];
        var defs = origDefs.cloneNode(false);

        // append shallow defs and change xmlns.
        svg.insertBefore(defs, svg.childNodes[0]);
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        // clone and copy all used paths into local defs.
        // xlink:href in uses FIX
        var uses = svg.getElementsByTagName("use");
        for (var k = 0; k < uses.length; ++k) {
            var id = uses[k].getAttribute("href");
            defs.appendChild(
                document.getElementById(id.substr(1)).cloneNode(true)
            );
            if (uses[k]["href"] === undefined) {
                uses[k].setAttribute("xlink:href", id);
            }
        }

        svg.style.position = "static";
        return _serialize(svg);
    };


    // The process() function is called from main.js's listenLoop, when it gets
    // a request that requires MathJax.
    // When process() is finished, the callback cb will be invoked with an
    // array [<q string>, <svg out>]. That, in turn, causes the page's onCallback
    // function to be called (in main.js), which sends the response to the client.
    // If there is an error during the rendering, then the second
    // element, instead of a string, will be a nested array with
    // one string element giving the error message.
    var process = function(query, cb) {
        // For debugging, the console doesn't work from here, but you can return dummy
        // data, as follows.  It will show up in the browser instead of the real results.
        //cb([query.num, query.q, ["debug message"]]);
        //return;
//debug=JSON.stringify(query, undefined, 2);
        var t = types[query.in_format];
        if (typeof t === 'undefined') {
            cb([query.num, query.q, ["Invalid in_format: '" + query.in_format + "'"]]);
            return;
        }

        // If we get called too early, buffer the request
        if (t === null || t.jax === null) {
            buffer.push( [query, cb] );
            return;
        }

        var q = query.q,
            width = query.width,
            div = t.div,
            jax = t.jax,
            script_elem = t.script_elem;

        // We'll push three functions onto the queue: initialization, mathjax processing,
        // and then evaluating the results. They're all pushed at the same time, making sure
        // they get executed sequentially, with no intervening functions.

        Q.Push(
    
            // Initialize, get ready to process the equation
            function() {
                if (width === null) {
                    // Let's just use a default width of 1000 (arbitrary)
                    div.setAttribute('style', 'width: 1000px');
                }
                else {
                    div.setAttribute('style', 'width: ' + width + 'px');
                }
                current_type = t;
                current_type.error_message = '';
                script_elem.removeChild(script_elem.firstChild);
                script_elem.appendChild(document.createTextNode(q));
            },

            // (Re)process the equation. Make sure equation labels are reset, see
            // https://groups.google.com/forum/#!topic/mathjax-users/cpwy5eCH1ZQ/discussion
            ["resetEquationNumbers", MathJax.InputJax.TeX], 
            ["PreProcess", MathJax.Hub], 
            ["Reprocess", jax],

            // Evaluate the results
            function() {
                var ret = null;

                if (current_type.error_message) {
                    ret = [current_type.error_message];
                }
                else {
                    var svg_elem = div.getElementsByTagName("svg")[0];
					//var debug="";
					var ratio=7.1561;
                    if (!svg_elem) {
                        ret = ['MathJax error'];
                    }
                    else {
                        ret= _merge_svgs(svg_elem.cloneNode(true));
						var s = _getSize(ret);
						//debug= " Kich thuoc_ "+s[0];
						
						ret = ret.replace(s[0]+"ex", s[0]*ratio);
						ret = ret.replace(s[1]+"ex", s[1]*ratio);
						ret = ret.replace("style=",'wrs:baseline="'+ (s[0]-s[2])*ratio+'" style=');
						ret = ret.replace("height=",'xmlns:wrs="http://www.wiris.com/xml/cvs-extension" height=');
                    }
                }
				if(query.toMML){
					var jax = MathJax.Hub.getAllJax()[0];
					toMathML(jax,function (mml) {
						mmlFromLatex=mml;
					});
					ret=mmlFromLatex;
					query.q='latex:'+query.q;
				}

                cb([query.num, query.q, ret,debug]);
            }
        );
    };

    _init();

    // This sets the global window.engine object value; can be used for debugging
    // in a browser.
    return {
        Q: Q,
        types: types,
        buffer: buffer,
        current_type: current_type,
        _init: _init,
        _process_buffered: _process_buffered,
        _serialize: _serialize,
        _merge_svgs: _merge_svgs,
        process: process
    };
})();

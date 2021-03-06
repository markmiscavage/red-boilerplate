/* jshint node: true */

module.exports = function (grunt) {
	"use strict";

	grunt.registerTask("requirejs:uglify", "Minify your RequireJS file.", function () {
		var done = this.async();
		var uglify = require("uglify-js");
		var colors = require("colors");

		var fs = require("fs");
		var cwd = process.cwd();
		var path = require("path");

		var libs = path.join(cwd, "project", "source", "js", "libs");
		var requirePath = path.join(libs, "requirejs", "index.js");

		if (fs.existsSync(requirePath)) {
			var result = uglify.minify(requirePath, {
				outSourceMap: "require.min.js.map"
			});

			var staticPath = requirePath.replace("source", "static");
			staticPath = staticPath.replace("index.js", "require.min.js");

			grunt.log.writeln();
			grunt.log.writeln(("Minified RequireJS to " + staticPath.replace(path.join(cwd, path.sep), "")).grey);
			grunt.file.write(staticPath, result.code);

			var mapPath = staticPath.replace(".js", ".js.map");

			grunt.log.writeln(("Saved source map to " + mapPath.replace(path.join(cwd, path.sep), "")).grey);
			grunt.file.write(mapPath, result.map);
		}

		done();
	});

};

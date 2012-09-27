/*global module:false*/

module.exports = function (grunt) {

	grunt.registerTask("start", "Get your party started", function (branch, everything) {
		var fs = require("fs");
		var cp = require("child_process");
		var path = require("path");

		var done = this.async();

		var pkg = require("./utils/pkg");

		// Don't require until we know we need it
		var localPkg;

		var whitelist = [];

		var prompt;
		var remote;

		var projectName = pkg.config.vars.PROJECT_NAME;
		var projectTitle = pkg.config.vars.PROJECT_TITLE;

		var options = [{
			name: "name",
			message: "Project name?",
			validator: /^([a-z]+)(\w+)$/,
			warning: "Invalid namespace. Valid characters are [a-Z]. Must start with a lowercase",
			"default": projectName || "sampleProjectName"
		}, {
			name: "title",
			message: "Project title?",
			"default": projectTitle || "Sample Project Title"
		}];

		var finalizeInstall = function () {
			var org = {
				name: pkg.name,
				version: pkg.version,
				repository: pkg.repository
			};

			pkg.save();

			pkg.name = pkg.config.vars.PROJECT_NAME;
			pkg.description = "";
			pkg.version = "0.0.0";

			var url = pkg.repository.url;
			pkg.repository.url = remote || "";

			org.repository.url = url;
			org.repository.branch = branch || "master";

			pkg.config.org = org;

			pkg.config.initialized = true;
			pkg.save();

			grunt.log.writeln();
			grunt.log.writeln("[*] " + "Run `grunt tasks` for a list of available tasks.".cyan);
			grunt.log.writeln("[*] " + "You should edit your package.json and fill in your project details.".cyan);
			grunt.log.writeln("[*] " + "All done! Commit you changes and you're on your way.".cyan);

			done();
		};

		var resetGit = function () {
			var child = cp.spawn("git", ["reset", "--hard", "HEAD"], {
				cwd: pkg.config.dirs.robin,
				env: null,
				setsid: true,
				stdio: "inherit"
			});

			child.on("exit", function () {
				finalizeInstall();
			});
		};

		var handleSettings = function(err, props) {
			var name = props.name;
			var title = props.title;

			delete props.name;
			delete props.title;

			var plugArr = whitelist;
			var i = 0;

			for (var key in props) {
				var assert = grunt.helper("get_assertion", props[key]);

				if (assert) {
					plugArr.push(key);
				}
			}

			// Sort by name
			plugArr = plugArr.sort();

			grunt.helper("store_vars", name, title, function () {
				grunt.log.writeln("[*] " + "Stored and updated your project variables.".cyan);
				grunt.log.writeln();

				(function install (count) {
					if (!plugArr[count]) {
						resetGit();
						return;
					}

					grunt.helper("install_plugin", plugArr[count], null, function (stop) {
						if (stop === true) {
							done(false);
							return;
						}

						count++;

						if (plugArr[count]) {
							install(count);
						} else {
							resetGit();
						}
					});
				}(i));

			});
		};

		var promptForSettings = function (plugins) {
			var i, j, plugin,
				installed = pkg.config.installedPlugins;

			if (installed) {
				var plugTitle;

				for (var key in installed) {
					if (!plugTitle) {
						grunt.log.writeln();
						grunt.log.writeln("[*] ".cyan + "Installed plugins:".magenta);
						plugTitle = true;
					}

					var plug = installed[key];

					if (typeof plug !== "string") {
						grunt.log.writeln("[+] ".grey + "%n %v".replace("%n", key).replace("%v", plug.version).cyan + " (%d)".replace("%d", plug.description).grey);
					} else {
						grunt.log.writeln("[+] ".grey + key.cyan + " (%d)".replace("%d", plug).grey);
					}
				}
			}

			for (i = 0, j = plugins.length; i < j; i++) {
				plugin = plugins[i];

				if (!installed || !installed[plugin]) {
					options.push({
						name: plugin,
						message: "Would you like to include %s?".replace("%s", plugin),
						validator: /[y\/n]+/i,
						"default": "Y/n"
					});
				}
			}

			if (everything) {
				handleSettings(null, function () {
					var opts = {};

					for (i = 0, j = options.length; i < j; i++) {
						opts[options[i].name] = "y";
					}

					return opts;
				}());
			} else {
				grunt.helper("prompt", {}, options, handleSettings);
			}
		};

		var gatherPlugins = function () {
			grunt.helper("check_for_available_plugins", promptForSettings);
		};

		var getThisPartyStarted = function () {
			if (pkg.config.initialized) {
				grunt.log.writeln();
				grunt.log.writeln("[*] " + "This party's already been started. You can install individual plugins with `grunt install`".cyan);
				grunt.log.writeln("[*] " + "Run `grunt tasks` for a list of available tasks.".cyan);

				done();
			} else {
				prompt = require("prompt");
				prompt.message = (prompt.message !== "prompt") ? prompt.message : "[?]".white;
				prompt.delimiter = prompt.delimter || " ";

				grunt.log.writeln();

				grunt.utils.spawn({
					cmd: "git",
					args: ["status"]
				}, gatherPlugins);
			}
		};

		var runInitializeScripts = function (i) {
			i = (i || 0);

			if (!pkg.scripts || !pkg.scripts.initialize || !pkg.scripts.initialize[i]) {
				return getThisPartyStarted();
			}

			var initScript = pkg.scripts.initialize[i];
			var args = initScript.split(" "),
				cmd = args.shift(),
				file = args.join("");

			if (cmd === "node" && fs.existsSync("./" + file)) {
				grunt.log.subhead(args);

				var initializer = require(fs.realpathSync(file));

				initializer.run(function (error) {
					if (error) {
						grunt.fail.warn(error);
					}

					runInitializeScripts(++i);
				});
			} else {
				runInitializeScripts(++i);
			}
		};

		var checkIfPartyStarted = function () {
			localPkg = require("./utils/local-pkg");

			var local = localPkg.config,
				requiredPaths = local.requiredPaths,
				i, j, req;

			for (i = 0, j = requiredPaths.length; i < j; i++) {
				if (!fs.existsSync("./" + requiredPaths[i])) {
					local.initialized = false;
				}
			}

			if (local.initialized === true) {
				getThisPartyStarted();
			} else {
				local.initialized = true;
				localPkg.config = local;

				localPkg.save();
				runInitializeScripts();
			}
		};

		var checkSystemDependencies = function (sysDeps) {
			if (sysDeps) {
				grunt.helper("check_dependencies", sysDeps, function (name) {
					checkIfPartyStarted();
				}, function (error) {
					done(error);
				});
			} else {
				checkIfPartyStarted();
			}
		};

		var installNPMModules = function () {
			var child = cp.spawn("npm", ["install", "--production"], {
				env: null,
				setsid: true,
				stdio: "inherit"
			});

			child.addListener("exit", function () {
				checkSystemDependencies(pkg.systemDependencies);
			});
		};

		(function () {
			installNPMModules();
		}());

	});

};

/*jslint node: true */

module.exports = function (grunt, helper, cb) {
	"use strict";

	var config = require("../../plugin.json").config;
	var cwd = process.cwd();
	var path = require("path");
	var fs = require("fs");

	var scarletDir = "scarlet";

	var runSetup = function () {
		helper.spawn({
			cmd: "git",
			args: ["submodule", "add", config.repo, scarletDir],
			title: "Adding scarlet as a submodule",
			complete: function (code) {
				if (code !== 0) {
					return exit("Something went wrong while adding the submodule");
				}

				helper.spawn({
					cmd: "git",
					args: ["submodule", "update", "--init", scarletDir],
					title: "Update submodule",
					complete: function (code) {
						return exit();
					}
				});
			}
		});
	};

	var checkInstall = function () {
		if (fs.existsSync(path.join(cwd, scarletDir))) {
			helper.spawn({
				cmd: "git",
				args: ["submodule", "update", "--init", scarletDir],
				title: "Update submodule",
				complete: function (code) {
					return exit();
				}
			});
		} else {
			runSetup();
		}
	};

	var exit = function (error) {
		if (cb) {
			cb(error);
		} else {
			process.exit();
		}
	};

	checkInstall();
};

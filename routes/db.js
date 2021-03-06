var express 		= require('express');
var bodyParser 		= require('body-parser');
var urlencoded 		= bodyParser.urlencoded({extended: false});
var jsonencode 		= bodyParser.json();
var mongo 			= require('mongodb');
var jwt 			= require('jsonwebtoken');
var User 			= require('./../models/user');
var Dropbox 		= require('./../models/dropbox');
var validator 		= require('validator');
var router 			= express.Router();
var mongoose 		= require('mongoose');
var authenticate	= require('./authentication');
var url 			= require('url');
var request_mod		= require('request');
var fs 				= require('fs');
var emailSender		= require('./../email');
var User 			= require('./../models/user');
var Mailgun 		= require('mailgun-js');

/* Dropbox List_folder response example:

{ '.tag': 'file',
  name: 'Trim drawing.pdf',
  path_lower: '/trim drawing.pdf',
  id: 'id:o7Zz2-J5qpAAAAAAAAAAAw',
  client_modified: '2016-01-26T01:11:56Z',
  server_modified: '2016-01-26T01:11:56Z',
  rev: '243c288b6',
  size: 97465 }
{ '.tag': 'file',
  name: 'Breitling back.pdf',
  path_lower: '/breitling back.pdf',
  id: 'id:o7Zz2-J5qpAAAAAAAAAABA',
  client_modified: '2016-01-26T01:20:07Z',
  server_modified: '2016-01-26T01:20:07Z',
  rev: '343c288b6',
  size: 245061 }

*/


function getMailgunAttachments(options, cb) {

	// takes a file list and builds Mailgun attachments for the files
	// If all files have not downloaded in 30 seconds function throws an error
	// Callback is only called once all attachments have been built
	// Callback is cb(error, attachments) format with <attachments> ready to be sent with Mailgun API

	// 									********
	// options:
	//		fileList: 		REQUIRED [Array] of files/folders, presumably returned from
	//							getUpdatedFiles
	//		access_token: 	REQUIRED [String] Dropbox access token for these files
	//		filter: 		OPTIONAL [Array] of strings representing file extensions to
	//							download. For instance, pass ["pdf", "docx", "doc"] to
	//							only download PDF and Word documents
	//      maxSize: 		OPTIONAL [Number](def: 1024000) The maximum file size, in bytes,
	//      					to attempt to attach. Larger files will be ignored
	//
	var apiKey = process.env.MAILGUN_API_KEY;
	var mailDomain = process.env.MAILGUN_EMAIL_DOMAIN;
	var mailgun = new Mailgun({apiKey: apiKey, domain: mailDomain});
	var maxSize = options.maxSize || 1024000;
	var hasTimedOut = false;
	var timer = setTimeout(function() {
		// SEE: https://jsfiddle.net/LdaFw/1/
	    // do something to handle the timeout case here
	    // for exampe, pass a default value to your callback
	    cb("Downloads timed out");

	    // also, let the program remember that
	    // it has timed out, so the exec-function 
	    // wont be able to invoke the callback a second time
	    hasTimedOut = true;
	 }, 30*1000);

	if ((options.fileList == undefined) || (options.access_token == undefined)) {
		cb("Must provide fileList and access_token in options");
		return;
	}

	var access_token = options.access_token, fileList = options.fileList;
	var filter = [];
	
	// make sure filter is an array of all lowercase file extensions
	if (options.filter) {
		if (typeof options.filter == "String") {
			// Instead of getting an array the function was only passed one string
			filter[0] = options.filter;
		}
		filter.push(options.filter.shift().toLowerCase());
	}
	var error = null;
	var attachments = [];
	var numOfItems = fileList.length;
	var itemsDownloadedOrSkipped = 0;
	fileList.forEach(function (file){
		if (file['.tag'] != "file") {
			// only looking for files, other options are "folder" and "deleted"
			itemsDownloadedOrSkipped++;
			if ((itemsDownloadedOrSkipped == numOfItems) && (!hasTimedOut)) {
				clearTimeout(timer);
				cb(error, attachments);
			}
			return;
		}
		if (file.size > maxSize) {
			itemsDownloadedOrSkipped++;
			if ((itemsDownloadedOrSkipped == numOfItems) && (!hasTimedOut)) {
				clearTimeout(timer);
				cb(error, attachments);
			}
			return;
		}
		var fileExtension = function(fileName) {
			var parts = fileName.split(".");
			if (parts.length == 1) return null;
			return parts[parts.length - 1].toLowerCase();
		};
		var extension = fileExtension(file.name);
		if ((filter.indexOf(extension) == -1) && (filter.length > 0)) {
			// if there is a filter array and the file extension
			// is not found in the filter just return
			itemsDownloadedOrSkipped++;
			if ((itemsDownloadedOrSkipped == numOfItems) && (!hasTimedOut)) {
				clearTimeout(timer);
				cb(error, attachments);
			}
			return;
		}

		var options = {
					url: "https://content.dropboxapi.com/2/files/download",
					method: 'POST',
					encoding: null,
					headers: 
   						{ 
     						'Dropbox-API-Arg': '{"path":"'+file.id+'"}',
    					 	Authorization: 'Bearer ' + access_token
    					}
		};
	
	
		request_mod.post(options, function (error, response, body){
			if (error) {
				cb(error);
				return;
			} else {

				var newAttch = new mailgun.Attachment({
					data: body,
					filename: file.name,
					knownLength: file.size
					//contentType: 'application/pdf'
				});

				attachments.push(newAttch);

				itemsDownloadedOrSkipped++;
				if((itemsDownloadedOrSkipped==numOfItems) && (!hasTimedOut)) {
					clearTimeout(timer);
					cb(error, attachments);
				}
			}
		})
	});

}


function getUpdatedFiles(uid,cb) {
	// Takes a database UID and returns the updated files to the callback function
	// Also returns the access_token used to access the files for follow-on functions
	// Callback format is cb(error, files, access_token)
	//console.log("Getting updated files for uid: " + uid);
	Dropbox.findOne({uid: uid}, function (error, db){
		if (error) {
			cb(error);
			return;
		}

		// If there is no saved cursor call Dropbox list_folder,
		// otherwise use the cursor and call list_folder/continue.

		var getUpdatedFilesFromDropbox = function(cursor, updatedFiles){
			// Check for updated files using either list_folder or list_folder/continue call.
			if (!cursor) {
				var post_data = {
					"path": "",
					"recursive": false, //don't try to email anything but in the normal folder
					"include_media_info": false,
					"include_deleted": false
				};
				var options = {
					url: "https://api.dropboxapi.com/2/files/list_folder",
					method: 'POST',
					headers: {
						Authorization: "Bearer " + db.access_token,
						"Content-Type": "application/json"
					},
					json: true,
					body: post_data
				};
				request_mod.post(options, function (error, httpResponse, body){
					if (error) {
						console.log("list_folder error: " + error);
						cb(error);
						return;
					}
					
					cursor = body.cursor;
					hasMore = body.has_more;
					updatedFiles = updatedFiles.concat(body.entries);

					if (!hasMore) {
						db.cursor = cursor;
						db.save(function(error){
							if (error) cb(error);
							return;
						});
						cb(null, updatedFiles, db.access_token);
					} else {
						console.log("hasMore was true.. recursively calling getUpdatedFilesFromDropbox");
						getUpdatedFilesFromDropbox(cursor, updatedFiles, db.access_token);
					}
				});
			} else {
				// a cursor already existed in the database
				var options = {
					url: "https://api.dropboxapi.com/2/files/list_folder/continue",
					method: 'POST',
					headers: {
						Authorization: "Bearer " + db.access_token,
						"Content-Type": "application/json"
					},
					json: true,
					body: {
						"cursor": cursor
					}
				};
				request_mod.post(options, function (error, httpResponse, body){
					if (error) {
						cb(error);
						return;
					}
					cursor = body.cursor;
					hasMore = body.has_more;
					updatedFiles = updatedFiles.concat(body.entries);

					if (!hasMore) {
						db.cursor = cursor;
						db.save(function(error){
							if (error) cb(error);
							return;
						});
						cb(null, updatedFiles, db.access_token);
					} else {
						console.log("hasMore was true.. recursively calling getUpdatedFilesFromDropbox");
						getUpdatedFilesFromDropbox(cursor, updatedFiles);
					}
				});
			}
		};
		getUpdatedFilesFromDropbox(db.cursor, []);
	});
}


router.route('/webhook')
	.get(function (request, response){
		if (request.query.challenge) {
			// The initial Dropbox confirmation call. Echo the parameter
			response.send(request.query.challenge);
		}
	})
	.post(jsonencode, function (request, response, next){
		var data = request.body;
		response.sendStatus(200);
		data.delta.users.forEach(function (uid){
			// Call the email - file function for each
			// Dropbox account there is an update on
			getUpdatedFiles(uid, function(error, files, access_token){
				if (error) next(error);
				getMailgunAttachments({fileList: files, access_token: access_token, filter: ["pdf"]}, function (error, attachments){
					if (error) {
						next(error);
					} else {
						if (attachments.length) {
							User.find({status: "confirmed"}, function (error, users) {
								if (error) next(error);
								emailSender.sendFiles(users, attachments, function (error){
									console.log("Sent files with error: ", error);
								});
							});
						}
					}		
				});
			});
		});
	});

router.route('/dbauthurl')
	// This route returns the link to the Dropbox authorization URL
	// where the administrator will approve Dropbox access
	.get(function(request, response) {
		var domain = process.env.DOMAIN;
		var dbAppKey = process.env.DB_APP_KEY;
		var httpScheme = process.env.HTTP_SCHEME || "https://";
		var dropboxBase = "https://www.dropbox.com/1/oauth2/authorize"
		var url = dropboxBase + "?response_type=code&client_id=" + dbAppKey + "&redirect_uri=" + httpScheme + domain + "/db/addoauth";
		response.json(url);
	});

router.route('/accountinfo')
	.get(authenticate, function (request, response) {
		if (!request.decoded.admin) {
			if (request.decoded._id != id) {
				return response.status(403).json({message: 'Administrator access required'});
			}
		} else {
			Dropbox.findOne(function(error, db){
				if (error || !db) {
					response.status(400).json({"message": "No Dropbox linked or error connecting"});
				} else {
					var options = {
						method: 'POST',
						url: "https://api.dropboxapi.com/2/users/get_current_account",
						headers: {
							"Authorization": "Bearer " + db.access_token
						}
					}
					request_mod.post(options, function(error, httpResponse, body){
						if (error) throw error;
						response.json(body);
					})
				}
			});
		}
	});

router.route('/addoauth')
	.get(urlencoded, function (request, response, next) {
		var code = request.query.code;
		var error = request.query.error;
		var error_description = request.body.error_description;
		if (error) {
			return response.status(400).send('Error:' + error_description);
		} else {

			// we have a valid code, now make a request the the dropbox API
			// to get a token
			var httpScheme = process.env.HTTP_SCHEME || "https://";
			var domain = process.env.DOMAIN;
			var redirect_uri = httpScheme + domain + "/db/addoauth";

			var post_data = {
				code: code,
				grant_type: 'authorization_code',
				client_id: process.env.DB_APP_KEY,
				client_secret: process.env.DB_APP_SECRET,
				redirect_uri: redirect_uri
			};

			request_mod.post({url: 'https://api.dropboxapi.com/1/oauth2/token', form: post_data, json: true},
				function (error, httpResponse, body){
				if (error) {
					console.log('error in post' + error);
					next(error);
				} else {
					if (httpResponse.statusCode != 200) {
						//there was an error
						console.log("Error exchanging dropbox code for token");
						console.log("Error: " + body.error);
						console.log("Description: " + body.error_description);
						response.status(400).send("Error connecting to Dropbox " + body.error_description);
					} else {
						//no error.. save token and redirect user

						//clear out database since we're only holding 1 token
						Dropbox.remove({}, function (error) {
							if (error) {
								next(error);
							} else {
								//create the new entry
								var db = new Dropbox({
									access_token: body.access_token,
									token_type: body.token_type,
									uid: body.uid
								});

								db.save(function (error, db){
									if (error) {
										throw error;
									} else {
										response.redirect('/admin');
									}
								});
							}
						});
					}
				}
			});
		}
	})


module.exports = router;
var axios = require("axios");

function displayError(err) {
	try {
		console.error(`${ new Date().toISOString() }\turl: ${err.config.url}\tmethod: ${ err.request.method}\tstatus: ${err.response.status}\tstatusText: ${err.response.statusText}\tdata: ${ (err.response.data) ? JSON.stringify(err.response.data) : 'No data' }`);
	} catch(parseErr) {
		console.error(err);
	}
}

function randomString() {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

var JXPHelper = function(opts) {
	const self = this;
	
	self.config = opts => {
		var self = this;
		for (var opt in opts) {
			self[opt] = opts[opt];
		}
	};
	self.config(opts);
	if (!self.server) throw("parameter server required");
	self.api_root = self.server;
	self.api = self.api_root + "/api";
	var _configParams = opts => {
		opts = opts || {};
		opts.apikey = self.apikey;
		var parts = [];
		for (var opt in opts) {
			if (Array.isArray(opts[opt])) {
				opts[opt].forEach(val => {
					parts.push(opt + "=" + val);
				});
			} else {
				parts.push(opt + "=" + opts[opt]);
			}
		}
		return parts.join("&");
	};

	self.url = (type, opts) => {
		return self.api + "/" + type + "?" + _configParams(opts);
	};

	self.login = async (email, password) => {
		try {
			const data = (await axios.post(`${self.api_root}/login`, { email, password })).data;
			const user = (await axios.get(`${self.api}/user/${data.user_id}?apikey=${self.apikey}`)).data;
			return { data, user };
		} catch (err) {
			return err.response.data;
		}
	}

	self.getOne = async (type, id, opts) => {
		const label = `getOne.${type}-${randomString()}`;
		if (this.debug) console.time(label);
		var url = self.api + "/" + type + "/" + id + "?" + _configParams(opts);
		try {
			var result = await axios.get(url);
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw(result.statusText);
			}
			return result.data;
		} catch(err) {
			if (this.debug) console.timeEnd(label);
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	};

	self.get = async (type, opts) => {
		const label = `get.${type}-${randomString()}`;
		if (this.debug) console.time(label);
		var url = self.url(type, opts);
		try {
			var result = await axios.get(url);
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw(result.statusText);
			}
			return result.data;
		} catch(err) {
			if (this.debug) console.timeEnd(label);
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	};

	self.query = async(type, query, opts) => {
		const label = `query.${type}-${randomString()}`;
		if (this.debug) console.time(label);
		var url = `${self.api_root}/query/${type}?${_configParams(opts)}`;
		try {
			var result = await axios.post(url, {query});
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw(result.statusText);
			}
			return result.data;
		} catch(err) {
			if (this.debug) console.timeEnd(label);
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	self.count = async(type, opts) => {
		const label = `count.${type}-${randomString()}`;
		if (this.debug) console.time(label);
		opts = opts || {};
		opts.limit = 1;
		var url = self.url(type, opts);
		try {
			var result = await axios.get(url);
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw (result.statusText);
			}
			return result.data.count;
		} catch (err) {
			if (this.debug) console.timeEnd(label);
			displayError(err);
			throw (err.response ? err.response.data : err);
		}
	}

	self.post = async (type, data) => {
		var url = self.api + "/" + type + "?apikey=" + self.apikey;
		if (this.debug) console.log("POSTing to ", url, data);
		try {
			return (await axios.post(url, data)).data;
		} catch(err) {
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	};

	self.put = async (type, id, data) => {
		var url = self.api + "/" + type + "/" + id + "?apikey=" + self.apikey;
		if (this.debug) console.log("PUTting to ", url, data);
		try {
			return (await axios.put(url, data)).data;
		} catch(err) {
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	};

	self.postput = async (type, key, data) => {
		// Post if we find key=id, else put
		var self = this;
		var obj = {};
		obj["filter[" + key + "]"] = data[key];
		try {
			var result = await self.get(type, obj);
			if (result.count) {
				var id = result.data[0]._id;
				return self.put(type, id, data);
			} else {
				return self.post(type, data);
			}
		} catch(err) {
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	};

	self.del = async (type, id) => {
		var url = self.api + "/" + type + "/" + id + "?apikey=" + self.apikey;
		try {
			return (await axios.delete(url)).data;
		} catch(err) {
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	};

	// This should be rewritten as an async pattern
	self.delAll = (type, key, id) => {
		var self = this;
		var obj = {};
		obj["filter[" + key + "]"] = id;
		return self.get(type, obj)
		.then(function(result) {
			var queue = [];
			if (result.count === 0)
				return true;
			result.data.forEach(function(row) {
				queue.push(function() {
					if (this.debug) console.log("Deleting", row._id);
					return self.del(type, row._id);
				});
			});
			return queue.reduce(function(soFar, f) {
				return soFar.then(f);
			}, Q());
		});
	};

	// This should be rewritten as an async pattern
	self.sync = (type, key, id, data) => {
		// Given the records filtered by key = id, we create, update or delete until we are in sync with data.
		var obj = {};
		obj["filter[" + key + "]"] = id;
		return self.get(type, obj)
		.then(function(result) {
			var data_ids = data.filter(function(row) {
				return (row._id);
			}).map(function(row) {
				return row._id;
			});
			var dest_ids = result.data.map(function(row) {
				return row._id;
			});
			// console.log("data_ids", data_ids);
			// console.log("dest_ids", dest_ids);
			var deletes = dest_ids.filter(function(n) {
				return data_ids.indexOf(n) == -1;
			}) || [];
			var moreinserts = data_ids.filter(function(n) {
				return (dest_ids.indexOf(n) == -1);
			}) || [];
			var inserts = data.filter(function(row) {
				return (moreinserts.indexOf(row._id) != -1) || !(row._id);
			});
			var update_ids = dest_ids.filter(function(n) {
				return data_ids.indexOf(n) != -1;
			}) || [];
			var updates = data.filter(function(row) {
				return update_ids.indexOf(row._id) != -1;
			}) || [];
			var queue = [];
			inserts.forEach(function(insert_data) {
				queue.push(function() {
					if (this.debug) console.log("Inserting", insert_data);
					self.post(type, insert_data);
				});
			});
			updates.forEach(function(update_data) {
				queue.push(function() {
					if (this.debug) console.log("Updating", update_data);
					self.put(type, update_data._id, update_data);
				});
			});
			deletes.forEach(function(delete_id) {
				queue.push(function() {
					console.log("Deleting");
					self.del(type, delete_id);
				});
			});
			return queue.reduce(function(soFar, f) {
				return soFar.then(f);
			}, Q());
		});
	};

	self.call = async (type, cmd, data) => {
		//Call a function in the model
		var url = self.api_root + "/call/" + type + "/" + cmd + "?apikey=" + self.apikey;
		if (this.debug) console.log("CALLing  ", url, data);
		try {
			return (await axios.post(url, data)).data;
		} catch(err) {
			throw(err.response ? err.response.data : err);
		}
	};

	self.groups_put = async (user_id, groups) => {
		var url = self.api_root + "/groups/" + user_id + "?apikey=" + self.apikey;
		try {
			return (await axios.put(url, { group: groups })).data;
		} catch(err) {
			throw(err.response ? err.response.data : err);
		}
	};

	self.groups_del = async (user_id, group) => {
		var url = `${self.api_root}/groups/${user_id}?group=${group}&apikey=${self.apikey}`;
		try {
			return (await axios.delete(url)).data;
		} catch(err) {
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	};

	self.groups_post = async (user_id, groups) => {
		var url = self.api_root + "/groups/" + user_id + "?apikey=" + self.apikey;
		var data = { group: groups };
		if (this.debug) console.log("GROUP POSTing  ", url, data);
		try {
			return (await axios.post(url, data)).data;
		} catch(err) {
			displayError(err);
			throw(err.response ? err.response.data : err);
		}
	};

	self.getLocations = (req, res, next) => {
		self.get("location")
		.then(function(locations) {
			res.locals.locations = locations.data;
			return next();
		}, function(err) {
			displayError(err);
			return res.send(err);
		});
	};

	self.getMemberships = (req, res, next) => {
		self.get("membership")
		.then(function(result) {
			res.locals.memberships = result.data;
			return next();
		}, function(err) {
			displayError(err);
			return res.send(err);
		});
	};

	self.getMembers = (req, res, next) => {
		self.get("user", { "filter[status]": "active" })
		.then(function(result) {
			res.locals.members = result.data;
			return next();
		}, function(err) {
			displayError(err);
			return res.send(err);
		});
	};

	self.getOrganisations = (req, res, next) => {
		self.get("organisation", { "filter[status]": "active" })
		.then(function(result) {
			res.locals.organisations = result.data;
			return next();
		}, function(err) {
			displayError(err);
			return res.send(err);
		});
	};

	self.getjwt = async (email) => {
		try {
			const jwt = (await axios.post(`${self.api_root}/login/getjwt?apikey=${self.apikey}`, { email })).data;
			return jwt;
		} catch (err) {
			if (err.response && err.response.data)
				return Promise.reject(err.response.data);
			return Promise.reject(err);
		}
	}
};

module.exports = JXPHelper;


var axios = require("axios");

/**
 * JXPHelper class for interacting with a JXP server.
 * @class
 */
class JXPHelper {
	/**
	 * Creates a new instance of the JXP Helper class.
	 * @param {Object} opts - The options for configuring the JXP Helper.
	 * @param {string} opts.server - The server URL.
	 * @param {string} opts.apikey - The API key for the user.
	 * @param {boolean} [opts.debug=false] - Whether to enable debug mode.
	 * @param {boolean} [opts.hideErrors=false] - Whether to hide errors.
	 */
	constructor(opts) {
		const defaults = {
			debug: false,
			hideErrors: false
		};
		opts = Object.assign({}, defaults, opts);
		this.config(opts);
		if (!this.server) throw ("parameter 'server' required");
		this.api = this.server + "/api";
	}

	/**
	 * Configures the options for the jxp-helper.
	 * @param {Object} opts - The options to configure.
	 */
	config(opts) {
		for (var opt in opts) {
			this[opt] = opts[opt];
		}
	};
	
	_configParams(opts) {
		opts = opts || {};
		opts.apikey = this.apikey;
		var parts = [];
		for (var opt in opts) {
			if (Array.isArray(opts[opt])) {
				opts[opt].forEach(val => {
					parts.push(opt + "=" + encodeURIComponent(val));
				});
			} else {
				parts.push(opt + "=" + encodeURIComponent(opts[opt]));
			}
		}
		return parts.join("&");
	};

	_randomString() {
		return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	}

	_displayError(err) {
		try {
			if (this.hideErrors) return;
			console.error(`${new Date().toISOString()}\turl: ${err.config.url}\tmethod: ${err.request.method}\tstatus: ${err.response.status}\tstatusText: ${err.response.statusText}\tdata: ${(err.response.data) ? JSON.stringify(err.response.data) : 'No data'}`);
		} catch (err) {
			console.error(err);
		}
	}

	url(type, opts, ep="api") {
		return `${this.server}/${ep}/${type}?${this._configParams(opts)}`;
	}


	/**
	 * Logs in a user with the provided email and password.
	 * @param {string} email - The user's email.
	 * @param {string} password - The user's password.
	 * @returns {Promise<{ data: any, user: any } | any>} - A promise that resolves to an object containing the login data and user information, or rejects with an error object.
	 */
	async login(email, password) {
		try {
			const data = (await axios.post(`${this.server}/login`, { email, password })).data;
			const user = (await axios.get(`${this.api}/user/${data.user_id}?apikey=${this.apikey}`)).data;
			return { data, user };
		} catch (err) {
			return err.response.data;
		}
	}

	/**
	 * Retrieves a single item of a specified type by its ID.
	 *
	 * @param {string} type - The type of the item.
	 * @param {string} id - The ID of the item.
	 * @param {Object} opts - Additional options for the request.
	 * @returns {Promise<Object>} - A promise that resolves to the retrieved item.
	 * @throws {Error} - If the request fails or returns a non-200 status code.
	 */
	async getOne(type, id, opts) {
		const label = `getOne.${type}-${this._randomString()}`;
		if (this.debug) console.time(label);
		const url = `${this.api}/${type}/${id}?${this._configParams(opts)}`;
		try {
			var result = await axios.get(url);
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw(result.statusText);
			}
			return result.data;
		} catch(err) {
			if (this.debug) console.timeEnd(label);
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}


	/**
	 * Retrieves data of a specified type from a URL.
	 * @param {string} type - The type of data to retrieve.
	 * @param {Object} opts - Additional options for the request.
	 * @returns {Promise<any>} - A promise that resolves with the retrieved data.
	 * @throws {Error} - If the request fails or returns a non-200 status code.
	 */
	async get(type, opts) {
		const label = `get.${type}-${this._randomString()}`;
		if (this.debug) console.time(label);
		var url = this.url(type, opts);
		try {
			var result = await axios.get(url);
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw(result.statusText);
			}
			return result.data;
		} catch(err) {
			if (this.debug) console.timeEnd(label);
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Retrieves data in CSV format from the server.
	 * @param {string} type - The type of data to retrieve.
	 * @param {Object} opts - Additional options for the request.
	 * @returns {Promise<string>} - The CSV data.
	 * @throws {Error} - If the request fails or returns a non-200 status code.
	 */
	async csv(type, opts) {
		const label = `get.${type}-${this._randomString()}`;
		if (this.debug) console.time(label);
		var url = `${this.server}/csv/${type}?${this._configParams(opts)}`;
		try {
			var result = await axios.get(url);
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw(result.statusText);
			}
			return result.data;
		} catch(err) {
			if (this.debug) console.timeEnd(label);
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Executes a query of the specified type with the given parameters.
	 * @param {string} type - The type of query to execute.
	 * @param {string} query - The query string.
	 * @param {Object} opts - Additional options for the query.
	 * @returns {Promise<any>} - A promise that resolves to the query result.
	 * @throws {Error} - If the query fails or returns a non-200 status code.
	 */
	async query(type, query, opts) {
		const label = `query.${type}-${this._randomString()}`;
		if (this.debug) console.time(label);
		var url = `${this.server}/query/${type}?${this._configParams(opts)}`;
		try {
			var result = await axios.post(url, {query});
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw(result.statusText);
			}
			return result.data;
		} catch(err) {
			if (this.debug) console.timeEnd(label);
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Performs an aggregate operation on the specified type with the given query and options.
	 * @param {string} type - The type to perform the aggregate operation on.
	 * @param {object} query - The query object for the aggregate operation.
	 * @param {object} opts - The options for the aggregate operation.
	 * @returns {Promise<object>} - The result of the aggregate operation.
	 * @throws {Error} - If the aggregate operation fails.
	 */
	async aggregate(type, query, opts) {
		const label = `aggregate.${type}-${this._randomString()}`;
		if (this.debug) console.time(label);
		var url = `${this.server}/aggregate/${type}?${this._configParams(opts)}`;
		try {
			var result = await axios.post(url, { query });
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw (result.statusText);
			}
			return result.data;
		} catch (err) {
			if (this.debug) console.timeEnd(label);
			this._displayError(err);
			throw (err.response ? err.response.data : err);
		}
	}

	/**
	 * Performs a bulk post or put operation.
	 * If the data parameter is an array, it performs a bulk update operation.
	 * If the data parameter is an object, it performs a single post or put operation.
	 *
	 * @param {string} type - The type of operation to perform (post or put).
	 * @param {string|string[]} key - The key(s) used to filter the data for the update operation.
	 * @param {object|object[]} data - The data to be updated or inserted.
	 * @returns {Promise} - A promise that resolves with the result of the bulk operation.
	 * @throws {Error} - If an error occurs during the bulk operation.
	 */
	async bulk_postput(type, key, data) {
		try {
			if (!Array.isArray(data)) return await this.postput(type, key, data);
			const updates = data.map(item => {
				const updateQuery = {
					"updateOne": {
						"upsert": true
					}
				}
				updateQuery.updateOne.update = item;
				updateQuery.updateOne.filter = {};
				if (Array.isArray(key)) {
					key.forEach(k => {
						updateQuery.updateOne.filter[k] = item[k];
					});
				} else {
					updateQuery.updateOne.filter[key] = item[key];
				}
				return updateQuery;
			});
			const url = `${this.server}/bulkwrite/${type}?apikey=${this.apikey}`;
			return (await axios.post(url, updates)).data;
		} catch (err) {
			this._displayError(err);
			throw (err.response ? err.response.data : err);
		}
	}

	/**
	 * Performs a bulk update operation for a given type of data.
	 * @param {string} type - The type of data to update.
	 * @param {string} key - The key to use for filtering and updating the data.
	 * @param {Array<Object>} data - The array of data objects to update.
	 * @returns {Promise<Object>} - A promise that resolves to the response data from the bulk update operation.
	 * @throws {Error} - If an error occurs during the bulk update operation.
	 */
	async bulk_put(type, key, data) {
		try {
			const updates = data.map(item => {
				const updateQuery = {
					"updateOne": {
						"upsert": false
					}
				}
				updateQuery.updateOne.update = item;
				updateQuery.updateOne.filter = {};
				updateQuery.updateOne.filter[key] = item[key];
				return updateQuery;
			});
			const url = `${this.server}/bulkwrite/${type}?apikey=${this.apikey}`;
			return (await axios.post(url, updates)).data;
		} catch (err) {
			this._displayError(err);
			throw (err.response ? err.response.data : err);
		}
	}

	/**
	 * Performs a bulk post operation.
	 * @param {string} type - The type of data to be posted.
	 * @param {Array} data - The data to be posted.
	 * @returns {Promise} - A promise that resolves with the response data.
	 * @throws {Error} - If an error occurs during the operation.
	 */
	async bulk_post(type, data) {
		try {
			const updates = data.map(item => {
				return {
					"insertOne": {
						"document": item
					}
				}
			});
			const url = `${this.server}/bulkwrite/${type}?apikey=${this.apikey}`;
			return (await axios.post(url, updates)).data;
		} catch (err) {
			this._displayError(err);
			throw (err.response ? err.response.data : err);
		}
	}

	/**
	 * Performs a bulk write operation for a given type using the specified query.
	 * @param {string} type - The type of the bulk write operation.
	 * @param {object} query - The query object for the bulk write operation.
	 * @returns {Promise<any>} - A promise that resolves to the result of the bulk write operation.
	 * @throws {Error} - If an error occurs during the bulk write operation.
	 */
	async bulk(type, query) {
		try {
			if (this.debug) console.log("bulk", type);
			const url = `${this.server}/bulkwrite/${type}?apikey=${this.apikey}`;
			return (await axios.post(url, query)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Updates multiple documents of a specified type in the database.
	 * @param {string} type - The type of documents to update.
	 * @param {object} data - The data to update the documents with.
	 * @returns {Promise<object>} - The response data from the database.
	 * @throws {Error} - If an error occurs during the update process.
	 */
	async put_all(type, data) {
		try {
			if (this.debug) console.log("put_all", type);
			const query = [
				{
					"updateMany": {
						"upsert": false,
						filter: {},
						update: { $set: data },
					},
				}
			];
			const url = `${this.server}/bulkwrite/${type}?apikey=${this.apikey}`;
			return (await axios.post(url, query)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Counts the number of items of a given type.
	 * 
	 * @param {string} type - The type of items to count.
	 * @param {object} opts - Additional options for counting.
	 * @returns {Promise<number>} - The count of items.
	 */
	async count(type, opts) {
		const label = `count.${type}-${this._randomString()}`;
		if (this.debug) console.time(label);
		opts = opts || {};
		opts.limit = 1;
		var url = this.url(type, opts, "count");
		try {
			var result = await axios.get(url);
			if (this.debug) console.timeEnd(label);
			if (result.status !== 200) {
				throw (result.statusText);
			}
			return result.data.count;
		} catch (err) {
			if (this.debug) console.timeEnd(label);
			this._displayError(err);
			throw (err.response ? err.response.data : err);
		}
	}

	/**
	 * Creates a new record by making a POST request to the specified URL.
	 * 
	 * @param {string} type - The type of data to post.
	 * @param {object} data - The data to post.
	 * @returns {<Promise<object>} - The response data from the post operation.
	 */
	async post(type, data) {
		var url = `${this.api}/${type}?apikey=${this.apikey}`;
		if (this.debug) console.log("POSTing to ", url, data);
		try {
			return (await axios.post(url, data)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}


	/**
	 * Updates an existing record by making a PUT request to the specified URL.
	 * 
	 * @param {string} type - The type of the record.
	 * @param {string} id - The ID of the record.
	 * @param {Object} data - The data to be sent in the request body.
	 * @returns {Promise<Object>} - A promise that resolves to the response data.
	 * @throws {Error} - If an error occurs during the request.
	 */
	async put(type, id, data) {
		var url = `${this.api}/${type}/${id}?apikey=${this.apikey}`;
		if (this.debug) console.log("PUTting to ", url, data);
		try {
			return (await axios.put(url, data)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Performs a POST or PUT request based on the existence of a specific key in the data object.
	 * If the key exists in the data object, a PUT request is made with the corresponding ID.
	 * If the key does not exist, a POST request is made with the data object.
	 * 
	 * @param {string} type - The type of resource to perform the request on.
	 * @param {string} key - The key to check in the data object.
	 * @param {object} data - The data object to be sent in the request.
	 * @returns {Promise} - A promise that resolves with the response data or rejects with an error.
	 */
	async postput(type, key, data) {
		// Post if we find key=id, else put
		var obj = {};
		obj[`filter[${key}]`] = data[key];
		try {
			var result = await this.get(type, obj);
			if (result.data.length) {
				var id = result.data[0]._id;
				return this.put(type, id, data);
			} else {
				return this.post(type, data);
			}
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}
	
	/**
	 * Deletes an item of the specified type by its ID.
	 * 
	 * @param {string} type - The type of the item to delete.
	 * @param {string} id - The ID of the item to delete.
	 * @returns {Promise<any>} - A promise that resolves to the deleted item.
	 * @throws {Error} - If an error occurs during the deletion process.
	 */
	async del(type, id) {
		const url = `${this.api}/${type}/${id}?apikey=${this.apikey}`;
		try {
			return (await axios.delete(url)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	
	/**
	 * Deletes a resource permanently.
	 *
	 * @param {string} type - The type of resource to delete.
	 * @param {string} id - The ID of the resource to delete.
	 * @returns {Promise<any>} - A promise that resolves to the deleted resource data.
	 * @throws {Error} - If an error occurs during the deletion process.
	 */
	async del_perm(type, id) {
		const url = `${this.api}/${type}/${id}?_permaDelete=1&apikey=${this.apikey}`;
		try {
			return (await axios.delete(url)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Soft Deletes a resource and its cascading dependencies.
	 * @param {string} type - The type of the resource to delete.
	 * @param {string} id - The ID of the resource to delete.
	 * @returns {Promise<any>} - A promise that resolves with the deleted resource data.
	 * @throws {Error} - If an error occurs during the deletion process.
	 */
	async del_cascade(type, id) {
		var url = `${this.api}/${type}/${id}?_cascade=1&apikey=${this.apikey}`;
		try {
			return (await axios.delete(url)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Permanently Deletes a resource and its associated data permanently, including all cascading dependencies.
	 * @param {string} type - The type of resource to delete.
	 * @param {string} id - The ID of the resource to delete.
	 * @returns {Promise<any>} - A promise that resolves to the response data from the delete request.
	 * @throws {Error} - If an error occurs during the delete request.
	 */
	async del_perm_cascade(type, id) {
		var url = `${this.api}/${type}/${id}?_cascade=1&_permaDelete=1&apikey=${this.apikey}`;
		try {
			return (await axios.delete(url)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	
	/**
	 * Deletes all items of a specified type that match a given key-value pair.
	 * 
	 * @param {string} type - The type of items to delete.
	 * @param {string} key - The key to filter the items.
	 * @param {string} id - The value to match against the key.
	 * @returns {Promise<Array>} - A promise that resolves to an array of results from deleting each item.
	 * @throws {Error} - If an error occurs during the deletion process.
	 */
	async del_all(type, key, id) {
		var obj = {};
		obj[`filter[${key}]`] = id;
		try {
			const results = [];
			const items = (await self.get(type, obj)).data;
			for (let item of items) {
				results.push(await this.del(type, item._id));
			}
			return results;
		} catch(err) {
			this._displayError(err);
			throw (err.response ? err.response.data : err);
		}
	}

	async sync(type, key, id, data) {
		// Given the records filtered by key = id, we create, update or delete until we are in sync with data.
		var obj = {};
		obj[`filter[${key}]`] = id;
		try {
			let results = [];
			const data = await this.get(type, obj).data;
			const data_ids = data.filter(row => row._id).map(row => row._id);
			const dest_ids = data.map(row => row._id);
			const deletes = dest_ids.filter(n => data_ids.indexOf(n) == -1) || [];
			const moreinserts = data_ids.filter(n => dest_ids.indexOf(n) == -1) || [];
			const inserts = data.filter(row => moreinserts.indexOf(row._id) != -1) || !(row._id);
			const update_ids = dest_ids.filter(n => data_ids.indexOf(n) != -1) || [];
			const updates = data.filter(row => update_ids.indexOf(row._id) != -1) || [];
			for (let insert of inserts) {
				if (this.debug) console.log("Inserting", insert);
				results.push(await this.post(type, insert));
			}
			for (let update of updates) {
				if (this.debug) console.log("Updating", update);
				results.push(await self.put(type, update._id, update));
			}
			for (let del of deletes) {
				if (this.debug) console.log("Deleting", del);
				results.push(await this.del(type, del));
			}
			return results;
		} catch(err) {
			this._displayError(err);
			throw (err.response ? err.response.data : err);
		}
	}

	/**
	 * Calls a function in the model.
	 * 
	 * @param {string} type - The type of the function.
	 * @param {string} cmd - The command to be executed.
	 * @param {object} data - The data to be sent with the request.
	 * @returns {Promise<any>} - A promise that resolves to the response data.
	 * @throws {any} - Throws an error if the request fails.
	 */
	async call(type, cmd, data) {
		//Call a function in the model
		var url = `${this.server}/call/${type}/${cmd}?apikey=${this.apikey}`;
		if (this.debug) console.log("CALLing  ", url, data);
		try {
			return (await axios.post(url, data)).data;
		} catch(err) {
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Updates the groups for a user.
	 * 
	 * @param {string} user_id - The ID of the user.
	 * @param {Array} groups - The groups to update.
	 * @returns {Promise} - A promise that resolves to the updated data.
	 * @throws {Error} - If an error occurs during the update.
	 */
	async groups_put(user_id, groups) {
		var url = `${this.server}/groups/${user_id}?apikey=${this.apikey}`;
		try {
			return (await axios.put(url, { group: groups })).data;
		} catch(err) {
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Deletes a group for a specific user.
	 * 
	 * @param {string} user_id - The ID of the user.
	 * @param {string} group - The name of the group to delete.
	 * @returns {Promise} - A promise that resolves to the response data from the server.
	 * @throws {Error} - If an error occurs during the deletion process.
	 */
	async groups_del(user_id, group) {
		var url = `${this.server}/groups/${user_id}?group=${group}&apikey=${this.apikey}`;
		try {
			return (await axios.delete(url)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Add a user to a group
	 * 
	 * @param {string} user_id - The ID of the user.
	 * @param {Array} groups - The groups to be posted.
	 * @returns {Promise} - A promise that resolves to the response data.
	 * @throws {Error} - If an error occurs during the post request.
	 */
	async groups_post(user_id, groups) {
		var url = `${this.server}/groups/${user_id}?apikey=${this.apikey}`;
		var data = { group: groups };
		if (this.debug) console.log("GROUP POSTing", url, data);
		try {
			return (await axios.post(url, data)).data;
		} catch(err) {
			this._displayError(err);
			throw(err.response ? err.response.data : err);
		}
	}

	/**
	 * Generates a JWT (JSON Web Token) for the specified email.
	 * 
	 * @param {string} email - The email address used for authentication.
	 * @returns {Promise<string>} - A promise that resolves with the JWT.
	 * @throws {Error} - If an error occurs during the retrieval of the JWT.
	 */
	async getjwt(email) {
		try {
			const jwt = (await axios.post(`${ this.server }/login/getjwt?apikey=${ this.apikey }`, { email })).data;
			return jwt;
		} catch (err) {
			if (err.response && err.response.data)
				return Promise.reject(err.response.data);
			return Promise.reject(err);
		}
	}

	/**
	 * Retrieves the definition of a model from the server.
	 * 
	 * @param {string} modelname - The name of the model to retrieve.
	 * @returns {Promise<object>} - A promise that resolves to the model definition.
	 * @throws {Error} - If an error occurs during the retrieval process.
	 */
	async model(modelname) {
		try {
			const modeldef = (await axios.get(`${ this.server }/model/${ modelname }?apikey=${ this.apikey }`)).data;
			return modeldef;
		} catch (err) {
			if (err.response && err.response.data)
				return Promise.reject(err.response.data);
			return Promise.reject(err);
		}
	}

	/**
	 * Retrieves the model definitions from the server.
	 * 
	 * @returns {Promise<Object>} A promise that resolves to the model definitions.
	 * @throws {Error} If an error occurs while retrieving the model definitions.
	 */
	async models() {
		try {
			const modeldef = (await axios.get(`${ this.server }/model?apikey=${ this.apikey }`)).data;
			return modeldef;
		} catch (err) {
			if (err.response && err.response.data)
				return Promise.reject(err.response.data);
			return Promise.reject(err);
		}
	}
};

module.exports = JXPHelper;


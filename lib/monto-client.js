"use babel";

import rp from "request-promise";
import url from "url";

class Monto {
	constructor(baseURL, services) {
		this.baseURL = baseURL;
		this.services = services;
	}
	allProducts() {
		return this.services.map(service => {
			return service.products.map(product => {
				return {
					language: product.language,
					name: product.name,
					id: service.service.id
				};
			});
		}).reduce((a, b) => a.concat(b), []);
	}
	productsFor(language) {
		return this.allProducts().filter(p => p.language == language);
	}
	requestProduct(id, name, language, path) {
		let uri = url.parse(url.resolve(this.baseURL, "monto/" + id + "/" + name));
		uri.query = { path, language };
		return rp({ uri: url.format(uri) }).then(JSON.parse);
	}
	sendFile(path, contents, language) {
		let uri = url.parse(url.resolve(this.baseURL, "monto/broker/source"));
		uri.query = { path };
		if(language) {
			uri.query.language = language;
		}
		return rp({
			body: contents,
			headers: {
				"Content-Type": "text/plain"
			},
			method: "put",
			uri: url.format(uri)
		});
	}
	sendProduct(p) {
		// TODO
		return Promise.reject(new Error("TODO Implement sendProduct"));
	}
}

// Performs negotiation.
export default function(baseURL) {
	return rp({
		body: {
			monto: {
				major: 3,
				minor: 0,
				patch: 0
			},
			client: {
				id: "edu.umn.cs.melt.monto3.atom",
				name: "Monto3 for Atom",
				vendor: "Minnesota Extensible Language Tools"
			}
		},
		json: true,
		method: "POST",
		uri: url.resolve(baseURL, "monto/version")
	}).then((cbn) => {
		if(cbn.extensions && cbn.extensions.length > 0) {
			const exts = cbn.extensions.join(", ");
			throw new Error("Extensions not supported: " + exts);
		}
		return new Monto(baseURL, cbn.services);
	});
}

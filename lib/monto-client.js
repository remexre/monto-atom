"use babel";

import { EventEmitter } from "events";
import languages from "./languages";
import { extname } from "path";
import zmq from "zeromq";

export default class Monto extends EventEmitter {
	constructor(inSockAddr = "tcp://127.0.0.1:5001", outSockAddr = "tcp://127.0.0.1:5000") {
		super();
		this.decoder = new TextDecoder();
		this.inSockAddr = inSockAddr;
		this.outSockAddr = outSockAddr;
		this.inSock = zmq.socket("pair");
		this.inSock.connect(inSockAddr);
		this.outSock = zmq.socket("pair");
		this.outSock.connect(outSockAddr);
		this.inSock.on("message", msg => {
			const { tag, contents } = JSON.parse(this.decoder.decode(msg));
			this.process(tag, contents);
		});
		this.cache = {};
	}

	destroy() {
		this.inSock.disconnect(this.inSockAddr);
		this.outSock.disconnect(this.outSockAddr);
	}

	process(tag, contents) {
		switch(tag) {
		case "product":
			const path = contents.source.physical_name;
			this.emit(path, this.cache[path].buffer, contents);
			break;
		default:
			atom.notifications.addWarning(`Unknown message tag "${tag}". See the console for more information.`, {dismissable: true});
			break;
		}
	}

	sendFile(buffer) {
		const path = buffer.getPath();
		const contents = buffer.getText();

		const lang = languages[extname(path)];
		if(!lang) return false;

		let version = 1;
		if(path in this.cache) {
			version = this.cache[path].version + 1;
		}
		this.cache[path] = {
			buffer: buffer,
			version: version,
		};

		this.sendObject({
			tag: "source",
			contents: {
				source: {
					physical_name: path,
				},
				id: version,
				language: lang,
				contents: buffer.getText(),
			},
		});
		return true;
	}

	sendObject(datum) {
		console.log("monto-atom sending:", datum);
		this.outSock.send(JSON.stringify(datum));
	}
};

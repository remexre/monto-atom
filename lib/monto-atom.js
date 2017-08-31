"use babel";

import { CompositeDisposable, DisplayMarkerLayer, Range } from "atom";
import apd from "atom-package-dependencies";
import connect from "./monto-client";
import languages from "./languages.json";

let monto = null;
let subscriptions = null;

export function activate() {
	apd.install();
	// TODO Make the URL configurable.
	connect("http://localhost:28888").then(m => {
		monto = m;
	});
	subscriptions = new CompositeDisposable();
};

export function deactivate() {
	subscriptions.dispose();
};

export function consumeIndie(registerIndie) {
	const linter = registerIndie({
		name: "Monto3"
	});
	subscriptions.add(linter);

	// TODO Ach, this only sends us an event on open; we want to subscribe to the
	// buffer's onDidChangeText/onDidStopChanging events.
	subscriptions.add(atom.workspace.observeTextEditors((editor) => {
		const path = editor.getPath();
		if(!path) return;

		const grammar = editor.getGrammar().name;
		const language = languages[grammar];

		// As the Monto object is initialized asynchronously, there's the chance
		// that our first event occurs before we connect.
		if(monto) {
			// First, send the updated file (regardless of whether we handle it
			// or not, and regardless of whether we know its language or not).
			monto.sendFile(path, editor.getText(), language).then(() => {
				// At this point, if we don't know the language, we can't do much.
				if(!language) {
					atom.notifications.addWarning("Could not determine Monto language for grammar " + grammar);
					return;
				}

				// Then get all products for it that we can. If none apply, the
				// created Promise returns immediately.
				return Promise.all(monto.productsFor(language).map(p => {
					console.log("Got product", p);
					const { id, name } = p;
					return monto.requestProduct(id, name, language, path).then(p => {
						if(name === "errors") {
							linter.setMessages(path, p.map(err => {
								return {
									severity: err.severity,
									location: {
										file: path,
										position: bytesToRange(editor.getBuffer(), p.startByte, p.endByte)
									},
									excerpt: err.message
								};
							}));
						} else {
							return atom.workspace.open(undefined, {
							}).then(editor => {
								editor.setText(JSON.stringify(p, null, "\t"));
								const jsonGrammars = atom.grammars.getGrammars()
									.filter(g => g.name === "JSON");
								if(jsonGrammars.length > 0) {
									console.log(editor, jsonGrammars);
									editor.setGrammar(jsonGrammars[0]);
								} else {
									console.warn("Your copy of Atom doesn't support JSON?");
								}
							});
						}
					})
				}));
			}).catch(err => {
				atom.notifications.addError(err.toString());
			});
		}
	}));
}

function bytesToRange(buffer, startByte, endByte) {
	// TODO
	return new Range(new Point(0, 0), new Point(0, 1));
}

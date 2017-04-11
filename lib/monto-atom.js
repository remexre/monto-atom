"use babel";

import { CompositeDisposable, DisplayMarkerLayer, Range } from "atom";
import Monto from "./monto-client";

let monto = null;
let subscriptions = null;

export function activate() {
	monto = new Monto();
	subscriptions = new CompositeDisposable();
};

export function deactivate() {
	monto.destroy();
	subscriptions.dispose();
};

export function consumeIndie(registerIndie) {
	const linter = registerIndie({
		name: "Monto",
	});
	subscriptions.add(linter);
	subscriptions.add(atom.workspace.observeTextEditors(textEditor => {
		const buffer = textEditor.getBuffer();
		if(!buffer) return;

		const path = buffer.getPath();
		if(!path) return;
		const contents = buffer.getText();

		const onSave = () => {
			if(monto.sendFile(buffer) && monto.listeners(path) == 0)
				monto.addListener(path, listener(textEditor, linter, path));
		};
		buffer.onDidSave(onSave);
		onSave();

		const subscription = textEditor.onDidDestroy(() => {
			subscriptions.remove(subscription);
			linter.setMessages(path, []);
		});
		subscriptions.add(subscription);
	}));
};

function lengthOffsetToRange(buffer, length, offset) {
	return new Range([0, 0], [0, length])
		.translate(buffer.positionForCharacterIndex(offset));
}

function listener(textEditor, linter, path) {
	return function(buffer, msg) {
		switch(msg.product) {
		case "errors":
			linter.setMessages(path, msg.contents.map(err => {
				const { description, length, level, offset } = err;
				return {
					location: {
						file: path,
						position: lengthOffsetToRange(buffer, length, offset),
					},
					excerpt: description,
					severity: level,
				};
			}));
			break;
		case "highlighting":
			const markerLayer = buffer.addMarkerLayer({
				maintainHistory: true,
			});
			console.log("BEGIN HIGHLIGHTING");
			msg.contents.map(token => {
				const range = lengthOffsetToRange(buffer, token.length, token.offset);
				const style = token.style;
				if(style.length === 0)
					return;
				const marker = textEditor.getDefaultMarkerLayer().markBufferRange(range, {});
				textEditor.decorateMarker(marker, {
					type: "highlight",
					class: "monto " + style.join(" "),
				});
				console.log(marker, "monto " + style.join(" "));
			});
			break;
		default:
			console.log("Unknown product: " + msg.product);
			console.log(msg.contents);
			break;
		}
	};
}

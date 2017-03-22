"use babel";

import { CompositeDisposable, Range } from "atom";
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
				monto.addListener(path, listener(linter, path));
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

function listener(linter, path) {
	return function(buffer, msg) {
		if(msg.product !== "errors")
			return;
		linter.setMessages(path, msg.contents.map(err => {
			const { description, length, level, offset } = err;
			let range = new Range([0, 0], [0, length]);
			range = range.translate(buffer.positionForCharacterIndex(offset));
			return {
				location: {
					file: path,
					position: range,
				},
				excerpt: description,
				severity: level,
			};
		}));
	};
}

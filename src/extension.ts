
import * as vscode from 'vscode';
import { readFile, writeFile } from "fs/promises";

export class Globals {
	public static context: vscode.ExtensionContext | undefined;
}

export function activate(context: vscode.ExtensionContext) {

	Globals.context = context;

	registerCommand('blunderbuss.translations.openTranslations', async () => {
		const translationFilePath = getTranslationFilePath();

		if (translationFilePath) {
			const uriToPrimaryTranslationFile = vscode.Uri.file(translationFilePath);
			await vscode.commands.executeCommand<vscode.TextDocumentShowOptions>('vscode.open', uriToPrimaryTranslationFile);

			const editor = vscode.window.activeTextEditor;
			if (editor) { scrollToLastLineInEditor(editor); }
		}
		else {
			vscode.window.showErrorMessage('Did not open translations. Translation file not found 🤷‍♀️');
		}
	});

	registerCommand('blunderbuss.translations.addTranslation', async () => {
		const translationFilePath = getTranslationFilePath();

		if (translationFilePath) {

			const editor = vscode.window.activeTextEditor;
			const selectedText = editor?.selection.isEmpty ? undefined : editor?.document.getText(editor.selection);
			
			const file = await readFile(translationFilePath, "utf8");
			const json = JSON.parse(file);
			
			const userInput = selectedText ?? (await vscode.window.showInputBox({
				placeHolder: "e.g. This is my example sentence",
				prompt: "Enter the translation string you would like to to add."
			}));

			if (!userInput) {
				vscode.window.showWarningMessage('No translation added.');
				return;
			}

			const createdTranslationKey = createTranslationKey(userInput);
			json[createdTranslationKey] = userInput;

			await writeFile(translationFilePath, JSON.stringify(json, null, 4));

			if (editor && selectedText) {
				editor.edit(function (editBuilder) {
					editBuilder.replace(editor.selection, createdTranslationKey);
				});
			}

			vscode.env.clipboard.writeText(createdTranslationKey);
			vscode.window.setStatusBarMessage(`Created Key: '${createdTranslationKey}' and added to locale file and clipboard`, new Promise((resolve, reject) => {
				setTimeout(() => { resolve(true); }, 10000);
			}));
		}
		else {
			vscode.window.showErrorMessage('Did not add translation. Translation file not found 🤷‍♀️');
		}
	});

}


export function deactivate() {
	Globals.context = undefined;
}


function getTranslationFilePath(): string | undefined {
	if (vscode.workspace.workspaceFolders !== undefined) {
		let workspaceFolder = vscode.workspace.workspaceFolders[0].uri.path.substring(1);
		const translationFilePath = vscode.workspace.getConfiguration('blunderbuss').get('translationFilePath');
		return `${workspaceFolder}${translationFilePath}`;
	}
}

function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): vscode.Disposable {
	const newCommandPromise = vscode.commands.registerCommand(command, callback, thisArg);
	Globals.context?.subscriptions.push(newCommandPromise);
	return newCommandPromise;
}

function createTranslationKey(sentence: string): string {

	const undesirableChars = ['"', '\'', '\\', '`', '@', '#', '_', '%', '.', ','];
	const words = undesirableChars.reduce((prev, current) => prev.replaceAll(current, ''), sentence).split(' ');
	const keys = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));

	let translationKey = keys.join("").trim();

	return translationKey;
}

function scrollToLastLineInEditor(textEditor: vscode.TextEditor) {
	const position = new vscode.Position(
	  textEditor.document.lineCount - 2,
	  textEditor.selection.start.character
	);
	textEditor.selection = new vscode.Selection(position, position);
  
	textEditor.revealRange(
	  new vscode.Range(position, position),
	);
  }
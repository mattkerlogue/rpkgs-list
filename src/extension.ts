// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as packageinfo from './packageinfo';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "rpkgs-list" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('rpkgs-list.list', () => {
		packageinfo.getAllPkgInfo();
	});
	let tree = new packageinfo.pkgTreeProvider();
	vscode.window.registerTreeDataProvider('rpkgs_list_view', tree);
	tree.loadTree();
	console.log(tree);

	context.subscriptions.push(disposable);	
}

// This method is called when your extension is deactivated
export function deactivate() {}


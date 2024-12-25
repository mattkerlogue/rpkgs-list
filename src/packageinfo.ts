import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';
import { promisify } from 'node:util';
import * as childProcess from 'node:child_process';
const exec = promisify(childProcess.exec);

// data type for package info
export class PkgInfo {
    
    readonly name: string;
    readonly path: string;
    readonly version: string;
    readonly title: string;
    readonly description?: string;

    constructor(
        name: string,
        path: string,
        version: string,
        title: string,
        description?: string
    ){
        this.name = name;
        this.path = path;
        this.version = version;
        this.title = title;
        this.description = description;
    }
}

// get library paths from system install of R
export async function getLibPaths(): Promise<string[]> {
    
    const rlibs = await exec("rscript -e 'cat(paste0(.libPaths(), collapse = \"\n\"), sep = \"\")'");

    return rlibs.stdout.split("\n");
}

// get package paths from a library
export function getLibPkgs(lib: string): string[] {
    
    // read library contents
    const libPkgs:string[] = fs.readdirSync(lib, {withFileTypes: true})
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    let pkgPaths: string[] = [];

    // only get packages that start with a letter
    // ignore hidden folders/renv caches
    libPkgs.forEach((pkg) => {
        let re1 = /[a-zA-Z]/.exec(pkg.substring(0, 1));
        if (re1 !== null) {
            pkgPaths.push(path.resolve(lib, pkg));
        }
    });
    
    return pkgPaths;

}

// get the package paths from all libraries
export async function getAllPkgPaths(): Promise<string[]> {

    const librariesList = await getLibPaths();

    let libPkgs: string[] = [];

    librariesList.forEach((lib) => {
        let thisLibPkgs: string[] = getLibPkgs(lib);
        thisLibPkgs.forEach((pkg) => {
            libPkgs.push(pkg);
        });
    });

    return libPkgs;
}

// read the DESCRIPTION file of a package
export function readPkgDescription(pkg: string): any {
    const descPath = path.resolve(pkg, "DESCRIPTION");
    return fs.readFileSync(descPath, 'utf-8');
}

// get information about a package
export function getPkgInfo(pkg: string): PkgInfo {
    
    const description: string = readPkgDescription(pkg);
    
    const thisPkgInfo: PkgInfo = new PkgInfo(
        pkgInfoExtract(description, "name"),
        pkg,
        pkgInfoExtract(description, "version"),
        pkgInfoExtract(description, "title")
    );

    return thisPkgInfo;

}

function pkgInfoString(pkgInfo: PkgInfo): string {
    const out: string = pkgInfo.name + " [" + pkgInfo.version + "]" + "\n"
        + pkgInfo.title;
    return out;
}

// extract package info fields from DESCRIPTION file text
function pkgInfoExtract(text: string, what: string) {
    
    let regex: any = undefined;

    if (what === "name") {
        regex = /^Package:\s+([a-zA-Z0-9\.]+)\s*$/gm;
    } else if (what === "version") {
        regex = /^Version:\s+(\d+\.\d+\.\d+\.*\d*)\s*$/gm;
    } else if (what === "title") {
        regex = /^Title:\s+(.*?)\s*$/gm;
    } else {
        return null;
    }

    const reExec = regex.exec(text);

    if (reExec === null) {
        return "null";
    } else {
        return reExec[1];
    }
}

// get information about all packages
export async function getAllPkgInfo(): Promise<PkgInfo[]> {
    
    const pkgPaths: string[] = await getAllPkgPaths();
    
    const allPkgInfo: PkgInfo[] = [];
    
    pkgPaths.forEach((pkg) => {
        allPkgInfo.push(getPkgInfo(pkg));
    });
    
    allPkgInfo.sort((a:PkgInfo, b:PkgInfo) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    
    return(allPkgInfo);
}

export class pkgTreeProvider implements vscode.TreeDataProvider<PkgItem> {
    
    private pkgTree: PkgItem[] = [];
    
    private event_emitter: vscode.EventEmitter<PkgItem | undefined> = new vscode.EventEmitter<PkgItem | undefined>();

    readonly onDidChangeTreeData? : vscode.Event<PkgItem | undefined> = this.event_emitter.event;

    public constructor() {
        vscode.commands.registerCommand('rpkgs_list.refresh', () => this.loadTree());
    }

    public getTreeItem(item: PkgItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
        var title = item.label ? item.label.toString() : "";
        var result = new vscode.TreeItem(title, item.collapsibleState);
        return result;
    }
    
    // and getChildren
    public getChildren(element : PkgItem | undefined): vscode.ProviderResult<PkgItem[]> {
        if (element === undefined) {
            return this.pkgTree;
        } else {
            return element.children;
        }
    }

    public async loadTree() {
        let allPkgInfo = await getAllPkgInfo();
        allPkgInfo.forEach(pkg => {
            this.pkgTree.push(new PkgItem(pkg.name, pkg));
        });
        this.refresh();
    }

    public refresh() {
        this.pkgTree.forEach((feature) => {
            return feature.displayInfo();
        });
    }

}

export class PkgItem extends vscode.TreeItem {

    readonly children = [];

    constructor(
        public readonly label: string,
        public readonly pkgInfo: PkgInfo
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.pkgInfo = pkgInfo;
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        if (pkgInfo !== null) {
            this.tooltip = `${this.pkgInfo.name} [${this.pkgInfo.version}]`;   
        }
    }

    public displayInfo() {
        return pkgInfoString(this.pkgInfo)
    }

}

/*
export class PkgDetail extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
}
*/
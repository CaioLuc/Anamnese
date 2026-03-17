const { execSync } = require('child_process');
const fs = require('fs');

const exe = 'c:\\Projetos Faculdade\\Anamnese\\node_modules\\7zip-bin\\win\\x64\\7za.exe';
const docDir = 'C:\\Users\\kaiol\\AppData\\Local\\electron-builder\\Cache\\winCodeSign';
const zip = docDir + '\\838667967.7z';
const out = docDir + '\\winCodeSign-2.6.0';

console.log("Verificando arquivos...");
if (fs.existsSync(exe) && fs.existsSync(zip)) {
    try {
        console.log("Pugando pasta darwin conflictante e extraindo winCodeSign...");
        // Extrait mas ignora a pasta 'darwin' que contem symlinks que quebram o Windows
        execSync(`"${exe}" x "${zip}" -o"${out}" -x!*darwin* -y`);
        console.log('Extração bem sucedida!');
    } catch (e) {
        console.log(e.toString());
        if(e.stdout) console.log(e.stdout.toString());
    }
} else {
    console.log("Arquivos base não encontrados. Caminhos incorretos.");
}

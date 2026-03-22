const puppeteer = require('puppeteer');
const fs = require('fs');

const logFile = 'c:\\Projetos Faculdade\\Anamnese\\puppeteer_hard_log.txt';
fs.writeFileSync(logFile, 'Iniciando teste...\n');

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Capturar TODOS os erros
    page.on('console', msg => {
        if (msg.type() === 'error' || String(msg.text()).includes('Error')) {
             log(`BROWSER_ERROR: ${msg.text()}`);
        }
    });
    page.on('pageerror', error => log(`PAGE_ERROR: ${error.message}`));
    
    log('Indo para login...');
    await page.goto('https://anamnese-e9445.web.app/auth/login');
    
    log('Digitando email...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'bifeazul@gmail.com');
    await page.type('input[type="password"]', 'Teste2021!@!');
    
    log('Clicando login...');
    await page.click('button[type="submit"]');
    
    log('Esperando Dashboard...');
    await page.waitForSelector('a[href="/pacientes"]', { timeout: 15000 });
    
    log('Indo para pacientes...');
    await page.click('a[href="/pacientes"]');
    
    log('Esperando tabela de pacientes...');
    await page.waitForSelector('table', { timeout: 15000 });
    
    log('Clicando no paciente Caio Lucio...');
    await page.evaluate(() => {
        const rows = document.querySelectorAll('tr, .bg-white.dark\\:bg-white\\/5');
        for (let row of rows) {
            if(row.innerText.includes('Caio Lucio')) {
                row.click(); // Abre o modal do Caio
                return;
            }
        }
    });
    
    log('Esperando modal abrir...');
    await page.waitForTimeout(2000); // hard wait
    
    log('Clicando na aba Ficha de Anamnese...');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (let b of btns) {
            if(b.innerText.includes('Ficha de Anamnese')) {
                b.click();
            }
        }
    });

    log('Esperando 2 segs...');
    await page.waitForTimeout(2000);

    log('TENTANDO CLICAR EM NOVA ANAMNESE...');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (let b of btns) {
            if(b.innerText === 'Nova Anamnese') {
                b.click();
            }
        }
    });

    log('Aguardando os erros espocarem (3 segs)...');
    await page.waitForTimeout(3000);
    log('Fim do script.');
  } catch (err) {
    log(`CRITICAL_SCRIPT_DEBUG_ERROR: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
})();

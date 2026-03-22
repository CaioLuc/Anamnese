const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Capturar logs do console do React!
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  page.on('requestfailed', request => console.log('NETWORK_ERROR:', request.url(), request.failure().errorText));

  try {
    console.log('Acessando o App hospedado em https://anamnese-e9445.web.app/auth/login');
    await page.goto('https://anamnese-e9445.web.app/auth/login', { waitUntil: 'networkidle0' });

    console.log('Preenchendo credenciais...');
    await page.type('input[type="email"]', 'bifeazul@gmail.com');
    await page.type('input[type="password"]', 'Teste2021!@!');
    
    console.log('Clicando em Entrar...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);

    console.log('Login feito! Aguardando a lista de pacientes...');
    await page.waitForSelector('table, .grid'); // Esperar a tabela de pacientes
    
    // Clicar no botão 'Novo Paciente'
    console.log('Criando novo paciente mock para garantir que não tem anamnese preenchida...');
    await page.click('button:has-text("Novo Paciente")');
    await page.waitForSelector('input[name="nome"]');
    await page.type('input[name="nome"]', 'Paciente Debug da Tela Preta');
    await page.click('button:has-text("Salvar Paciente")');
    
    // Esperar um pouco pro paciente aparecer na lista
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Abrindo paciente recém-criado...');
    await page.evaluate(() => {
        // Encontrar elemento do paciente e clicar
        const rows = document.querySelectorAll('tr, .bg-white.dark\\:bg-white\\/5');
        for (let row of rows) {
            if(row.innerText.includes('Paciente Debug')) {
                row.click();
                return;
            }
        }
    });

    console.log('Abrindo aba da Ficha de Anamnese...');
    await page.waitForSelector('button:has-text("Ficha de Anamnese")');
    await page.click('button:has-text("Ficha de Anamnese")');
    
    // Esperar um pouco
    await new Promise(r => setTimeout(r, 1000));

    // Agora o momento da verdade.
    console.log('CLICANDO EM "Nova Anamnese"!!!');
    await page.click('button:has-text("Nova Anamnese")');
    
    console.log('Esperando 3 segundos capturando os erros do React...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('Feito! Encerrando...');

  } catch (err) {
    console.error('SCRIPT_ERROR:', err);
  } finally {
    await browser.close();
  }
})();

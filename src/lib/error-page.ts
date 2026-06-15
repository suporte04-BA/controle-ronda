export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Erro — BA Elétrica</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #080810; color: #F0F0FF; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #00F0FF; }
      p { color: #8B8BA3; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #00F0FF; color: #080810; font-weight: 600; }
      .secondary { background: transparent; color: #F0F0FF; border-color: #333; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Algo deu errado</h1>
      <p>Ocorreu um erro inesperado. Tente novamente ou volte ao início.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar novamente</button>
        <a class="secondary" href="/">Voltar ao início</a>
      </div>
    </div>
  </body>
</html>`;
}

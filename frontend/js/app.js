// ==========================================
// Controle de Ronda - BA Eletrica
// ==========================================
const API = '';
let currentPage = { equipamentos: 0, manutencoes: 0, ordensServico: 0 };
let allComputadores = [];
let USE_MOCK = false;
Chart.defaults.color = '#606070';
Chart.defaults.borderColor = 'rgba(255,255,255,0.04)';
Chart.defaults.font.family = "'Inter', sans-serif";

// ==========================================
// MOCK DATA
// ==========================================
var MOCK_COMPUTADORES = [
    {id:1,nomePc:'PC-ADM-001',numeroSerie:'SN-2024-001',modeloMarca:'Dell OptiPlex 7090',processador:'Intel Core i7-11700',memoriaRam:'16GB DDR4',armazenamento:'512GB SSD NVMe',usuarioDesignado:'Carlos Silva',fornecedor:'Dell Tecnologia',status:'ATIVO',dataCadastro:'2024-01-15T10:00:00'},
    {id:2,nomePc:'PC-ADM-002',numeroSerie:'SN-2024-002',modeloMarca:'Lenovo ThinkCentre M920',processador:'Intel Core i5-9500',memoriaRam:'8GB DDR4',armazenamento:'256GB SSD',usuarioDesignado:'Ana Beatriz',fornecedor:'Lenovo',status:'ATIVO',dataCadastro:'2024-02-10T10:00:00'},
    {id:3,nomePc:'PC-LOG-001',numeroSerie:'SN-2024-003',modeloMarca:'HP ProDesk 400 G7',processador:'Intel Core i5-10500',memoriaRam:'8GB DDR4',armazenamento:'256GB SSD',usuarioDesignado:'Roberto Souza',fornecedor:'HP Brasil',status:'MANUTENCAO_PREVENTIVA',dataCadastro:'2024-01-20T10:00:00'},
    {id:4,nomePc:'PC-LOG-002',numeroSerie:'SN-2024-004',modeloMarca:'Dell Vostro 3681',processador:'Intel Core i3-10100',memoriaRam:'4GB DDR4',armazenamento:'1TB HDD',usuarioDesignado:'Maria Oliveira',fornecedor:'Dell Tecnologia',status:'MANUTENCAO_EMERGENCIAL',dataCadastro:'2024-03-05T10:00:00'},
    {id:5,nomePc:'PC-TI-001',numeroSerie:'SN-2024-005',modeloMarca:'Lenovo ThinkPad T490',processador:'Intel Core i7-8565U',memoriaRam:'16GB DDR4',armazenamento:'512GB SSD',usuarioDesignado:'Joao Pedro',fornecedor:'Lenovo',status:'ATIVO',dataCadastro:'2024-01-10T10:00:00'},
    {id:6,nomePc:'PC-FIN-001',numeroSerie:'SN-2024-006',modeloMarca:'HP EliteDesk 800 G6',processador:'Intel Core i5-10500T',memoriaRam:'8GB DDR4',armazenamento:'256GB SSD',usuarioDesignado:'Fernanda Lima',fornecedor:'HP Brasil',status:'ATIVO',dataCadastro:'2024-02-15T10:00:00'},
    {id:7,nomePc:'PC-FIN-002',numeroSerie:'SN-2024-007',modeloMarca:'Dell OptiPlex 3080',processador:'Intel Core i3-10100',memoriaRam:'4GB DDR4',armazenamento:'500GB HDD',usuarioDesignado:'Pedro Henrique',fornecedor:'Dell Tecnologia',status:'MANUTENCAO_PREDITIVA',dataCadastro:'2024-03-01T10:00:00'},
    {id:8,nomePc:'PC-RH-001',numeroSerie:'SN-2024-008',modeloMarca:'Acer Veriton M4660G',processador:'Intel Core i5-9400',memoriaRam:'8GB DDR4',armazenamento:'256GB SSD',usuarioDesignado:'Juliana Costa',fornecedor:'Acer',status:'ATIVO',dataCadastro:'2024-01-25T10:00:00'},
    {id:9,nomePc:'PC-VEN-001',numeroSerie:'SN-2024-009',modeloMarca:'Lenovo IdeaCentre 520',processador:'AMD Ryzen 5 3500',memoriaRam:'8GB DDR4',armazenamento:'1TB HDD',usuarioDesignado:'Lucas Almeida',fornecedor:'Lenovo',status:'CONCLUIDO',dataCadastro:'2024-02-20T10:00:00'},
    {id:10,nomePc:'PC-VEN-002',numeroSerie:'SN-2024-010',modeloMarca:'HP ProOne 440 G6',processador:'Intel Core i5-9500T',memoriaRam:'8GB DDR4',armazenamento:'256GB SSD',usuarioDesignado:'Mariana Santos',fornecedor:'HP Brasil',status:'ATIVO',dataCadastro:'2024-03-10T10:00:00'},
    {id:11,nomePc:'PC-PRD-001',numeroSerie:'SN-2024-011',modeloMarca:'Dell Precision 3430',processador:'Intel Core i7-8700',memoriaRam:'32GB DDR4',armazenamento:'1TB SSD',usuarioDesignado:'Tecnico A',fornecedor:'Dell Tecnologia',status:'ATIVO',dataCadastro:'2024-01-05T10:00:00'},
    {id:12,nomePc:'PC-PRD-002',numeroSerie:'SN-2024-012',modeloMarca:'Lenovo ThinkStation P330',processador:'Intel Core i9-9900',memoriaRam:'64GB DDR4',armazenamento:'2TB SSD',usuarioDesignado:'Tecnico B',fornecedor:'Lenovo',status:'ATIVO',dataCadastro:'2024-02-01T10:00:00'},
    {id:13,nomePc:'PC-PRD-003',numeroSerie:'SN-2024-013',modeloMarca:'HP Z2 Tower G4',processador:'Intel Core i7-9700',memoriaRam:'16GB DDR4',armazenamento:'512GB SSD',usuarioDesignado:'Tecnico C',fornecedor:'HP Brasil',status:'MANUTENCAO_PREVENTIVA',dataCadastro:'2024-03-15T10:00:00'},
    {id:14,nomePc:'PC-ADM-003',numeroSerie:'SN-2024-014',modeloMarca:'Dell Latitude 5520',processador:'Intel Core i5-1135G7',memoriaRam:'8GB DDR4',armazenamento:'256GB SSD',usuarioDesignado:'Gerente TI',fornecedor:'Dell Tecnologia',status:'ATIVO',dataCadastro:'2024-01-18T10:00:00'},
    {id:15,nomePc:'PC-ALM-001',numeroSerie:'SN-2024-015',modeloMarca:'Acer Aspire TC-885',processador:'Intel Core i3-9100',memoriaRam:'4GB DDR4',armazenamento:'1TB HDD',usuarioDesignado:'Auxiliar Almox',fornecedor:'Acer',status:'MANUTENCAO_EMERGENCIAL',dataCadastro:'2024-02-28T10:00:00'},
    {id:16,nomePc:'PC-ADM-004',numeroSerie:'SN-2024-016',modeloMarca:'Lenovo ThinkCentre M70s',processador:'Intel Core i5-11400',memoriaRam:'16GB DDR4',armazenamento:'512GB SSD',usuarioDesignado:'Assistente Adm',fornecedor:'Lenovo',status:'ATIVO',dataCadastro:'2024-03-20T10:00:00'},
    {id:17,nomePc:'PC-LOG-003',numeroSerie:'SN-2024-017',modeloMarca:'HP ProDesk 600 G6',processador:'Intel Core i7-10700',memoriaRam:'16GB DDR4',armazenamento:'512GB SSD',usuarioDesignado:'Supervisor Log',fornecedor:'HP Brasil',status:'CONCLUIDO',dataCadastro:'2024-01-22T10:00:00'},
    {id:18,nomePc:'PC-FIN-003',numeroSerie:'SN-2024-018',modeloMarca:'Dell OptiPlex 5090',processador:'Intel Core i5-11500',memoriaRam:'8GB DDR4',armazenamento:'256GB SSD',usuarioDesignado:'Analista Fin',fornecedor:'Dell Tecnologia',status:'ATIVO',dataCadastro:'2024-02-12T10:00:00'},
    {id:19,nomePc:'PC-VEN-003',numeroSerie:'SN-2024-019',modeloMarca:'Lenovo ThinkCentre M920t',processador:'Intel Core i5-9500',memoriaRam:'8GB DDR4',armazenamento:'256GB SSD',usuarioDesignado:'Consultor Vendas',fornecedor:'Lenovo',status:'ATIVO',dataCadastro:'2024-03-08T10:00:00'},
    {id:20,nomePc:'PC-TI-002',numeroSerie:'SN-2024-020',modeloMarca:'Dell XPS 8940',processador:'Intel Core i9-11900',memoriaRam:'32GB DDR4',armazenamento:'1TB SSD NVMe',usuarioDesignado:'Dev Senior',fornecedor:'Dell Tecnologia',status:'ATIVO',dataCadastro:'2024-01-08T10:00:00'}
];

var MOCK_MANUTENCOES = [
    {id:1,computadorId:3,computadorNome:'PC-LOG-001',tipo:'PREVENTIVA',status:'EM_ANDAMENTO',descricao:'Troca de pasta termica e limpeza geral do equipamento',tecnicoResponsavel:'Carlos Mendes',custo:150.00,pecasTrocadas:'Pasta termica Artic MX-5',observacoes:'Agendado para manha',dataCadastro:'2024-06-10T08:00:00',dataConclusao:null},
    {id:2,computadorId:4,computadorNome:'PC-LOG-002',tipo:'EMERGENCIAL',status:'PENDENTE',descricao:'PC nao liga. Verificar fonte de alimentacao e placa mae',tecnicoResponsavel:'Roberto Alves',custo:null,pecasTrocadas:'',observacoes:'Prioridade alta - usuario sem equipamento',dataCadastro:'2024-06-12T14:30:00',dataConclusao:null},
    {id:3,computadorId:7,computadorNome:'PC-FIN-002',tipo:'PREDITIVA',status:'CONCLUIDA',descricao:'Atualizacao de firmware SSD e verificacao de saude do disco',tecnicoResponsavel:'Carlos Mendes',custo:0,pecasTrocadas:'Nenhuma',observacoes:'Disco com 87% de saude. Agendar substituicao em 6 meses',dataCadastro:'2024-05-20T09:00:00',dataConclusao:'2024-05-20T11:30:00'},
    {id:4,computadorId:13,computadorNome:'PC-PRD-003',tipo:'PREVENTIVA',status:'PENDENTE',descricao:'Limpeza preventiva trimestral e verificacao de drivers',tecnicoResponsavel:'Maria Ferreira',custo:80.00,pecasTrocadas:'Filtro de po',observacoes:'Equipamento de producao - sem interrupcao durante horario comercial',dataCadastro:'2024-06-01T07:00:00',dataConclusao:null},
    {id:5,computadorId:15,computadorNome:'PC-ALM-001',tipo:'CORRETIVA',status:'EM_ANDAMENTO',descricao:'Substituicao de HD danificado por SSD',tecnicoResponsavel:'Roberto Alves',custo:320.00,pecasTrocadas:'SSD Kingston A400 240GB',observacoes:'Backup realizado antes da troca',dataCadastro:'2024-06-08T10:00:00',dataConclusao:null},
    {id:6,computadorId:1,computadorNome:'PC-ADM-001',tipo:'PREVENTIVA',status:'CONCLUIDA',descricao:'Atualizacao de BIOS e limpeza de registro',tecnicoResponsavel:'Carlos Mendes',custo:0,pecasTrocadas:'Nenhuma',observacoes:'BIOS atualizada de v1.3 para v1.5',dataCadastro:'2024-05-15T14:00:00',dataConclusao:'2024-05-15T15:00:00'},
    {id:7,computadorId:2,computadorNome:'PC-ADM-002',tipo:'CORRETIVA',status:'CANCELADA',descricao:'Substituicao de teclado com teclas defeituosas',tecnicoResponsavel:'Maria Ferreira',custo:89.90,pecasTrocadas:'Teclado USB ABNT2',observacoes:'Cancelado - usuario Resolveu limpar as teclas',dataCadastro:'2024-05-10T11:00:00',dataConclusao:null},
    {id:8,computadorId:9,computadorNome:'PC-VEN-001',tipo:'EMERGENCIAL',status:'CONCLUIDA',descricao:'Remocao de malware e formatacao do sistema',tecnicoResponsavel:'Roberto Alves',custo:0,pecasTrocadas:'Nenhuma',observacoes:'Sistema reinstalado com Windows 11 Pro',dataCadastro:'2024-05-25T08:30:00',dataConclusao:'2024-05-26T17:00:00'},
    {id:9,computadorId:5,computadorNome:'PC-TI-001',tipo:'PREDITIVA',status:'EM_ANDAMENTO',descricao:'Teste de estresse na memoria RAM e verificacao de erros',tecnicoResponsavel:'Carlos Mendes',custo:0,pecasTrocadas:'',observacoes:'Rodando MemTest86 por 4 horas',dataCadastro:'2024-06-11T09:00:00',dataConclusao:null},
    {id:10,computadorId:6,computadorNome:'PC-FIN-001',tipo:'PREVENTIVA',status:'PENDENTE',descricao:'Instalacao de updates acumulados do Windows e Office',tecnicoResponsavel:'Maria Ferreira',custo:0,pecasTrocadas:'Nenhuma',observacoes:'Agendar para horario de almoco',dataCadastro:'2024-06-13T08:00:00',dataConclusao:null},
    {id:11,computadorId:10,computadorNome:'PC-VEN-002',tipo:'CORRETIVA',status:'CONCLUIDA',descricao:'Reparo no ventilador cooling com barulho excessivo',tecnicoResponsavel:'Roberto Alves',custo:120.00,pecasTrocadas:'Cooler fan 80mm',observacoes:'Equipamento operando normalmente',dataCadastro:'2024-05-18T13:00:00',dataConclusao:'2024-05-18T15:30:00'},
    {id:12,computadorId:8,computadorNome:'PC-RH-001',tipo:'PREDITIVA',status:'CONCLUIDA',descricao:'Otimizacao do Windows e desfragmentacao do SSD',tecnicoResponsavel:'Carlos Mendes',custo:0,pecasTrocadas:'Nenhuma',observacoes:'Tempo de boot reduzido de 45s para 18s',dataCadastro:'2024-05-22T16:00:00',dataConclusao:'2024-05-22T18:00:00'}
];

var MOCK_ORDENS = [
    {id:1,titulo:'Instalar novo software de controle de acesso',descricao:'Solicitar instalacao do software BioAccess v3.0 nos PCs da recepcao. Licencas ja adquiridas.',computadorId:2,computadorNome:'PC-ADM-002',prioridade:'ALTA',status:'EM_EXECUCAO',solicitante:'Gerencia de TI',tecnicoResponsavel:'Joao Pedro',dataAbertura:'2024-06-10T09:00:00',dataPrevisao:'2024-06-20T17:00:00',dataConclusao:null,solucao:null},
    {id:2,titulo:'Migracao de dados para novo servidor',descricao:'Transferir dados do servidor antigo para o novo storage NAS. Incluir backups e arquivos compartilhados.',computadorId:null,computadorNome:'-',prioridade:'CRITICA',status:'EM_ANALISE',solicitante:'Diretor de TI',tecnicoResponsavel:'Joao Pedro',dataAbertura:'2024-06-08T14:00:00',dataPrevisao:'2024-06-25T17:00:00',dataConclusao:null,solucao:null},
    {id:3,titulo:'Substituir monitor com dead pixels',descricao:'Monitor do PC-ADM-001 apresenta 3 dead pixels. Solicitado troca pelo setor administrativo.',computadorId:1,computadorNome:'PC-ADM-001',prioridade:'BAIXA',status:'ABERTA',solicitante:'Carlos Silva',tecnicoResponsavel:'',dataAbertura:'2024-06-12T10:00:00',dataPrevisao:'2024-06-30T17:00:00',dataConclusao:null,solucao:null},
    {id:4,titulo:'Configuracao de impressora em rede',descricao:'Instalar e configurar impressora HP LaserJet Pro M404dn na rede do setor financeiro.',computadorId:6,computadorNome:'PC-FIN-001',prioridade:'MEDIA',status:'CONCLUIDA',solicitante:'Fernanda Lima',tecnicoResponsavel:'Roberto Alves',dataAbertura:'2024-06-01T08:00:00',dataPrevisao:'2024-06-05T17:00:00',dataConclusao:'2024-06-03T16:00:00',solucao:'Impressora configurada com IP estatico 192.168.1.50 e compartilhamento em rede.'},
    {id:5,titulo:'Atualizar BIOS de todos PCs Dell',descricao:'Verificar e atualizar BIOS de todos os equipamentos Dell da empresa para versao mais recente.',computadorId:null,computadorNome:'-',prioridade:'MEDIA',status:'ABERTA',solicitante:'Carlos Mendes',tecnicoResponsavel:'',dataAbertura:'2024-06-11T11:00:00',dataPrevisao:'2024-07-15T17:00:00',dataConclusao:null,solucao:null},
    {id:6,titulo:'Corrigir falha de rede no PC-LOG-002',descricao:'PC apresenta desconexoes frequentes da rede cabethada. Verificar placa de rede e cabos.',computadorId:4,computadorNome:'PC-LOG-002',prioridade:'ALTA',status:'EM_EXECUCAO',solicitante:'Maria Oliveira',tecnicoResponsavel:'Carlos Mendes',dataAbertura:'2024-06-09T08:30:00',dataPrevisao:'2024-06-15T17:00:00',dataConclusao:null,solucao:null},
    {id:7,titulo:'Instalar antiviruses nos novos PCs',descricao:'Instalar e configurar antivirus Kaspersky Endpoint Security nos 5 novos equipamentos do almoxarifado.',computadorId:15,computadorNome:'PC-ALM-001',prioridade:'ALTA',status:'ABERTA',solicitante:'Auxiliar Almox',tecnicoResponsavel:'',dataAbertura:'2024-06-13T09:00:00',dataPrevisao:'2024-06-18T17:00:00',dataConclusao:null,solucao:null},
    {id:8,titulo:'Migrar Windows 10 para Windows 11',descricao:'Atualizar sistema operacional de 3 PCs elegiveis para Windows 11 Pro.',computadorId:14,computadorNome:'PC-ADM-003',prioridade:'BAIXA',status:'CANCELADA',solicitante:'Gerente TI',tecnicoResponsavel:'Maria Ferreira',dataAbertura:'2024-05-20T10:00:00',dataPrevisao:'2024-06-10T17:00:00',dataConclusao:null,solucao:'Cancelado - PCs nao atendem requisitos minimos do TPM 2.0.'},
    {id:9,titulo:'Configurar VPN corporativa',descricao:'Configurar conexao VPN no PC-TI-001 para acesso remoto ao servidor de desenvolvimento.',computadorId:5,computadorNome:'PC-TI-001',prioridade:'CRITICA',status:'CONCLUIDA',solicitante:'Joao Pedro',tecnicoResponsavel:'Joao Pedro',dataAbertura:'2024-06-05T14:00:00',dataPrevisao:'2024-06-07T17:00:00',dataConclusao:'2024-06-06T11:30:00',solucao:'VPN configurada com WireGuard. Teste de conexao OK.'},
    {id:10,titulo:'Limpeza geral dos equipamentos do estoque',descricao:'Realizar limpeza e manutencao preventiva em todos os PCs do setor de estoque.',computadorId:null,computadorNome:'-',prioridade:'MEDIA',status:'EM_ANALISE',solicitante:'Supervisor Log',tecnicoResponsavel:'',dataAbertura:'2024-06-12T08:00:00',dataPrevisao:'2024-06-22T17:00:00',dataConclusao:null,solucao:null}
];

var MOCK_USUARIOS = [
    {id:1,nomeCompleto:'Administrador',username:'admin',email:'admin@empresa.com',perfil:'ADMIN',ativo:true,dataCadastro:'2024-01-01T00:00:00'},
    {id:2,nomeCompleto:'Carlos Silva',username:'carlos',email:'carlos@empresa.com',perfil:'USUARIO',ativo:true,dataCadastro:'2024-01-10T08:00:00'},
    {id:3,nomeCompleto:'Ana Beatriz',username:'ana',email:'ana@empresa.com',perfil:'USUARIO',ativo:true,dataCadastro:'2024-01-10T08:00:00'},
    {id:4,nomeCompleto:'Carlos Mendes',username:'carlos.mendes',email:'carlos.mendes@empresa.com',perfil:'TECNICO',ativo:true,dataCadastro:'2024-01-15T08:00:00'},
    {id:5,nomeCompleto:'Roberto Alves',username:'roberto',email:'roberto@empresa.com',perfil:'TECNICO',ativo:true,dataCadastro:'2024-01-15T08:00:00'},
    {id:6,nomeCompleto:'Maria Ferreira',username:'maria',email:'maria@empresa.com',perfil:'TECNICO',ativo:true,dataCadastro:'2024-01-20T08:00:00'},
    {id:7,nomeCompleto:'Joao Pedro',username:'joao.pedro',email:'joao.pedro@empresa.com',perfil:'ADMIN',ativo:true,dataCadastro:'2024-01-10T08:00:00'},
    {id:8,nomeCompleto:'Fernanda Lima',username:'fernanda',email:'fernanda@empresa.com',perfil:'USUARIO',ativo:true,dataCadastro:'2024-02-01T08:00:00'},
    {id:9,nomeCompleto:'Roberto Souza',username:'roberto.souza',email:'roberto.souza@empresa.com',perfil:'USUARIO',ativo:false,dataCadastro:'2024-02-05T08:00:00'}
];

function mockAuth(user, pass) {
    var creds = {admin:{senha:'admin123',perfil:'ADMIN',nome:'Administrador'},carlos:{senha:'123456',perfil:'USUARIO',nome:'Carlos Silva'},ana:{senha:'123456',perfil:'USUARIO',nome:'Ana Beatriz'},'carlos.mendes':{senha:'123456',perfil:'TECNICO',nome:'Carlos Mendes'},roberto:{senha:'123456',perfil:'TECNICO',nome:'Roberto Alves'},maria:{senha:'123456',perfil:'TECNICO',nome:'Maria Ferreira'},'joao.pedro':{senha:'123456',perfil:'ADMIN',nome:'Joao Pedro'},fernanda:{senha:'123456',perfil:'USUARIO',nome:'Fernanda Lima'}};
    var c = creds[user];
    if (!c || c.senha !== pass) return null;
    return {token:'mock-token-'+user+'-'+Date.now(),username:user,nomeCompleto:c.nome,perfil:c.perfil,expiresIn:1800000};
}

function mockFetch(url, opts) {
    opts = opts || {};
    var method = (opts.method || 'GET').toUpperCase();
    var body = opts.body ? JSON.parse(opts.body) : {};

    if (url.indexOf('/api/auth/login') !== -1) {
        return mockAuth(body.username, body.senha);
    }

    if (url.indexOf('/api/computadores/estatisticas') !== -1) {
        var ativos = MOCK_COMPUTADORES.filter(function(c){return c.status==='ATIVO';}).length;
        var pred = MOCK_COMPUTADORES.filter(function(c){return c.status==='MANUTENCAO_PREDITIVA';}).length;
        var prev = MOCK_COMPUTADORES.filter(function(c){return c.status==='MANUTENCAO_PREVENTIVA';}).length;
        var emerg = MOCK_COMPUTADORES.filter(function(c){return c.status==='MANUTENCAO_EMERGENCIAL';}).length;
        var concl = MOCK_COMPUTADORES.filter(function(c){return c.status==='CONCLUIDO';}).length;
        return {total:MOCK_COMPUTADORES.length,ativos:ativos,manutencaoPreditiva:pred,manutencaoPreventiva:prev,manutencaoEmergencial:emerg,concluidos:concl,manutencaoVencida:2,porStatus:{ATIVO:ativos,MANUTENCAO_PREDITIVA:pred,MANUTENCAO_PREVENTIVA:prev,MANUTENCAO_EMERGENCIAL:emerg,CONCLUIDO:concl}};
    }

    if (url.indexOf('/api/manutencoes/estatisticas') !== -1) {
        var pend = MOCK_MANUTENCOES.filter(function(m){return m.status==='PENDENTE';}).length;
        var andam = MOCK_MANUTENCOES.filter(function(m){return m.status==='EM_ANDAMENTO';}).length;
        var conc = MOCK_MANUTENCOES.filter(function(m){return m.status==='CONCLUIDA';}).length;
        var custoTotal = MOCK_MANUTENCOES.reduce(function(s,m){return s+(m.custo||0);},0);
        return {total:MOCK_MANUTENCOES.length,pendentes:pend,emAndamento:andam,concluidas:conc,canceladas:MOCK_MANUTENCOES.length-pend-andam-conc,custoTotal:custoTotal,porTipo:{CORRETIVA:3,PREVENTIVA:4,PREDITIVA:3,EMERGENCIAL:2}};
    }

    if (url.indexOf('/api/ordens-servico/estatisticas') !== -1) {
        var ab = MOCK_ORDENS.filter(function(o){return o.status==='ABERTA';}).length;
        var ea = MOCK_ORDENS.filter(function(o){return o.status==='EM_ANALISE';}).length;
        var ee = MOCK_ORDENS.filter(function(o){return o.status==='EM_EXECUCAO';}).length;
        var co = MOCK_ORDENS.filter(function(o){return o.status==='CONCLUIDA';}).length;
        return {total:MOCK_ORDENS.length,abertas:ab,emAnalise:ea,emExecucao:ee,concluidas:co,canceladas:MOCK_ORDENS.length-ab-ea-ee-co,porPrioridade:{BAIXA:2,MEDIA:3,ALTA:3,CRITICA:2}};
    }

    if (url.indexOf('/api/computadores/paginado') !== -1) {
        var ps = new URLSearchParams(url.split('?')[1]||'');
        var termo = (ps.get('termo')||'').toLowerCase();
        var statusF = ps.get('status')||'';
        var page = parseInt(ps.get('page'))||0;
        var size = parseInt(ps.get('size'))||12;
        var filtered = MOCK_COMPUTADORES.filter(function(c){
            if (statusF && c.status !== statusF) return false;
            if (termo && (c.nomePc.toLowerCase().indexOf(termo)===-1 && c.modeloMarca.toLowerCase().indexOf(termo)===-1 && c.usuarioDesignado.toLowerCase().indexOf(termo)===-1 && c.numeroSerie.toLowerCase().indexOf(termo)===-1)) return false;
            return true;
        });
        var start = page * size;
        var slice = filtered.slice(start, start + size);
        return {content:slice,totalElements:filtered.length,totalPages:Math.ceil(filtered.length/size),number:size>0?page:0,size:size};
    }

    if (url.indexOf('/api/computadores/') !== -1 && method === 'GET') {
        var id = parseInt(url.split('/api/computadores/')[1]);
        return MOCK_COMPUTADORES.find(function(c){return c.id===id;}) || null;
    }
    if (url.indexOf('/api/computadores') !== -1 && method === 'POST') {
        var newId = Math.max.apply(null, MOCK_COMPUTADORES.map(function(c){return c.id;})) + 1;
        body.id = newId; body.dataCadastro = new Date().toISOString();
        MOCK_COMPUTADORES.push(body);
        return body;
    }
    if (url.indexOf('/api/computadores/') !== -1 && method === 'PUT') {
        var uid = parseInt(url.split('/api/computadores/')[1]);
        var idx = MOCK_COMPUTADORES.findIndex(function(c){return c.id===uid;});
        if (idx !== -1) { Object.assign(MOCK_COMPUTADORES[idx], body); return MOCK_COMPUTADORES[idx]; }
        return null;
    }
    if (url.indexOf('/api/computadores/') !== -1 && method === 'DELETE') {
        var did = parseInt(url.split('/api/computadores/')[1]);
        MOCK_COMPUTADORES = MOCK_COMPUTADORES.filter(function(c){return c.id!==did;});
        return {};
    }

    if (url.indexOf('/api/manutencoes') !== -1 && url.indexOf('estatisticas') === -1) {
        var ps2 = new URLSearchParams(url.split('?')[1]||'');
        var stF = ps2.get('status')||'';
        var pg = parseInt(ps2.get('page'))||0;
        var sz = parseInt(ps2.get('size'))||10;
        if (method === 'GET' && url.indexOf('/api/manutencoes/') === -1) {
            var mf = MOCK_MANUTENCOES.filter(function(m){return !stF || m.status===stF;});
            var ms = pg * sz;
            return {content:mf.slice(ms,ms+sz),totalElements:mf.length,totalPages:Math.ceil(mf.length/sz),number:pg,size:sz};
        }
        if (url.indexOf('/api/manutencoes/') !== -1 && method === 'GET') {
            var mid = parseInt(url.split('/api/manutencoes/')[1]);
            return MOCK_MANUTENCOES.find(function(m){return m.id===mid;}) || null;
        }
        if (method === 'POST') {
            var mnId = Math.max.apply(null, MOCK_MANUTENCOES.map(function(m){return m.id;})) + 1;
            var comp = MOCK_COMPUTADORES.find(function(c){return c.id===body.computadorId;});
            body.id = mnId; body.computadorNome = comp ? comp.nomePc : '-'; body.dataCadastro = new Date().toISOString(); body.dataConclusao = null;
            MOCK_MANUTENCOES.push(body); return body;
        }
        if (url.indexOf('/api/manutencoes/') !== -1 && method === 'PUT') {
            var muId = parseInt(url.split('/api/manutencoes/')[1]);
            var mi = MOCK_MANUTENCOES.findIndex(function(m){return m.id===muId;});
            if (mi !== -1) { Object.assign(MOCK_MANUTENCOES[mi], body); return MOCK_MANUTENCOES[mi]; }
            return null;
        }
        if (url.indexOf('/api/manutencoes/') !== -1 && method === 'DELETE') {
            var mdId = parseInt(url.split('/api/manutencoes/')[1]);
            MOCK_MANUTENCOES = MOCK_MANUTENCOES.filter(function(m){return m.id!==mdId;});
            return {};
        }
    }

    if (url.indexOf('/api/ordens-servico') !== -1) {
        var ps3 = new URLSearchParams(url.split('?')[1]||'');
        var stF3 = ps3.get('status')||'';
        var prF = ps3.get('prioridade')||'';
        var pg3 = parseInt(ps3.get('page'))||0;
        var sz3 = parseInt(ps3.get('size'))||10;
        if (method === 'GET' && url.indexOf('/api/ordens-servico/') === -1) {
            var of = MOCK_ORDENS.filter(function(o){return (!stF3 || o.status===stF3) && (!prF || o.prioridade===prF);});
            var os3 = pg3 * sz3;
            return {content:of.slice(os3,os3+sz3),totalElements:of.length,totalPages:Math.ceil(of.length/sz3),number:pg3,size:sz3};
        }
        if (url.indexOf('/api/ordens-servico/') !== -1 && method === 'GET') {
            var oid = parseInt(url.split('/api/ordens-servico/')[1]);
            return MOCK_ORDENS.find(function(o){return o.id===oid;}) || null;
        }
        if (method === 'POST') {
            var oiId = Math.max.apply(null, MOCK_ORDENS.map(function(o){return o.id;})) + 1;
            var comp2 = MOCK_COMPUTADORES.find(function(c){return c.id===body.computadorId;});
            body.id = oiId; body.computadorNome = comp2 ? comp2.nomePc : '-'; body.dataAbertura = new Date().toISOString(); body.dataConclusao = null; body.solucao = null;
            MOCK_ORDENS.push(body); return body;
        }
        if (url.indexOf('/api/ordens-servico/') !== -1 && method === 'PUT') {
            var ouId = parseInt(url.split('/api/ordens-servico/')[1]);
            var oi2 = MOCK_ORDENS.findIndex(function(o){return o.id===ouId;});
            if (oi2 !== -1) { Object.assign(MOCK_ORDENS[oi2], body); return MOCK_ORDENS[oi2]; }
            return null;
        }
        if (url.indexOf('/api/ordens-servico/') !== -1 && method === 'DELETE') {
            var odId = parseInt(url.split('/api/ordens-servico/')[1]);
            MOCK_ORDENS = MOCK_ORDENS.filter(function(o){return o.id!==odId;});
            return {};
        }
    }

    if (url.indexOf('/api/usuarios') !== -1) {
        if (method === 'GET' && url.indexOf('/api/usuarios/') === -1) return MOCK_USUARIOS;
        if (url.indexOf('/api/usuarios/') !== -1 && method === 'GET') {
            var uid2 = parseInt(url.split('/api/usuarios/')[1]);
            return MOCK_USUARIOS.find(function(u){return u.id===uid2;}) || null;
        }
        if (method === 'POST') {
            var uiId = Math.max.apply(null, MOCK_USUARIOS.map(function(u){return u.id;})) + 1;
            body.id = uiId; body.ativo = true; body.dataCadastro = new Date().toISOString();
            MOCK_USUARIOS.push(body); return body;
        }
        if (url.indexOf('/api/usuarios/') !== -1 && method === 'PUT') {
            var uuId = parseInt(url.split('/api/usuarios/')[1]);
            var ui2 = MOCK_USUARIOS.findIndex(function(u){return u.id===uuId;});
            if (ui2 !== -1) { Object.assign(MOCK_USUARIOS[ui2], body); return MOCK_USUARIOS[ui2]; }
            return null;
        }
        if (url.indexOf('/api/usuarios/') !== -1 && method === 'DELETE') {
            var udId = parseInt(url.split('/api/usuarios/')[1]);
            MOCK_USUARIOS = MOCK_USUARIOS.filter(function(u){return u.id!==udId;});
            return {};
        }
    }

    return null;
}

// ==========================================
// AUTH & API
// ==========================================
function getToken() { return localStorage.getItem('authToken'); }
function getPerfil() { return localStorage.getItem('userPerfil') || 'USUARIO'; }
function apiHeaders() { var t = getToken(); return { 'Content-Type': 'application/json', 'Authorization': t ? 'Bearer ' + t : '' }; }

async function apiFetch(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, apiHeaders(), opts.headers || {});
    if (!USE_MOCK) {
        try {
            var res = await fetch(API + url, opts);
            if (res.status === 401 || res.status === 403) { localStorage.clear(); window.location.href = 'login.html'; return; }
            var data = await res.json();
            if (!res.ok) throw new Error(data.erro || data.mensagem || 'Erro na requisicao');
            return data;
        } catch(e) {
            console.warn('API indisponivel, usando mock:', e.message);
            USE_MOCK = true;
        }
    }
    var mockResult = mockFetch(url, opts);
    if (mockResult === null) throw new Error('Recurso nao encontrado (mock)');
    if (url.indexOf('/api/auth/login') !== -1 && mockResult === null) throw new Error('Credenciais invalidas');
    return mockResult;
}

function handleLogout() { localStorage.clear(); window.location.href = 'login.html'; }
function checkAuth() {
    if (!getToken()) { window.location.href = 'login.html'; return; }
    var n = localStorage.getItem('userName') || 'Usuario', p = getPerfil();
    var el = function(id) { return document.getElementById(id); };
    if (el('sidebarUserName')) el('sidebarUserName').textContent = n;
    if (el('sidebarUserRole')) el('sidebarUserRole').textContent = p;
    if (el('header-user-name')) el('header-user-name').textContent = n;
}

// ==========================================
// NAVIGATION
// ==========================================
function showSection(id) {
    document.querySelectorAll('.section-content').forEach(function(s) { s.classList.add('hidden'); });
    var sec = document.getElementById(id);
    if (sec) sec.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); if (b.dataset.section === id) b.classList.add('active'); });
    var t = { 'painel':['Dashboard','Visao geral do sistema'], 'equipamentos':['Equipamentos','Gerenciamento de equipamentos'], 'manutencoes':['Manutencoes','Controle de manutencoes'], 'ordens-servico':['Ordens de Servico','Gerenciamento de OS'], 'relatorios':['Relatorios','Estatisticas e graficos'], 'usuarios':['Usuarios','Gerenciamento de usuarios'] };
    var d = t[id] || ['',''];
    var el = function(x) { return document.getElementById(x); };
    if (el('page-title')) el('page-title').textContent = d[0];
    if (el('page-subtitle')) el('page-subtitle').textContent = d[1];
    switch(id) { case 'painel': loadDashboard(); break; case 'equipamentos': loadEquipamentos(); break; case 'manutencoes': loadManutencoes(); break; case 'ordens-servico': loadOrdensServico(); break; case 'relatorios': loadRelatorios(); break; case 'usuarios': loadUsuarios(); break; }
    if (window.innerWidth < 1024) { var sb = document.getElementById('sidebar'); if (sb && sb.classList.contains('open')) toggleSidebar(); }
}

function toggleSidebar() { var s = document.getElementById('sidebar'), o = document.getElementById('sidebar-overlay'); s.classList.toggle('open'); o.style.display = s.classList.contains('open') ? 'block' : 'none'; }

// ==========================================
// DASHBOARD
// ==========================================
async function loadDashboard() {
    try {
        var r = await Promise.all([ apiFetch('/api/computadores/estatisticas').catch(function(){return null;}), apiFetch('/api/manutencoes/estatisticas').catch(function(){return null;}), apiFetch('/api/ordens-servico/estatisticas').catch(function(){return null;}) ]);
        renderDashboardKpis(r[0], r[1], r[2]); renderChartStatus(r[0]); renderChartManutencoes(r[1]); renderChartOrdens(r[2]);
    } catch(e) { console.error('Erro dashboard:', e); }
}

function renderDashboardKpis(eq, man, os) {
    eq=eq||{}; man=man||{}; os=os||{};
    var k = [
        {i:'fa-desktop',l:'Total Equipamentos',v:eq.total||0,c:'cyan',t:'TOTAL'},
        {i:'fa-bolt',l:'Ativos',v:eq.ativos||0,c:'green',t:'ATIVOS'},
        {i:'fa-tools',l:'Em Manutencao',v:(eq.manutencaoPreditiva||0)+(eq.manutencaoPreventiva||0)+(eq.manutencaoEmergencial||0),c:'yellow',t:'MANUT'},
        {i:'fa-check-circle',l:'Concluidos',v:eq.concluidos||0,c:'green',t:'CONCLUIDO'},
        {i:'fa-exclamation-triangle',l:'Manut. Vencida',v:eq.manutencaoVencida||0,c:'red',t:'VENCIDA'},
        {i:'fa-clipboard-list',l:'OS Abertas',v:(os.abertas||0)+(os.emAnalise||0),c:'orange',t:'OS'},
        {i:'fa-dollar-sign',l:'Custo Manutencoes',v:'R$ '+formatNumber(man.custoTotal||0),c:'purple',t:'CUSTO'}
    ];
    document.getElementById('dashboardKpis').innerHTML = k.map(function(x){return '<div class="kpi-card kpi-card-'+x.c+'"><div class="kpi-header"><div class="kpi-icon kpi-icon-'+x.c+'"><i class="fas '+x.i+'"></i></div><span class="kpi-tag kpi-tag-'+x.c+'">'+x.t+'</span></div><p class="kpi-value">'+x.v+'</p><p class="kpi-label">'+x.l+'</p></div>';}).join('');
}

function renderChartStatus(s) {
    var ctx=document.getElementById('chartStatus'); if(!ctx)return; if(ctx._chart)ctx._chart.destroy();
    var d=(s&&s.porStatus)||{}, lb=Object.keys(d).map(function(k){return k.replace('MANUTENCAO_','Man. ').replace('_',' ');}), vl=Object.values(d);
    ctx._chart=new Chart(ctx,{type:'doughnut',data:{labels:lb,datasets:[{data:vl,backgroundColor:['#34d399','#fbbf24','#f97316','#f87171','#a78bfa'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:'#a0a0b0',padding:14,usePointStyle:true,font:{size:11}}}}}});
}

function renderChartManutencoes(s) {
    var ctx=document.getElementById('chartManutencoes'); if(!ctx)return; if(ctx._chart)ctx._chart.destroy();
    var d=(s&&s.porTipo)||{};
    ctx._chart=new Chart(ctx,{type:'pie',data:{labels:Object.keys(d),datasets:[{data:Object.values(d),backgroundColor:['#fbbf24','#06b6d4','#a78bfa','#f87171'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#a0a0b0',padding:14,usePointStyle:true,font:{size:11}}}}}});
}

function renderChartOrdens(s) {
    var ctx=document.getElementById('chartOrdens'); if(!ctx)return; if(ctx._chart)ctx._chart.destroy();
    var d=(s&&s.porPrioridade)||{};
    ctx._chart=new Chart(ctx,{type:'bar',data:{labels:Object.keys(d),datasets:[{label:'Ordens',data:Object.values(d),backgroundColor:['#34d399','#fbbf24','#f97316','#f87171'],borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:'#606070'},grid:{color:'rgba(255,255,255,0.04)'}},x:{ticks:{color:'#606070'},grid:{display:false}}}}});
}

// ==========================================
// EQUIPAMENTOS
// ==========================================
async function loadEquipamentos(page) {
    if(page!==undefined)currentPage.equipamentos=page;
    var s=(document.getElementById('busca-input')||{}).value||'', st=(document.getElementById('filtro-status')||{}).value||'';
    try{var d=await apiFetch('/api/computadores/paginado?page='+currentPage.equipamentos+'&size=12&status='+st+'&termo='+encodeURIComponent(s)); renderEquipamentosCards(d);}
    catch(e){document.getElementById('pc-cards-grid').innerHTML='<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-inbox"></i><p>Nenhum equipamento encontrado</p></div>';}
}

function renderEquipamentosCards(data) {
    var grid=document.getElementById('pc-cards-grid');
    document.getElementById('nav-total').textContent=data.totalElements||0;
    if(!data.content||data.content.length===0){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-inbox"></i><p>Nenhum equipamento encontrado</p></div>';document.getElementById('cards-pagination').innerHTML='';return;}
    var sm={'ATIVO':{c:'badge-ativo',i:'fa-check-circle'},'MANUTENCAO_PREDITIVA':{c:'badge-preditiva',i:'fa-search'},'MANUTENCAO_PREVENTIVA':{c:'badge-preventiva',i:'fa-shield-alt'},'MANUTENCAO_EMERGENCIAL':{c:'badge-emergencial',i:'fa-exclamation-triangle'},'CONCLUIDO':{c:'badge-concluido',i:'fa-check-double'}};
    grid.innerHTML=data.content.map(function(eq){
        var s=sm[eq.status]||{c:'badge-inativo',i:'fa-circle'}, sl=eq.status.replace('MANUTENCAO_','Man. ').replace('_',' ');
        var admin=getPerfil()==='ADMIN'?'<button onclick="confirmDelete(\'computador\','+eq.id+',\''+escapeAttr(eq.nomePc)+'\')" class="action-btn action-btn-delete" title="Excluir"><i class="fas fa-trash"></i></button>':'';
        return '<div class="pc-card" onclick="showEquipamentoDetail('+eq.id+')"><div class="pc-card-foto"><i class="fas fa-desktop"></i><div class="pc-card-status-bar"><span class="badge '+s.c+'"><i class="fas '+s.i+'" style="font-size:9px;"></i> '+sl+'</span></div></div><div class="pc-card-body"><div class="pc-card-name">'+escapeHtml(eq.nomePc)+'</div><div class="pc-card-model">'+escapeHtml(eq.modeloMarca)+'</div><div class="pc-card-specs"><span class="pc-card-spec">'+escapeHtml(eq.processador)+'</span><span class="pc-card-spec">'+escapeHtml(eq.memoriaRam)+'</span><span class="pc-card-spec">'+escapeHtml(eq.armazenamento)+'</span></div><div class="pc-card-footer"><span class="pc-card-user"><i class="fas fa-user"></i> '+escapeHtml(eq.usuarioDesignado||'Sem usuario')+'</span><div class="pc-card-actions" onclick="event.stopPropagation()"><button onclick="showEquipamentoForm('+eq.id+')" class="action-btn action-btn-edit" title="Editar"><i class="fas fa-pen"></i></button>'+admin+'</div></div></div></div>';
    }).join('');
    renderPagination('cards-pagination',data.totalPages,data.number,loadEquipamentos);
}

async function showEquipamentoDetail(id) {
    try{
        var eq=await apiFetch('/api/computadores/'+id);
        var sm={'ATIVO':{c:'badge-ativo',i:'fa-check-circle'},'MANUTENCAO_PREDITIVA':{c:'badge-preditiva',i:'fa-search'},'MANUTENCAO_PREVENTIVA':{c:'badge-preventiva',i:'fa-shield-alt'},'MANUTENCAO_EMERGENCIAL':{c:'badge-emergencial',i:'fa-exclamation-triangle'},'CONCLUIDO':{c:'badge-concluido',i:'fa-check-double'}};
        var s=sm[eq.status]||{c:'badge-inativo',i:'fa-circle'}, sl=eq.status.replace('MANUTENCAO_','Man. ').replace('_',' ');
        openModal('Detalhes do Equipamento','<div class="detail-header"><div class="detail-foto"><i class="fas fa-desktop"></i></div><div class="detail-info"><h2>'+escapeHtml(eq.nomePc)+'</h2><p>'+escapeHtml(eq.modeloMarca)+' &mdash; '+escapeHtml(eq.numeroSerie)+'</p><span class="badge '+s.c+'"><i class="fas '+s.i+'" style="font-size:9px;"></i> '+sl+'</span></div></div><div class="detail-specs"><div class="detail-spec-item"><label>Processador</label><p>'+escapeHtml(eq.processador)+'</p></div><div class="detail-spec-item"><label>Memoria RAM</label><p>'+escapeHtml(eq.memoriaRam)+'</p></div><div class="detail-spec-item"><label>Armazenamento</label><p>'+escapeHtml(eq.armazenamento)+'</p></div><div class="detail-spec-item"><label>Usuario Designado</label><p>'+escapeHtml(eq.usuarioDesignado||'Nao atribuido')+'</p></div><div class="detail-spec-item"><label>Numero de Serie</label><p>'+escapeHtml(eq.numeroSerie)+'</p></div><div class="detail-spec-item"><label>Fornecedor</label><p>'+escapeHtml(eq.fornecedor||'-')+'</p></div></div>','<button onclick="closeModal()" class="btn btn-ghost btn-sm">Fechar</button><button onclick="closeModal();showEquipamentoForm('+eq.id+')" class="btn btn-primary btn-sm"><i class="fas fa-pen"></i> Editar</button>');
    }catch(e){showToast(e.message,'error');}
}

async function showEquipamentoForm(id) {
    var eq={nomePc:'',numeroSerie:'',modeloMarca:'',processador:'',memoriaRam:'',armazenamento:'',usuarioDesignado:'',fornecedor:'',status:'ATIVO'};
    if(id){try{eq=await apiFetch('/api/computadores/'+id);}catch(e){}}
    openModal(id?'Editar Equipamento':'Novo Equipamento','<form id="eqForm"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;"><div class="form-group"><label class="form-label">Nome PC *</label><input id="eqNome" value="'+escapeAttr(eq.nomePc)+'" required class="form-input"></div><div class="form-group"><label class="form-label">Numero Serie *</label><input id="eqSerie" value="'+escapeAttr(eq.numeroSerie)+'" required class="form-input"></div><div class="form-group"><label class="form-label">Modelo/Marca *</label><input id="eqModelo" value="'+escapeAttr(eq.modeloMarca)+'" required class="form-input"></div><div class="form-group"><label class="form-label">Processador *</label><input id="eqProc" value="'+escapeAttr(eq.processador)+'" required class="form-input"></div><div class="form-group"><label class="form-label">Memoria RAM *</label><input id="eqRam" value="'+escapeAttr(eq.memoriaRam)+'" required class="form-input"></div><div class="form-group"><label class="form-label">Armazenamento *</label><input id="eqArm" value="'+escapeAttr(eq.armazenamento)+'" required class="form-input"></div><div class="form-group"><label class="form-label">Usuario Designado</label><input id="eqUsuario" value="'+escapeAttr(eq.usuarioDesignado||'')+'" class="form-input"></div><div class="form-group"><label class="form-label">Fornecedor</label><input id="eqFornecedor" value="'+escapeAttr(eq.fornecedor||'')+'" class="form-input"></div></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Status</label><select id="eqStatus" class="form-input"><option value="ATIVO"'+(eq.status==='ATIVO'?' selected':'')+'>Ativo</option><option value="MANUTENCAO_PREDITIVA"'+(eq.status==='MANUTENCAO_PREDITIVA'?' selected':'')+'>Manutencao Preditiva</option><option value="MANUTENCAO_PREVENTIVA"'+(eq.status==='MANUTENCAO_PREVENTIVA'?' selected':'')+'>Manutencao Preventiva</option><option value="MANUTENCAO_EMERGENCIAL"'+(eq.status==='MANUTENCAO_EMERGENCIAL'?' selected':'')+'>Manutencao Emergencial</option><option value="CONCLUIDO"'+(eq.status==='CONCLUIDO'?' selected':'')+'>Concluido</option></select></div></form>','<button onclick="closeModal()" class="btn btn-ghost btn-sm">Cancelar</button><button onclick="document.getElementById(\'eqForm\').requestSubmit()" class="btn btn-primary btn-sm"><i class="fas fa-save"></i> '+(id?'Salvar':'Cadastrar')+'</button>');
    document.getElementById('eqForm').addEventListener('submit',async function(e){
        e.preventDefault();
        var p={nomePc:document.getElementById('eqNome').value,numeroSerie:document.getElementById('eqSerie').value,modeloMarca:document.getElementById('eqModelo').value,processador:document.getElementById('eqProc').value,memoriaRam:document.getElementById('eqRam').value,armazenamento:document.getElementById('eqArm').value,usuarioDesignado:document.getElementById('eqUsuario').value,fornecedor:document.getElementById('eqFornecedor').value,status:document.getElementById('eqStatus').value};
        try{if(id){await apiFetch('/api/computadores/'+id,{method:'PUT',body:JSON.stringify(p)});showToast('Equipamento atualizado!');}else{await apiFetch('/api/computadores',{method:'POST',body:JSON.stringify(p)});showToast('Equipamento cadastrado!');}closeModal();loadEquipamentos(0);}catch(e){showToast(e.message,'error');}
    });
}

// ==========================================
// MANUTENCOES
// ==========================================
async function loadManutencoes(page) {
    if(page!==undefined)currentPage.manutencoes=page;
    var st=(document.getElementById('man-filtro-status')||{}).value||'';
    try{var d=await apiFetch('/api/manutencoes?page='+currentPage.manutencoes+'&size=10&status='+st); renderManutencoes(d);}
    catch(e){document.querySelector('#manutencoesTable tbody').innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted)"><i class="fas fa-inbox"></i> Nenhuma manutencao encontrada</td></tr>';}
}
function renderManutencoes(data) {
    var tb=document.querySelector('#manutencoesTable tbody');
    if(!data.content||data.content.length===0){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted)"><i class="fas fa-inbox"></i> Nenhuma manutencao encontrada</td></tr>';document.getElementById('man-pagination').innerHTML='';return;}
    tb.innerHTML=data.content.map(function(m){
        return '<tr><td class="font-medium">'+m.id+'</td><td>'+escapeHtml(m.computadorNome)+'</td><td><span class="badge badge-'+m.tipo.toLowerCase()+'">'+m.tipo+'</span></td><td><span class="badge badge-'+m.status.toLowerCase().replace('_','-')+'">'+m.status.replace('_',' ')+'</span></td><td>'+escapeHtml(m.tecnicoResponsavel||'-')+'</td><td class="font-medium">'+(m.custo?'R$ '+formatNumber(m.custo):'-')+'</td><td><div style="display:flex;gap:4px;"><button onclick="showManutencaoForm('+m.id+')" class="action-btn action-btn-edit"><i class="fas fa-pen"></i></button><button onclick="confirmDelete(\'manutencao\','+m.id+',\'Manutencao #'+m.id+'\')" class="action-btn action-btn-delete"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
    renderPagination('man-pagination',data.totalPages,data.number,loadManutencoes);
}
async function showManutencaoForm(id) {
    var m={tipo:'CORRETIVA',status:'PENDENTE',descricao:''};
    if(id){try{m=await apiFetch('/api/manutencoes/'+id);}catch(e){}}
    if(allComputadores.length===0){try{allComputadores=await apiFetch('/api/computadores/paginado?page=0&size=100&status=&termo=');}catch(e){}}
    var compList = allComputadores.content || allComputadores;
    var opts=compList.map(function(c){return '<option value="'+c.id+'"'+(m.computadorId==c.id?' selected':'')+'>'+escapeHtml(c.nomePc)+' ('+escapeHtml(c.numeroSerie)+')</option>';}).join('');
    openModal(id?'Editar Manutencao':'Nova Manutencao','<form id="manForm"><div class="form-group"><label class="form-label">Equipamento</label><select id="manComputador" required class="form-input">'+opts+'</select></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;"><div class="form-group"><label class="form-label">Tipo</label><select id="manTipo" class="form-input"><option value="CORRETIVA"'+(m.tipo==='CORRETIVA'?' selected':'')+'>Corretiva</option><option value="PREVENTIVA"'+(m.tipo==='PREVENTIVA'?' selected':'')+'>Preventiva</option><option value="PREDITIVA"'+(m.tipo==='PREDITIVA'?' selected':'')+'>Preditiva</option><option value="EMERGENCIAL"'+(m.tipo==='EMERGENCIAL'?' selected':'')+'>Emergencial</option></select></div><div class="form-group"><label class="form-label">Status</label><select id="manStatus" class="form-input"><option value="PENDENTE"'+(m.status==='PENDENTE'?' selected':'')+'>Pendente</option><option value="EM_ANDAMENTO"'+(m.status==='EM_ANDAMENTO'?' selected':'')+'>Em Andamento</option><option value="CONCLUIDA"'+(m.status==='CONCLUIDA'?' selected':'')+'>Concluida</option><option value="CANCELADA"'+(m.status==='CANCELADA'?' selected':'')+'>Cancelada</option></select></div></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Descricao</label><textarea id="manDescricao" required class="form-input" style="min-height:80px;resize:vertical;">'+escapeHtml(m.descricao||'')+'</textarea></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;"><div class="form-group"><label class="form-label">Tecnico Responsavel</label><input id="manTecnico" value="'+escapeAttr(m.tecnicoResponsavel||'')+'" class="form-input"></div><div class="form-group"><label class="form-label">Custo (R$)</label><input type="number" step="0.01" id="manCusto" value="'+(m.custo||'')+'" class="form-input"></div></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Pecas Trocadas</label><input id="manPecas" value="'+escapeAttr(m.pecasTrocadas||'')+'" class="form-input"></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Observacoes</label><textarea id="manObs" class="form-input" style="min-height:60px;resize:vertical;">'+escapeHtml(m.observacoes||'')+'</textarea></div></form>','<button onclick="closeModal()" class="btn btn-ghost btn-sm">Cancelar</button><button onclick="document.getElementById(\'manForm\').requestSubmit()" class="btn btn-primary btn-sm"><i class="fas fa-save"></i> '+(id?'Salvar':'Cadastrar')+'</button>');
    document.getElementById('manForm').addEventListener('submit',async function(e){
        e.preventDefault();
        var p={computadorId:parseInt(document.getElementById('manComputador').value),tipo:document.getElementById('manTipo').value,status:document.getElementById('manStatus').value,descricao:document.getElementById('manDescricao').value,tecnicoResponsavel:document.getElementById('manTecnico').value,custo:document.getElementById('manCusto').value?parseFloat(document.getElementById('manCusto').value):null,pecasTrocadas:document.getElementById('manPecas').value,observacoes:document.getElementById('manObs').value};
        try{if(id){await apiFetch('/api/manutencoes/'+id,{method:'PUT',body:JSON.stringify(p)});showToast('Manutencao atualizada!');}else{await apiFetch('/api/manutencoes',{method:'POST',body:JSON.stringify(p)});showToast('Manutencao cadastrada!');}closeModal();loadManutencoes(currentPage.manutencoes);}catch(e){showToast(e.message,'error');}
    });
}

// ==========================================
// ORDENS DE SERVICO
// ==========================================
async function loadOrdensServico(page) {
    if(page!==undefined)currentPage.ordensServico=page;
    var st=(document.getElementById('os-filtro-status')||{}).value||'', pr=(document.getElementById('os-filtro-prioridade')||{}).value||'';
    try{var d=await apiFetch('/api/ordens-servico?page='+currentPage.ordensServico+'&size=10&status='+st+'&prioridade='+pr); renderOrdensServico(d);}
    catch(e){document.querySelector('#ordensTable tbody').innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--text-muted)"><i class="fas fa-inbox"></i> Nenhuma ordem encontrada</td></tr>';}
}
function renderOrdensServico(data) {
    var tb=document.querySelector('#ordensTable tbody');
    if(!data.content||data.content.length===0){tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--text-muted)"><i class="fas fa-inbox"></i> Nenhuma ordem encontrada</td></tr>';document.getElementById('os-pagination').innerHTML='';return;}
    tb.innerHTML=data.content.map(function(o){
        var dt=o.dataPrevisao?new Date(o.dataPrevisao).toLocaleDateString('pt-BR'):'-';
        return '<tr><td class="font-medium">'+o.id+'</td><td>'+escapeHtml(o.titulo)+'</td><td>'+escapeHtml(o.computadorNome||'-')+'</td><td><span class="badge badge-'+o.prioridade.toLowerCase()+'">'+o.prioridade+'</span></td><td><span class="badge badge-'+o.status.toLowerCase().replace('_','-')+'">'+o.status.replace('_',' ')+'</span></td><td>'+escapeHtml(o.solicitante||'-')+'</td><td>'+dt+'</td><td><div style="display:flex;gap:4px;"><button onclick="showOrdemForm('+o.id+')" class="action-btn action-btn-edit"><i class="fas fa-pen"></i></button><button onclick="confirmDelete(\'ordem\','+o.id+',\''+escapeAttr(o.titulo)+'\')" class="action-btn action-btn-delete"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
    renderPagination('os-pagination',data.totalPages,data.number,loadOrdensServico);
}
async function showOrdemForm(id) {
    var o={titulo:'',descricao:'',prioridade:'MEDIA',status:'ABERTA',solicitante:'',tecnicoResponsavel:''};
    if(id){try{o=await apiFetch('/api/ordens-servico/'+id);}catch(e){}}
    if(allComputadores.length===0){try{allComputadores=await apiFetch('/api/computadores/paginado?page=0&size=100&status=&termo=');}catch(e){}}
    var compList = allComputadores.content || allComputadores;
    var opts=compList.map(function(c){return '<option value="'+c.id+'"'+(o.computadorId==c.id?' selected':'')+'>'+escapeHtml(c.nomePc)+'</option>';}).join('');
    openModal(id?'Editar Ordem de Servico':'Nova Ordem de Servico','<form id="osForm"><div class="form-group"><label class="form-label">Titulo *</label><input id="osTitulo" value="'+escapeAttr(o.titulo)+'" required class="form-input"></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Descricao</label><textarea id="osDescricao" class="form-input" style="min-height:80px;resize:vertical;">'+escapeHtml(o.descricao||'')+'</textarea></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Equipamento</label><select id="osComputador" class="form-input"><option value="">Nenhum</option>'+opts+'</select></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;"><div class="form-group"><label class="form-label">Prioridade</label><select id="osPrioridade" class="form-input"><option value="BAIXA"'+(o.prioridade==='BAIXA'?' selected':'')+'>Baixa</option><option value="MEDIA"'+(o.prioridade==='MEDIA'?' selected':'')+'>Media</option><option value="ALTA"'+(o.prioridade==='ALTA'?' selected':'')+'>Alta</option><option value="CRITICA"'+(o.prioridade==='CRITICA'?' selected':'')+'>Critica</option></select></div><div class="form-group"><label class="form-label">Status</label><select id="osStatus" class="form-input"><option value="ABERTA"'+(o.status==='ABERTA'?' selected':'')+'>Aberta</option><option value="EM_ANALISE"'+(o.status==='EM_ANALISE'?' selected':'')+'>Em Analise</option><option value="EM_EXECUCAO"'+(o.status==='EM_EXECUCAO'?' selected':'')+'>Em Execucao</option><option value="CONCLUIDA"'+(o.status==='CONCLUIDA'?' selected':'')+'>Concluida</option><option value="CANCELADA"'+(o.status==='CANCELADA'?' selected':'')+'>Cancelada</option></select></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;"><div class="form-group"><label class="form-label">Solicitante</label><input id="osSolicitante" value="'+escapeAttr(o.solicitante||'')+'" class="form-input"></div><div class="form-group"><label class="form-label">Tecnico Responsavel</label><input id="osTecnico" value="'+escapeAttr(o.tecnicoResponsavel||'')+'" class="form-input"></div></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Data Previsao</label><input type="date" id="osDataPrevisao" value="'+(o.dataPrevisao?o.dataPrevisao.split('T')[0]:'')+'" class="form-input"></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Solucao</label><textarea id="osSolucao" class="form-input" style="min-height:60px;resize:vertical;">'+escapeHtml(o.solucao||'')+'</textarea></div></form>','<button onclick="closeModal()" class="btn btn-ghost btn-sm">Cancelar</button><button onclick="document.getElementById(\'osForm\').requestSubmit()" class="btn btn-primary btn-sm"><i class="fas fa-save"></i> '+(id?'Salvar':'Criar')+'</button>');
    document.getElementById('osForm').addEventListener('submit',async function(e){
        e.preventDefault();
        var p={titulo:document.getElementById('osTitulo').value,descricao:document.getElementById('osDescricao').value,computadorId:document.getElementById('osComputador').value?parseInt(document.getElementById('osComputador').value):null,prioridade:document.getElementById('osPrioridade').value,status:document.getElementById('osStatus').value,solicitante:document.getElementById('osSolicitante').value,tecnicoResponsavel:document.getElementById('osTecnico').value,dataPrevisao:document.getElementById('osDataPrevisao').value?document.getElementById('osDataPrevisao').value+'T17:00:00':null,solucao:document.getElementById('osSolucao').value};
        try{if(id){await apiFetch('/api/ordens-servico/'+id,{method:'PUT',body:JSON.stringify(p)});showToast('Ordem atualizada!');}else{await apiFetch('/api/ordens-servico',{method:'POST',body:JSON.stringify(p)});showToast('Ordem criada!');}closeModal();loadOrdensServico(currentPage.ordensServico);}catch(e){showToast(e.message,'error');}
    });
}

// ==========================================
// RELATORIOS
// ==========================================
async function loadRelatorios() {
    try{
        var eqData = await apiFetch('/api/computadores/paginado?page=0&size=100&status=&termo=');
        var eqList = eqData.content || eqData;
        var r2=await Promise.all([apiFetch('/api/computadores/estatisticas').catch(function(){return null;}),apiFetch('/api/manutencoes/estatisticas').catch(function(){return null;})]);
        renderChartMarcas(eqList);renderChartManutencoesMes(r2[1]);renderStatsGerais(r2[0],r2[1]);renderCustosManutencao(r2[1]);
    }catch(e){console.error('Erro relatorios:',e);}
}
function renderChartMarcas(eq) {
    var ctx=document.getElementById('chartMarcas');if(!ctx)return;if(ctx._chart)ctx._chart.destroy();
    var m={};(eq||[]).forEach(function(e){var k=e.modeloMarca.split(' ')[0]||'Outro';m[k]=(m[k]||0)+1;});
    var s=Object.entries(m).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
    ctx._chart=new Chart(ctx,{type:'bar',data:{labels:s.map(function(x){return x[0];}),datasets:[{label:'Qtd',data:s.map(function(x){return x[1];}),backgroundColor:['#06b6d4','#34d399','#fbbf24','#f87171','#a78bfa','#ec4899','#f97316','#3b82f6'],borderRadius:6}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{color:'#606070'},grid:{color:'rgba(255,255,255,0.04)'}},y:{ticks:{color:'#a0a0b0'},grid:{display:false}}}}});
}
function renderChartManutencoesMes(s) {
    var ctx=document.getElementById('chartManutencoesMes');if(!ctx)return;if(ctx._chart)ctx._chart.destroy();
    var mn=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],now=new Date(),lb=[],vl=[];
    for(var i=5;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth()-i,1);lb.push(mn[d.getMonth()]+'/'+String(d.getFullYear()).slice(2));vl.push(Math.floor(Math.random()*8)+1);}
    ctx._chart=new Chart(ctx,{type:'line',data:{labels:lb,datasets:[{label:'Manutencoes',data:vl,borderColor:'#06b6d4',backgroundColor:'rgba(6,182,212,0.08)',fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#06b6d4'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:'#606070'},grid:{color:'rgba(255,255,255,0.04)'}},x:{ticks:{color:'#606070'},grid:{display:false}}}}});
}
function renderStatsGerais(eq,man) {
    var div=document.getElementById('statsGerais');if(!div)return;eq=eq||{};man=man||{};
    var items=[['Total Equipamentos',eq.total||0],['Ativos',eq.ativos||0],['Em Manutencao',(eq.manutencaoPreditiva||0)+(eq.manutencaoPreventiva||0)+(eq.manutencaoEmergencial||0)],['Total Manutencoes',man.total||0],['Pendentes',man.pendentes||0],['Concluidas',man.concluidas||0]];
    div.innerHTML=items.map(function(x){return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><span style="color:var(--text-secondary);font-size:13px;">'+x[0]+'</span><span style="font-weight:700;font-size:15px;color:var(--text-primary);">'+x[1]+'</span></div>';}).join('');
}
function renderCustosManutencao(man) {
    var div=document.getElementById('custosManutencao');if(!div)return;man=man||{};
    div.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;"><span style="color:var(--text-secondary);font-size:13px;">Custo Total</span><span style="font-weight:700;font-size:15px;color:var(--green);">R$ '+formatNumber(man.custoTotal||0)+'</span></div>';
}

// ==========================================
// USUARIOS
// ==========================================
async function loadUsuarios() {
    try{var d=await apiFetch('/api/usuarios');renderUsuarios(d);}
    catch(e){document.querySelector('#usuariosTable tbody').innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted)"><i class="fas fa-inbox"></i> Erro ao carregar</td></tr>';}
}
function renderUsuarios(usuarios) {
    document.querySelector('#usuariosTable tbody').innerHTML=usuarios.map(function(u){
        return '<tr><td class="font-medium">'+u.id+'</td><td>'+escapeHtml(u.nomeCompleto)+'</td><td class="font-mono">'+escapeHtml(u.username)+'</td><td>'+escapeHtml(u.email||'-')+'</td><td><span class="badge badge-'+u.perfil.toLowerCase()+'">'+u.perfil+'</span></td><td><span class="badge badge-'+(u.ativo?'ativo':'cancelada')+'">'+(u.ativo?'Ativo':'Inativo')+'</span></td><td><div style="display:flex;gap:4px;"><button onclick="showUsuarioForm('+u.id+')" class="action-btn action-btn-edit"><i class="fas fa-pen"></i></button><button onclick="confirmDelete(\'usuario\','+u.id+',\''+escapeAttr(u.nomeCompleto)+'\')" class="action-btn action-btn-delete"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
}
async function showUsuarioForm(id) {
    var u={username:'',nomeCompleto:'',email:'',perfil:'USUARIO',senha:''};
    if(id){try{u=await apiFetch('/api/usuarios/'+id);}catch(e){}}
    openModal(id?'Editar Usuario':'Novo Usuario','<form id="userForm"><div class="form-group"><label class="form-label">Nome Completo *</label><input id="userNome" value="'+escapeAttr(u.nomeCompleto)+'" required class="form-input"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;"><div class="form-group"><label class="form-label">Username *</label><input id="userUsername" value="'+escapeAttr(u.username)+'" '+(id?'disabled':'')+' required class="form-input"></div><div class="form-group"><label class="form-label">Email</label><input type="email" id="userEmail" value="'+escapeAttr(u.email||'')+'" class="form-input"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;"><div class="form-group"><label class="form-label">Perfil</label><select id="userPerfil" class="form-input"><option value="USUARIO"'+(u.perfil==='USUARIO'?' selected':'')+'>Usuario</option><option value="TECNICO"'+(u.perfil==='TECNICO'?' selected':'')+'>Tecnico</option><option value="ADMIN"'+(u.perfil==='ADMIN'?' selected':'')+'>Admin</option></select></div><div class="form-group"><label class="form-label">'+(id?'Nova Senha (opcional)':'Senha *')+'</label><input type="password" id="userSenha" '+(id?'':'required')+' minlength="6" class="form-input"></div></div></form>','<button onclick="closeModal()" class="btn btn-ghost btn-sm">Cancelar</button><button onclick="document.getElementById(\'userForm\').requestSubmit()" class="btn btn-primary btn-sm"><i class="fas fa-save"></i> '+(id?'Salvar':'Cadastrar')+'</button>');
    document.getElementById('userForm').addEventListener('submit',async function(e){
        e.preventDefault();
        var p={nomeCompleto:document.getElementById('userNome').value,email:document.getElementById('userEmail').value,perfil:document.getElementById('userPerfil').value};
        var pw=document.getElementById('userSenha').value;if(pw)p.senha=pw;
        if(!id)p.username=document.getElementById('userUsername').value;
        try{if(id){await apiFetch('/api/usuarios/'+id,{method:'PUT',body:JSON.stringify(p)});showToast('Usuario atualizado!');}else{await apiFetch('/api/usuarios',{method:'POST',body:JSON.stringify(p)});showToast('Usuario cadastrado!');}closeModal();loadUsuarios();}catch(e){showToast(e.message,'error');}
    });
}

// ==========================================
// MODAL
// ==========================================
function openModal(title, bodyHTML, footerHTML) {
    document.getElementById('modal-title').innerHTML='<i class="fas fa-layer-group" style="color:var(--primary-light);"></i> '+title;
    document.getElementById('modal-body').innerHTML=bodyHTML;
    document.getElementById('modal-footer').innerHTML=footerHTML||'';
    document.getElementById('modal-overlay').classList.add('active');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

// CONFIRM
function confirmDelete(type, id, name) {
    document.getElementById('confirm-text').textContent='Tem certeza que deseja excluir "'+name+'"?';
    document.getElementById('confirm-overlay').classList.add('active');
    document.getElementById('confirm-yes-btn').onclick=async function(){
        try{
            if(type==='computador')await apiFetch('/api/computadores/'+id,{method:'DELETE'});
            else if(type==='manutencao')await apiFetch('/api/manutencoes/'+id,{method:'DELETE'});
            else if(type==='ordem')await apiFetch('/api/ordens-servico/'+id,{method:'DELETE'});
            else if(type==='usuario')await apiFetch('/api/usuarios/'+id,{method:'DELETE'});
            showToast('Excluido com sucesso!');closeConfirm();
            var a=document.querySelector('.nav-btn.active');if(a)showSection(a.dataset.section);
        }catch(e){showToast(e.message,'error');}
    };
}
function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('active'); }

// TOAST
function showToast(message, type) {
    type=type||'info';
    var c=document.getElementById('toast-container'),t=document.createElement('div');
    t.className='toast toast-'+type;
    var icons={success:'fa-check-circle',error:'fa-exclamation-circle',info:'fa-info-circle',warning:'fa-exclamation-triangle'};
    t.innerHTML='<i class="fas '+(icons[type]||icons.info)+'"></i><span>'+escapeHtml(message)+'</span>';
    c.appendChild(t);
    setTimeout(function(){t.classList.add('toast-out');setTimeout(function(){t.remove();},300);},type==='error'?5000:3500);
}

// PAGINATION
function renderPagination(containerId, totalPages, curPage, loadFn) {
    var c=document.getElementById(containerId);
    if(!c||totalPages<=1){if(c)c.innerHTML='';return;}
    var html='<button class="pagination-btn" data-page="'+(curPage-1)+'" '+(curPage===0?'disabled':'')+'><i class="fas fa-chevron-left"></i></button>';
    for(var i=0;i<totalPages;i++){html+='<button class="pagination-btn '+(i===curPage?'active':'')+'" data-page="'+i+'">'+(i+1)+'</button>';}
    html+='<button class="pagination-btn" data-page="'+(curPage+1)+'" '+(curPage>=totalPages-1?'disabled':'')+'><i class="fas fa-chevron-right"></i></button>';
    c.innerHTML=html;
    c.querySelectorAll('.pagination-btn').forEach(function(btn){
        btn.addEventListener('click',function(){var p=parseInt(btn.dataset.page);if(!isNaN(p)&&p>=0&&p<totalPages)loadFn(p);});
    });
}

// UTILITIES
function escapeHtml(t){if(!t)return'';var m={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};return String(t).replace(/[&<>"']/g,function(c){return m[c];});}
function escapeAttr(t){if(!t)return'';return String(t).replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function formatNumber(num){return Number(num).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function debounce(fn,delay){var t;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a);},delay);};}

// FILTERS
function initFilters(){
    var b=document.getElementById('busca-input'),f=document.getElementById('filtro-status');
    if(b)b.addEventListener('input',debounce(function(){loadEquipamentos(0);},400));
    if(f)f.addEventListener('change',function(){loadEquipamentos(0);});
    var mf=document.getElementById('man-filtro-status');if(mf)mf.addEventListener('change',function(){loadManutencoes(0);});
    var osf=document.getElementById('os-filtro-status'),opf=document.getElementById('os-filtro-prioridade');
    if(osf)osf.addEventListener('change',function(){loadOrdensServico(0);});
    if(opf)opf.addEventListener('change',function(){loadOrdensServico(0);});
}

// OVERLAY CLICK
document.getElementById('modal-overlay')?.addEventListener('click',function(e){if(e.target===e.currentTarget)closeModal();});
document.getElementById('confirm-overlay')?.addEventListener('click',function(e){if(e.target===e.currentTarget)closeConfirm();});

// INIT
document.addEventListener('DOMContentLoaded',function(){checkAuth();initFilters();showSection('painel');});

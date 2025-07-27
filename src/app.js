'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // Elementos principais da interface
  const abas = document.querySelectorAll('.aba');
  const filtrosPatentes = document.getElementById('filtros-patentes');
  const filtrosLaboratorios = document.getElementById('filtros-laboratorios');
  const listaResultados = document.getElementById('results');
  const searchBar = document.getElementById('search-bar');
  const naturezaCheckboxes = document.querySelectorAll('.natureza-checkbox');
  const botaoBusca = document.getElementById('botao-buscar');

  // Estado atual dos filtros e da aba ativa
  let abaAtual = 'patentes';
  let areasSelecionadas = new Set();
  let naturezaSelecionadas = new Set();
  let textoBusca = '';

  // Áreas dos laboratórios
  const areas = [
    'ciencias humanas',
    'ciencias biologicas',
    'ciencias agrarias',
    'ciencias exatas e da terra',
    'ciencias da saude',
    'ciencias sociais aplicadas'
  ];

  // Tipos de patentes (novos arquivos JSON)
  const tiposPatentes = [
    'patentes-invencao',
    'patentes-utilidade',
    'desenhos-industriais',
    'programas-computadores'
  ];

  // Objetos para armazenar os dados carregados
  let dadosPatentes = {};
  let dadosLaboratorios = {};

  // Verifica se há uma query string na URL (busca inicial)
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  if (query) {
    searchBar.value = query;
    textoBusca = query.toLowerCase();
  }

  // Função para carregar dados JSON de patentes e laboratórios
  async function carregarDados() {
    try {
      // Carrega arquivos de patentes
      const fetchPatentesPromises = tiposPatentes.map(tipo =>
        fetch(`patentes/${tipo}.json`).then(res => {
          if (!res.ok) throw new Error(`Erro ao carregar ${tipo}`);
          return res.json();
        })
      );

      // Carrega arquivos de laboratórios por área
      const fetchLaboratoriosPromises = areas.map(area =>
        fetch(`laboratorios/laboratorios-${area.replace(/ /g, '-')}.json`).then(res => {
          if (!res.ok) throw new Error(`Erro ao carregar laboratórios de ${area}`);
          return res.json();
        })
      );

      // Aguarda todas as requisições
      const resultadosPatentes = await Promise.all(fetchPatentesPromises);
      const resultadosLaboratorios = await Promise.all(fetchLaboratoriosPromises);

      // Junta todos os tipos de patentes em um único array
      dadosPatentes['todas'] = [];
      resultadosPatentes.forEach(lista => {
        dadosPatentes['todas'] = dadosPatentes['todas'].concat(lista);
      });

      // Associa os dados de laboratórios às suas respectivas áreas
      areas.forEach((area, i) => {
        dadosLaboratorios[area] = resultadosLaboratorios[i];
      });

      configurarBotoesAreas();
      mostrarResultados();

    } catch (erro) {
      console.error(erro);
      listaResultados.innerHTML = '<li style="color:red;">Erro ao carregar os dados.</li>';
    }
  }

  // Evento para alternar entre abas de patentes e laboratórios
  abas.forEach(botao => {
    botao.addEventListener('click', () => {
      const tipo = botao.dataset.tipo;
      if (tipo === abaAtual) return;

      abas.forEach(b => b.classList.remove('ativa'));
      botao.classList.add('ativa');

      // Exibe filtros correspondentes à aba ativa
      if (tipo === 'patentes') {
        filtrosPatentes.classList.add('ativo');
        filtrosLaboratorios.classList.remove('ativo');
      } else {
        filtrosLaboratorios.classList.add('ativo');
        filtrosPatentes.classList.remove('ativo');
      }

      abaAtual = tipo;
      areasSelecionadas.clear();
      resetarFiltrosDeArea();
      resetarFiltrosNatureza();
      configurarBotoesAreas();
      mostrarResultados();
    });
  });

  // Configura botões das áreas (somente usados por laboratórios)
  function configurarBotoesAreas() {
    const container = abaAtual === 'patentes' ? filtrosPatentes : filtrosLaboratorios;
    const botoes = container.querySelectorAll('.grupo-areas button');

    botoes.forEach(botao => {
      botao.classList.remove('ativa');
      botao.onclick = () => {
        const area = botao.dataset.area;
        if (areasSelecionadas.has(area)) {
          areasSelecionadas.delete(area);
          botao.classList.remove('ativa');
        } else {
          areasSelecionadas.add(area);
          botao.classList.add('ativa');
        }
        mostrarResultados();
      };
    });
  }

  // Limpa filtros visuais de área
  function resetarFiltrosDeArea() {
    const container = abaAtual === 'patentes' ? filtrosPatentes : filtrosLaboratorios;
    container.querySelectorAll('.grupo-areas button.ativa').forEach(btn => btn.classList.remove('ativa'));
    areasSelecionadas.clear();
  }

  // Limpa checkboxes de natureza
  function resetarFiltrosNatureza() {
    naturezaCheckboxes.forEach(cb => cb.checked = false);
    naturezaSelecionadas.clear();
  }

  // Atualiza naturezaSelecionadas ao marcar/desmarcar checkboxes
  naturezaCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      naturezaSelecionadas.clear();
      naturezaCheckboxes.forEach(natCb => {
        if (natCb.checked) naturezaSelecionadas.add(natCb.value.toLowerCase());
      });
      mostrarResultados();
    });
  });

  // Atualiza texto de busca enquanto o usuário digita
  searchBar.addEventListener('input', (e) => {
    textoBusca = e.target.value.trim().toLowerCase();
    mostrarResultados();
  });

  // Filtro por natureza
  function filtrarPorNatureza(item) {
    if (naturezaSelecionadas.size === 0) return true;
    const naturezaItem = item.natureza ? item.natureza.toLowerCase() : '';
    return naturezaSelecionadas.has(naturezaItem);
  }

  // Filtro por nome ou natureza (texto de busca)
  function filtrarPorTexto(item) {
    if (!textoBusca) return true;
    const nome = item.nome ? item.nome.toLowerCase() : '';
    const natureza = item.natureza ? item.natureza.toLowerCase() : '';
    return nome.includes(textoBusca) || natureza.includes(textoBusca);
  }

  // Mostra os resultados filtrados na tela
  function mostrarResultados() {
    listaResultados.innerHTML = '';

    const dadosObj = abaAtual === 'patentes' ? dadosPatentes : dadosLaboratorios;
    const mostrarTodos = areasSelecionadas.size === 0;

    const resultadosFiltrados = [];

    if (abaAtual === 'patentes') {
      const listaPatentes = dadosObj['todas'] || [];
      listaPatentes.forEach(item => {
        if (filtrarPorNatureza(item) && filtrarPorTexto(item)) {
          resultadosFiltrados.push(item);
        }
      });
    } else {
      if (mostrarTodos) {
        areas.forEach(area => {
          const listaArea = dadosObj[area] || [];
          listaArea.forEach(item => {
            if (filtrarPorNatureza(item) && filtrarPorTexto(item)) {
              resultadosFiltrados.push(item);
            }
          });
        });
      } else {
        areasSelecionadas.forEach(areaSelecionada => {
          const listaArea = dadosObj[areaSelecionada] || [];
          listaArea.forEach(item => {
            if (filtrarPorNatureza(item) && filtrarPorTexto(item)) {
              resultadosFiltrados.push(item);
            }
          });
        });
      }
    }

    // Caso não haja resultados
    if (resultadosFiltrados.length === 0) {
      listaResultados.innerHTML = '<li style="color:#666;">Nenhum resultado encontrado.</li>';
      return;
    }

    // Cria elementos visuais para os resultados encontrados
    resultadosFiltrados.forEach(item => {
      const li = criarItemResultado(item);
      listaResultados.appendChild(li);
    });
  }

  // Cria um item da lista de resultados (clique direciona para detalhe.html?id=)
  function criarItemResultado(item) {
    const li = document.createElement('li');
    li.textContent = item.nome;
    li.classList.add('item');
    li.style.cursor = 'pointer';

    li.addEventListener('click', () => {
      window.location.href = `detalhe.html?id=${encodeURIComponent(item.id)}`;
    });

    return li;
  }

  // Realiza busca ao clicar no botão ou pressionar Enter
  function realizarBusca() {
    const termo = searchBar.value.trim();
    if (termo.length > 0) {
      window.location.href = `menubusca.html?q=${encodeURIComponent(termo)}`;
    }
  }

  botaoBusca.addEventListener('click', realizarBusca);

  searchBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      realizarBusca();
    }
  });

  // Inicia o carregamento dos dados ao carregar a página
  carregarDados();

});

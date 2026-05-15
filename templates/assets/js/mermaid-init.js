// Inicialização do Mermaid
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

// Configurar Mermaid
mermaid.initialize({ 
  startOnLoad: true,
  theme: 'default',
  themeVariables: {
    primaryColor: '#007bff',
    primaryTextColor: '#333',
    primaryBorderColor: '#007bff',
    lineColor: '#666',
    secondaryColor: '#f8f9fa',
    tertiaryColor: '#e9ecef'
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    bottomMarginAdj: 1,
    useMaxWidth: true,
    rightAngles: false,
    showSequenceNumbers: false
  },
  gantt: {
    titleTopMargin: 25,
    barHeight: 20,
    barGap: 4,
    topPadding: 50,
    leftPadding: 75,
    gridLineStartPadding: 35,
    fontSize: 11,
    sectionFontSize: 11,
    numberSectionStyles: 4,
    axisFormat: '%Y-%m-%d'
  }
});

// Disponibilizar globalmente
window.mermaid = mermaid;

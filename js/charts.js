/* ============================================
   MERCADONA STATS - CHARTS MODULE
   Chart.js configurations and management
   ============================================ */

// Global charts registry
const charts = {};

// Destroy chart if exists
function destroyChart(name) {
  if (charts[name]) {
    charts[name].destroy();
    charts[name] = null;
  }
}

// Default chart options
const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20
      }
    }
  }
};

// Create bar chart
function createBarChart(canvasId, labels, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  destroyChart(canvasId);
  
  charts[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: options.label || 'Valor',
        data,
        backgroundColor: options.color || 'rgba(102, 126, 234, 0.8)',
        borderColor: options.borderColor || 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      ...defaultChartOptions,
      plugins: {
        ...defaultChartOptions.plugins,
        legend: { display: options.showLegend || false },
        tooltip: {
          callbacks: {
            label: ctx => options.formatValue ? options.formatValue(ctx.raw) : ctx.raw
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => options.formatAxis ? options.formatAxis(v) : v
          }
        }
      }
    }
  });
  
  return charts[canvasId];
}

// Create doughnut chart
function createDoughnutChart(canvasId, labels, data, colors, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  destroyChart(canvasId);
  
  charts[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors
      }]
    },
    options: {
      ...defaultChartOptions,
      plugins: {
        ...defaultChartOptions.plugins,
        tooltip: {
          callbacks: {
            label: ctx => options.formatValue ? options.formatValue(ctx) : `${ctx.label}: ${ctx.raw}`
          }
        }
      }
    }
  });
  
  return charts[canvasId];
}

// Create line chart
function createLineChart(canvasId, labels, datasets, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  destroyChart(canvasId);
  
  charts[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...defaultChartOptions,
      plugins: {
        ...defaultChartOptions.plugins,
        tooltip: {
          callbacks: {
            label: ctx => options.formatValue ? options.formatValue(ctx) : `${ctx.dataset.label}: ${ctx.raw}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => options.formatAxis ? options.formatAxis(v) : v
          }
        }
      }
    }
  });
  
  return charts[canvasId];
}

// Create stacked bar chart
function createStackedBarChart(canvasId, labels, datasets, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  destroyChart(canvasId);
  
  charts[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      ...defaultChartOptions,
      plugins: {
        ...defaultChartOptions.plugins,
        tooltip: {
          callbacks: {
            label: ctx => options.formatValue ? options.formatValue(ctx) : `${ctx.dataset.label}: ${ctx.raw}`
          }
        }
      },
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback: v => options.formatAxis ? options.formatAxis(v) : v
          }
        }
      }
    }
  });
  
  return charts[canvasId];
}

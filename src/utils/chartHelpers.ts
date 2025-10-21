// Chart.js helper utilities and configurations

export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: 'white',
      },
    },
  },
  scales: {
    y: {
      ticks: {
        color: 'white',
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
    x: {
      ticks: {
        color: 'white',
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
}

export const createScatterChartOptions = (title: string, xLabel: string, yLabel: string) => ({
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    title: {
      display: true,
      text: title,
      color: 'white',
      font: {
        size: 16,
      },
    },
  },
  scales: {
    ...defaultChartOptions.scales,
    y: {
      ...defaultChartOptions.scales.y,
      title: {
        display: true,
        text: yLabel,
        color: 'white',
      },
    },
    x: {
      ...defaultChartOptions.scales.x,
      title: {
        display: true,
        text: xLabel,
        color: 'white',
      },
    },
  },
})

export const safeParseFloat = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}
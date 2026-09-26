export interface HardwareComponent {
  id: string
  name: string
  icon: string
  purpose: string
  interface: string
  dataCollected: string
  role: string
  x: number
  y: number
}

export const HARDWARE_COMPONENTS: HardwareComponent[] = [
  {
    id: 'pm-sensor',
    name: 'PM Sensor',
    icon: 'Wind',
    purpose: 'Measures fine and coarse particulate matter suspended in the air.',
    interface: 'UART, laser-scattering module',
    dataCollected: 'PM2.5, PM10 mass concentration',
    role: 'Primary input for source classification and the AQI gauge.',
    x: 18,
    y: 20,
  },
  {
    id: 'gas-sensor',
    name: 'Gas Sensor',
    icon: 'FlaskConical',
    purpose: 'Detects combustion and traffic-related gases.',
    interface: 'Analog / I2C, electrochemical cell',
    dataCollected: 'CO, NO₂ concentration',
    role: 'Distinguishes traffic and burning signatures from dust events.',
    x: 82,
    y: 18,
  },
  {
    id: 'co2-sensor',
    name: 'CO₂ Sensor',
    icon: 'Cloud',
    purpose: 'Tracks indoor ventilation and occupancy-driven CO₂ buildup.',
    interface: 'I2C, NDIR module',
    dataCollected: 'CO₂ concentration (ppm)',
    role: 'Feeds the ventilation advisory logic.',
    x: 85,
    y: 55,
  },
  {
    id: 'voc-sensor',
    name: 'VOC Sensor',
    icon: 'Sparkles',
    purpose: 'Senses volatile organic compounds from cooking and materials.',
    interface: 'I2C, metal-oxide sensor',
    dataCollected: 'Total VOC index',
    role: 'Key signal for cooking-smoke and burning classification.',
    x: 78,
    y: 82,
  },
  {
    id: 'temp-humidity',
    name: 'Temp / Humidity',
    icon: 'Thermometer',
    purpose: 'Captures ambient environmental context for sensor calibration.',
    interface: 'I2C, digital combo sensor',
    dataCollected: 'Temperature (°C), relative humidity (%)',
    role: 'Normalizes readings and improves forecast accuracy.',
    x: 50,
    y: 92,
  },
  {
    id: 'display',
    name: 'Display',
    icon: 'MonitorSmartphone',
    purpose: 'Shows live status directly on the node without a companion app.',
    interface: 'SPI, small OLED/TFT panel',
    dataCollected: '—',
    role: 'On-device feedback for AQI band and system status.',
    x: 20,
    y: 82,
  },
  {
    id: 'comms',
    name: 'Communication',
    icon: 'Radio',
    purpose: 'Optionally syncs summarized insights, never raw sensor streams.',
    interface: 'Wi-Fi / BLE, optional',
    dataCollected: 'Summarized inference results only',
    role: 'Lets nodes share findings without depending on connectivity.',
    x: 12,
    y: 50,
  },
  {
    id: 'power',
    name: 'Power',
    icon: 'BatteryCharging',
    purpose: 'Keeps the node running continuously, including on battery backup.',
    interface: '5V USB-C / battery pack',
    dataCollected: '—',
    role: 'Ensures sensing and inference continue during outages.',
    x: 50,
    y: 8,
  },
]
